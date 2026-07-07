import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { generateToken } from '../../lib/crypto';
import { dummyVerify, verifyPassword } from '../../lib/password';
import { stripPassword } from '../../lib/user-claims';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminLoginDto } from './dto/admin-login.dto';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class AdminSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async login(
    dto: AdminLoginDto,
  ): Promise<{ sessionId: string; expiresAt: Date }> {
    const login = dto.login.trim();
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: login }, { email: login.toLowerCase() }] },
    });

    if (!user || !user.password) {
      await dummyVerify();
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await verifyPassword(user.password, dto.password);
    if (!valid || user.isDisabled || user.webRole !== 'ADMIN') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sessionId = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.prisma.adminSession.create({
      data: { sessionId, userId: user.id, expiresAt },
    });

    return { sessionId, expiresAt };
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.adminSession.deleteMany({ where: { sessionId } });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');
    return stripPassword(user);
  }
}
