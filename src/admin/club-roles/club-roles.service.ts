import { Injectable, NotFoundException } from '@nestjs/common';
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

    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!department) throw new NotFoundException('Department not found');
    }

    const clubRole = await this.prisma.clubRole.create({ data: dto });

    await this.events.record({
      event: 'club-role.created',
      actorId,
      targetId: clubRole.id,
      targetLabel: `${dto.position} · ${user.username}`,
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
      include: { user: true },
    });
    if (!clubRole) throw new NotFoundException('Club role not found');

    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({
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

    return updated;
  }

  async remove(id: string, actorId?: string, ip?: string) {
    const clubRole = await this.prisma.clubRole.findUnique({
      where: { id },
      include: { user: true },
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

    return { id, deleted: true };
  }
}
