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

@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(bilingual('missing_bearer_token'));
    }

    const token = authHeader.slice(7).trim();
    const tokenHash = sha256Hex(token);

    const record = await this.prisma.accessToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException(bilingual('token_not_found_or_expired'));
    }

    const tokenData: AccessTokenData = {
      userId: record.userId,
      clientId: record.clientId,
      scope: record.scope,
    };

    (request as Request & { tokenData: AccessTokenData }).tokenData = tokenData;
    return true;
  }
}
