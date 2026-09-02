import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { sha256Hex } from '../../lib/crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { bilingual } from '../errors';

export interface AccessTokenData {
  userId: string;
  clientId: string;
  scope: string;
}

/** Looks up the AccessTokenData for a raw `Authorization: Bearer ...` header, or null if absent/invalid/expired */
export async function resolveBearerAccessToken(
  prisma: PrismaService,
  authHeader: string | undefined,
): Promise<AccessTokenData | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7).trim();
  const tokenHash = sha256Hex(token);

  const record = await prisma.accessToken.findUnique({ where: { tokenHash } });
  if (!record || record.expiresAt < new Date()) return null;

  return {
    userId: record.userId,
    clientId: record.clientId,
    scope: record.scope,
  };
}

@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(bilingual('missing_bearer_token'));
    }

    const tokenData = await resolveBearerAccessToken(this.prisma, authHeader);
    if (!tokenData) {
      throw new UnauthorizedException(bilingual('token_not_found_or_expired'));
    }

    (request as Request & { tokenData: AccessTokenData }).tokenData = tokenData;
    return true;
  }
}
