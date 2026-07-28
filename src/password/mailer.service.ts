import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { AppConfig } from '../config/config';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private resend: Resend | null = null;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  private getClient(): Resend {
    if (!this.resend) {
      const { apiKey } = this.configService.get('resend', { infer: true });
      this.resend = new Resend(apiKey);
    }
    return this.resend;
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const { from } = this.configService.get('resend', { infer: true });
    try {
      const { error } = await this.getClient().emails.send({
        from,
        to,
        subject: 'Đặt lại mật khẩu MPClub SSO',
        html: `<p>Nhấn vào liên kết sau để đặt lại mật khẩu (hết hạn sau 30 phút):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
      if (error) throw new Error(error.message);
    } catch (err) {
      this.logger.error(
        `Failed to send password reset email to ${to}`,
        err as Error,
      );
      throw err;
    }
  }
}
