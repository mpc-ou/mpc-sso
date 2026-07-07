import { Injectable } from '@nestjs/common';
import { sha256Hex } from '../lib/crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { LogoutDto } from './dto/logout.dto';

@Injectable()
export class LogoutService {
  constructor(private readonly prisma: PrismaService) {}

  async logout(dto: LogoutDto): Promise<void> {
    if (dto.access_token) {
      await this.prisma.accessToken.deleteMany({
        where: { tokenHash: sha256Hex(dto.access_token) },
      });
    }

    if (dto.refresh_token) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: sha256Hex(dto.refresh_token) },
        data: { revoked: true },
      });
    }

    if (dto.session_id) {
      await this.prisma.adminSession.deleteMany({
        where: { sessionId: dto.session_id },
      });
    }
  }
}
