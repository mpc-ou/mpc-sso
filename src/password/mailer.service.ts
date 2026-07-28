import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { promises as dns } from 'node:dns';
import type { AppConfig } from '../config/config';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  /**
   * nodemailer resolves both A and AAAA records for the SMTP host and picks
   * one at random to connect to. Hosts without outbound IPv6 routing (common
   * on serverless/containers) then fail with ENETUNREACH whenever it picks
   * the AAAA address. Resolving the A record ourselves and connecting to
   * that literal IPv4 address sidesteps the random pick entirely; `servername`
   * keeps SNI/cert validation pointed at the real hostname.
   */
  private async createTransporter(): Promise<nodemailer.Transporter> {
    const smtp = this.configService.get('smtp', { infer: true });

    let host = smtp.host;
    try {
      const addresses = await dns.resolve4(smtp.host);
      if (addresses[0]) host = addresses[0];
    } catch (err) {
      this.logger.warn(
        `IPv4 lookup for SMTP host ${smtp.host} failed, falling back to hostname resolution: ${(err as Error).message}`,
      );
    }

    return nodemailer.createTransport({
      host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      tls: { servername: smtp.host },
    });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const smtp = this.configService.get('smtp', { infer: true });
    try {
      const transporter = await this.createTransporter();
      await transporter.sendMail({
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
