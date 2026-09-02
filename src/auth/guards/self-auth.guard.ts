import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  type AccessTokenData,
  resolveBearerAccessToken,
} from '../../common/guards/bearer-auth.guard';
import { bilingual } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';

export const SSO_SESSION_COOKIE = 'sso_session';

/**
 * Protects the self-service /profile API. Accepts either:
 *  - the `sso_session` HttpOnly cookie (browser /profile/ui case), or
 *  - a normal `Authorization: Bearer` access token (any other API consumer,
 *    same as BearerAuthGuard).
 * Either path populates the same AccessTokenData shape so downstream code
 * (CurrentUser decorator, ProfileService) doesn't need to know which was used.
 */
@Injectable()
export class SelfAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const sessionId = (request.cookies as Record<string, string> | undefined)?.[
      SSO_SESSION_COOKIE
    ];

    if (sessionId) {
      const session = await this.prisma.userSession.findUnique({
        where: { sessionId },
      });

      if (session && session.expiresAt >= new Date()) {
        const user = await this.prisma.user.findUnique({
          where: { id: session.userId },
        });

        if (user && !user.isDisabled) {
          const tokenData: AccessTokenData = {
            userId: user.id,
            clientId: 'sso_session',
            scope: 'openid profile email',
          };
          (request as Request & { tokenData: AccessTokenData }).tokenData =
            tokenData;
          return true;
        }
      }
    }

    const tokenData = await resolveBearerAccessToken(
      this.prisma,
      request.header('Authorization'),
    );
    if (!tokenData) {
      throw new UnauthorizedException(bilingual('token_not_found_or_expired'));
    }

    (request as Request & { tokenData: AccessTokenData }).tokenData = tokenData;
    return true;
  }
}
