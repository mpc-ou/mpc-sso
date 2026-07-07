import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { AppConfig } from '../config/config';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const smtp = this.configService.get('smtp', { infer: true });
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      });
    }
    return this.transporter;
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const smtp = this.configService.get('smtp', { infer: true });
    try {
      await this.getTransporter().sendMail({
        from: smtp.from,
        to,
        subject: 'Đặt lại mật khẩu MPClub SSO',
        html: `<p>Nhấn vào liên kết sau để đặt lại mật khẩu (hết hạn sau 30 phút):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send password reset email to ${to}`,
        err as Error,
      );
      throw err;
    }
  }
}
