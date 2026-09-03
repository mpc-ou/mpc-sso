import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditLogQueryDto) {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.event) where.event = query.event;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        changedFields: item.changedFields
          ? (JSON.parse(item.changedFields) as string[])
          : [],
        metadata: item.metadata
          ? (JSON.parse(item.metadata) as Record<string, unknown>)
          : null,
      })),
      total,
      page: query.page ?? 1,
      limit: query.take,
    };
  }
}
