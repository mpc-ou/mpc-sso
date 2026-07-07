import { Injectable, UnauthorizedException } from '@nestjs/common';
import { bilingual } from '../common/errors';
import type { AccessTokenData } from '../common/guards/bearer-auth.guard';
import { getFullName } from '../lib/user-claims';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserinfoService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserinfo(
    tokenData: AccessTokenData,
  ): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: tokenData.userId },
    });

    if (!user) {
      throw new UnauthorizedException(bilingual('user_not_found'));
    }

    const scopes = tokenData.scope.split(' ');
    const response: Record<string, unknown> = { sub: user.id };

    if (scopes.includes('email') && user.email) {
      response.email = user.email;
    }
    if (scopes.includes('profile')) {
      response.name = getFullName(user);
      response.role = user.webRole;
    }

    return response;
  }
}
