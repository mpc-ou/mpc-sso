import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { ADMIN_SESSION_COOKIE } from '../../auth/guards/admin-session.guard';
import type { AppConfig } from '../../config/config';
import { PrismaService } from '../../prisma/prisma.service';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Protects /admin/* CRUD endpoints. Accepts either:
 *  - `X-Admin-Secret` header (scripts/service-to-service access, PLAN.md §4.2), or
 *  - a valid `admin_session` cookie for a webRole=ADMIN user (browser Admin UI, PLAN.md §4.5/§6.5)
 * The header alone can't be used from the browser without embedding the master secret in
 * frontend JS, so the Admin UI needs the cookie path — this guard supports both.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const secret = request.header('X-Admin-Secret');
    if (secret) {
      const expected = this.configService.get('adminSecret', { infer: true });
      if (safeEqual(secret, expected)) return true;
      throw new UnauthorizedException('Invalid X-Admin-Secret header');
    }

    const sessionId = (request.cookies as Record<string, string> | undefined)?.[
      ADMIN_SESSION_COOKIE
    ];
    if (sessionId) {
      const session = await this.prisma.adminSession.findUnique({
        where: { sessionId },
      });
      if (session && session.expiresAt >= new Date()) {
        const user = await this.prisma.user.findUnique({
          where: { id: session.userId },
        });
        if (user && !user.isDisabled && user.webRole === 'ADMIN') {
          return true;
        }
      }
    }

    throw new UnauthorizedException(
      'Missing or invalid admin credentials (X-Admin-Secret header or admin_session cookie)',
    );
  }
}
