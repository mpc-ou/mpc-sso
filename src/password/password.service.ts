import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/config';
import { generateToken } from '../lib/crypto';
import { hashPassword } from '../lib/password';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from './mailer.service';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class PasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async forgot(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Không tiết lộ email có tồn tại trong hệ thống hay không
    if (!user || !user.email) return;

    const token = generateToken();
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const issuer = this.configService.get('issuer', { infer: true });
    const resetUrl = `${issuer}/password/reset?token=${encodeURIComponent(token)}`;
    await this.mailer.sendPasswordResetEmail(user.email, resetUrl);
  }

  async reset(token: string, newPassword: string): Promise<void> {
    const record = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { id: record.id },
        data: { used: true },
      }),
    ]);
  }
}
