import { Injectable, NotFoundException } from '@nestjs/common';
import type { Department } from '@prisma/client';
import type { PaginationDto } from '../../common/dto/pagination.dto';
import { EventsService } from '../../events/events.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateClubRoleDto } from './dto/create-club-role.dto';
import type { UpdateClubRoleDto } from './dto/update-club-role.dto';

@Injectable()
export class ClubRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async list(pagination: PaginationDto) {
    const [items, total] = await Promise.all([
      this.prisma.clubRole.findMany({
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { startAt: 'desc' },
        include: { department: true },
      }),
      this.prisma.clubRole.count(),
    ]);

    return {
      items,
      total,
      page: pagination.page ?? 1,
      limit: pagination.take,
    };
  }

  async create(dto: CreateClubRoleDto, actorId?: string, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundException('User not found');

    let department: Department | null = null;
    if (dto.departmentId) {
      department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!department) throw new NotFoundException('Department not found');
    }

    const clubRole = await this.prisma.clubRole.create({ data: dto });

    // Audit-only: precise record of the club-role entity itself.
    await this.events.record({
      event: 'club-role.created',
      actorId,
      targetId: clubRole.id,
      targetLabel: `${dto.position} · ${user.username}`,
      ip,
    });
    // Public/webhook-facing: a club role is "member info" — notifies webhooks
    // subscribed to member.changed (e.g. a Discord bot syncing roles).
    await this.events.record({
      event: 'member.changed',
      actorId,
      targetId: user.id,
      targetLabel: user.username,
      extra: {
        action: 'role-added',
        position: dto.position,
        department: department?.name,
      },
      ip,
    });

    return clubRole;
  }

  async update(
    id: string,
    dto: UpdateClubRoleDto,
    actorId?: string,
    ip?: string,
  ) {
    const clubRole = await this.prisma.clubRole.findUnique({
      where: { id },
      include: { user: true, department: true },
    });
    if (!clubRole) throw new NotFoundException('Club role not found');

    let department: Department | null = clubRole.department;
    if (dto.departmentId) {
      department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!department) throw new NotFoundException('Department not found');
    }

    const updated = await this.prisma.clubRole.update({
      where: { id },
      data: dto,
    });

    const changedFields = Object.entries(dto)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key);

    await this.events.record({
      event: 'club-role.updated',
      actorId,
      targetId: id,
      targetLabel: `${updated.position} · ${clubRole.user.username}`,
      changedFields,
      ip,
    });
    await this.events.record({
      event: 'member.changed',
      actorId,
      targetId: clubRole.userId,
      targetLabel: clubRole.user.username,
      extra: {
        action: 'role-updated',
        position: updated.position,
        department: department?.name,
      },
      ip,
    });

    return updated;
  }

  async remove(id: string, actorId?: string, ip?: string) {
    const clubRole = await this.prisma.clubRole.findUnique({
      where: { id },
      include: { user: true, department: true },
    });
    if (!clubRole) throw new NotFoundException('Club role not found');

    await this.prisma.clubRole.delete({ where: { id } });

    await this.events.record({
      event: 'club-role.deleted',
      actorId,
      targetId: id,
      targetLabel: `${clubRole.position} · ${clubRole.user.username}`,
      ip,
    });
    await this.events.record({
      event: 'member.changed',
      actorId,
      targetId: clubRole.userId,
      targetLabel: clubRole.user.username,
      extra: {
        action: 'role-removed',
        position: clubRole.position,
        department: clubRole.department?.name,
      },
      ip,
    });

    return { id, deleted: true };
  }
}
