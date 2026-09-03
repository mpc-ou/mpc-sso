import { PrismaService } from '../prisma/prisma.service';

const THROTTLE_MS = 60 * 1000;

/**
 * Fire-and-forget: records that this user just made an authenticated request.
 * A single conditional UPDATE throttles writes to once/60s per user without
 * needing a prior read.
 */
export function touchActivity(
  prisma: PrismaService,
  userId: string,
  ip: string | undefined,
): void {
  const threshold = new Date(Date.now() - THROTTLE_MS);
  prisma.user
    .updateMany({
      where: {
        id: userId,
        OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: threshold } }],
      },
      data: { lastActiveAt: new Date(), lastActiveIp: ip },
    })
    .catch(() => {
      // best-effort only
    });
}
