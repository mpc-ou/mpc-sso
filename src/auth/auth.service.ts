import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { PendingAuthorization, User } from '@prisma/client';
import { bilingual } from '../common/errors';
import { generateToken } from '../lib/crypto';
import { dummyVerify, verifyPassword } from '../lib/password';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthorizeQueryDto } from './dto/authorize.dto';
import type { LoginDto } from './dto/login.dto';
import type { GoogleProfile } from './strategies/google.strategy';

const PENDING_AUTH_TTL_MS = 10 * 60 * 1000; // 10 minutes
const AUTH_CODE_TTL_MS = 60 * 1000; // 60 seconds

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async authorize(query: AuthorizeQueryDto): Promise<{ requestId: string }> {
    if (!query.scope.split(' ').includes('openid')) {
      throw new BadRequestException(bilingual('invalid_scope'));
    }

    const client = await this.prisma.client.findUnique({
      where: { clientId: query.client_id },
    });

    if (!client || !client.isActive) {
      throw new BadRequestException(bilingual('invalid_client'));
    }

    const allowedUris = JSON.parse(client.redirectUris) as string[];
    if (!allowedUris.includes(query.redirect_uri)) {
      throw new BadRequestException(bilingual('redirect_uri_not_allowed'));
    }

    const pending = await this.prisma.pendingAuthorization.create({
      data: {
        clientId: query.client_id,
        redirectUri: query.redirect_uri,
        scope: query.scope,
        state: query.state,
        codeChallenge: query.code_challenge,
        codeChallengeMethod: query.code_challenge_method,
        nonce: query.nonce,
        expiresAt: new Date(Date.now() + PENDING_AUTH_TTL_MS),
      },
    });

    return { requestId: pending.id };
  }

  async getPendingAuthorization(
    requestId: string,
  ): Promise<PendingAuthorization | null> {
    if (!requestId) return null;
    const pending = await this.prisma.pendingAuthorization.findUnique({
      where: { id: requestId },
    });
    if (!pending || pending.expiresAt < new Date()) {
      return null;
    }
    return pending;
  }

  async getClientName(clientId: string): Promise<string | undefined> {
    const client = await this.prisma.client.findUnique({
      where: { clientId },
      select: { name: true },
    });
    return client?.name;
  }

  async login(dto: LoginDto): Promise<string> {
    const pending = await this.getPendingAuthorization(dto.request_id);
    if (!pending) {
      throw new BadRequestException(bilingual('session_expired'));
    }

    const login = dto.login.trim();
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: login }, { email: login.toLowerCase() }] },
    });

    if (!user || !user.password) {
      await dummyVerify();
      throw new UnauthorizedException(bilingual('invalid_credentials'));
    }

    const valid = await verifyPassword(user.password, dto.password);
    if (!valid || user.isDisabled) {
      throw new UnauthorizedException(bilingual('invalid_credentials'));
    }

    return this.completeAuthorization(pending, user);
  }

  async completeGoogleLogin(
    requestId: string,
    profile: GoogleProfile,
  ): Promise<string> {
    const pending = await this.getPendingAuthorization(requestId);
    if (!pending) {
      throw new BadRequestException(bilingual('session_expired'));
    }

    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });
      if (!user) {
        throw new UnauthorizedException(bilingual('no_google_account'));
      }
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId },
      });
    }

    if (user.isDisabled) {
      throw new UnauthorizedException(bilingual('account_disabled'));
    }

    return this.completeAuthorization(pending, user);
  }

  private async completeAuthorization(
    pending: PendingAuthorization,
    user: User,
  ): Promise<string> {
    const code = generateToken();

    await this.prisma.$transaction([
      this.prisma.authCode.create({
        data: {
          code,
          clientId: pending.clientId,
          userId: user.id,
          redirectUri: pending.redirectUri,
          scope: pending.scope,
          codeChallenge: pending.codeChallenge,
          codeChallengeMethod: pending.codeChallengeMethod,
          nonce: pending.nonce,
          expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
        },
      }),
      this.prisma.pendingAuthorization.delete({ where: { id: pending.id } }),
    ]);

    const redirectUrl = new URL(pending.redirectUri);
    redirectUrl.searchParams.set('code', code);
    redirectUrl.searchParams.set('state', pending.state);
    return redirectUrl.toString();
  }
}
