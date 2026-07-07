import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { bilingual } from '../common/errors';
import type { AppConfig } from '../config/config';
import { generateToken, sha256Hex, verifyPkceS256 } from '../lib/crypto';
import { signIdToken } from '../lib/jwt';
import { verifyPassword } from '../lib/password';
import { getFullName } from '../lib/user-claims';
import { PrismaService } from '../prisma/prisma.service';
import type { TokenRequestDto } from './dto/token.dto';

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  id_token?: string;
  refresh_token: string;
  scope: string;
}

// Token-specific error codes not in common/errors.ts — these are internal OAuth2 protocol errors
function invalidRequest(description: string): never {
  throw new BadRequestException({
    error: 'invalid_request',
    error_description: description,
    error_i18n: { vi: description, en: description },
  });
}

function invalidGrant(description: string): never {
  throw new BadRequestException({
    error: 'invalid_grant',
    error_description: description,
    error_i18n: { vi: description, en: description },
  });
}

function invalidClient(description: string): never {
  throw new UnauthorizedException({
    error: 'invalid_client',
    error_description: description,
    error_i18n: { vi: description, en: description },
  });
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async exchange(dto: TokenRequestDto): Promise<TokenResponse> {
    try {
      if (dto.grant_type === 'authorization_code') {
        return await this.exchangeAuthorizationCode(dto);
      }
      return await this.exchangeRefreshToken(dto);
    } catch (err) {
      if (err instanceof HttpException) {
        this.logger.warn(
          `Token exchange rejected (client_id=${dto.client_id ?? 'missing'}): ${JSON.stringify(err.getResponse())}`,
        );
      }
      throw err;
    }
  }

  private async exchangeAuthorizationCode(
    dto: TokenRequestDto,
  ): Promise<TokenResponse> {
    const { code, redirect_uri, client_id, client_secret, code_verifier } = dto;
    if (!code) throw new BadRequestException(bilingual('code_required'));
    if (!redirect_uri)
      throw new BadRequestException(bilingual('redirect_uri_required'));
    if (!client_id)
      throw new BadRequestException(bilingual('client_id_required'));
    if (!client_secret)
      throw new BadRequestException(bilingual('client_secret_required'));
    if (!code_verifier)
      throw new BadRequestException(bilingual('code_verifier_required'));

    const authCode = await this.prisma.authCode.findUnique({ where: { code } });
    if (!authCode)
      throw new BadRequestException(bilingual('auth_code_not_found'));
    if (authCode.used)
      throw new BadRequestException(bilingual('auth_code_already_used'));
    if (authCode.expiresAt < new Date())
      throw new BadRequestException(bilingual('auth_code_expired'));
    if (authCode.redirectUri !== redirect_uri)
      throw new BadRequestException(bilingual('redirect_uri_mismatch'));
    if (authCode.clientId !== client_id)
      throw new BadRequestException(bilingual('client_id_mismatch'));

    const claimed = await this.prisma.authCode.updateMany({
      where: { id: authCode.id, used: false },
      data: { used: true },
    });
    if (claimed.count === 0)
      throw new BadRequestException(bilingual('auth_code_already_used'));

    const client = await this.prisma.client.findUnique({
      where: { clientId: client_id },
    });
    if (!client)
      throw new UnauthorizedException(bilingual('unknown_client_id'));

    const secretValid = await verifyPassword(
      client.clientSecretHash,
      client_secret,
    );
    if (!secretValid)
      throw new UnauthorizedException(bilingual('invalid_client_secret'));

    if (!verifyPkceS256(code_verifier, authCode.codeChallenge)) {
      throw new BadRequestException(bilingual('pkce_verification_failed'));
    }

    const user = await this.prisma.user.findUnique({
      where: { id: authCode.userId },
    });
    if (!user) throw new BadRequestException(bilingual('user_not_found'));

    const idToken = await signIdToken(
      {
        sub: user.id,
        aud: client_id,
        nonce: authCode.nonce ?? undefined,
        email: user.email ?? undefined,
        name: getFullName(user),
        role: user.webRole,
      },
      this.configService.get('issuer', { infer: true }),
      this.configService.get('jwtPrivateKey', { infer: true }),
    );

    const { accessToken, refreshToken } = await this.issueTokenPair(
      user.id,
      client_id,
      authCode.scope,
    );

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_MS / 1000,
      id_token: idToken,
      refresh_token: refreshToken,
      scope: authCode.scope,
    };
  }

  private async exchangeRefreshToken(
    dto: TokenRequestDto,
  ): Promise<TokenResponse> {
    const { refresh_token, client_id, client_secret } = dto;
    if (!refresh_token) invalidRequest('refresh_token is required');
    if (!client_id) invalidRequest('client_id is required');
    if (!client_secret) invalidRequest('client_secret is required');

    const client = await this.prisma.client.findUnique({
      where: { clientId: client_id },
    });
    if (!client) invalidClient('Unknown client_id');

    const secretValid = await verifyPassword(
      client.clientSecretHash,
      client_secret,
    );
    if (!secretValid) invalidClient('Invalid client_secret');

    const tokenHash = sha256Hex(refresh_token);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored) invalidGrant('Refresh token not found');
    if (stored.revoked) invalidGrant('Refresh token revoked');
    if (stored.expiresAt < new Date()) invalidGrant('Refresh token expired');
    if (stored.clientId !== client_id) invalidGrant('client_id mismatch');

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });
    if (!user || user.isDisabled) invalidGrant('User not found or disabled');

    // Rotate: revoke old refresh token before issuing a new pair
    await this.prisma.refreshToken.update({
      where: { tokenHash },
      data: { revoked: true },
    });

    const { accessToken, refreshToken } = await this.issueTokenPair(
      user.id,
      client_id,
      stored.scope,
    );

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_MS / 1000,
      refresh_token: refreshToken,
      scope: stored.scope,
    };
  }

  private async issueTokenPair(
    userId: string,
    clientId: string,
    scope: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = generateToken();
    const refreshToken = generateToken();

    await this.prisma.$transaction([
      this.prisma.accessToken.create({
        data: {
          tokenHash: sha256Hex(accessToken),
          userId,
          clientId,
          scope,
          expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
        },
      }),
      this.prisma.refreshToken.create({
        data: {
          tokenHash: sha256Hex(refreshToken),
          userId,
          clientId,
          scope,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
