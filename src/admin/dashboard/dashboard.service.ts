import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ACTIVE_WINDOW_MS = 15 * 60 * 1000;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS);

    const [totalLogins, loginsToday, activeNow, recentLogins] =
      await Promise.all([
        this.prisma.loginEvent.count(),
        this.prisma.loginEvent.count({
          where: { createdAt: { gte: startOfToday } },
        }),
        this.prisma.user.count({
          where: { lastActiveAt: { gte: activeSince } },
        }),
        this.prisma.loginEvent.findMany({
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { username: true, avatar: true } } },
        }),
      ]);

    return {
      totalLogins,
      loginsToday,
      activeNow,
      recentLogins: recentLogins.map((event) => ({
        id: event.id,
        username: event.user.username,
        avatar: event.user.avatar,
        method: event.method,
        ip: event.ip,
        createdAt: event.createdAt,
      })),
    };
  }
}
