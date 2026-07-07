import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

export const ADMIN_SESSION_COOKIE = 'admin_session';

export interface AdminSessionUser {
  userId: string;
  sessionId: string;
}

/** Protects /admin/ui/* endpoints via the `admin_session` HttpOnly cookie (see PLAN.md §4.5, §6.5) */
@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionId = (request.cookies as Record<string, string> | undefined)?.[
      ADMIN_SESSION_COOKIE
    ];

    if (!sessionId) {
      throw new UnauthorizedException('Missing admin session cookie');
    }

    const session = await this.prisma.adminSession.findUnique({
      where: { sessionId },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Admin session expired or invalid');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || user.isDisabled || user.webRole !== 'ADMIN') {
      throw new UnauthorizedException('Admin session no longer valid');
    }

    const adminUser: AdminSessionUser = { userId: user.id, sessionId };
    (request as Request & { adminUser: AdminSessionUser }).adminUser =
      adminUser;
    return true;
  }
}
