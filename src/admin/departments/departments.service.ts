import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventsService } from '../../events/events.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateDepartmentDto } from './dto/create-department.dto';
import type { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  list() {
    return this.prisma.department.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  async create(dto: CreateDepartmentDto, actorId?: string, ip?: string) {
    const existing = await this.prisma.department.findUnique({
      where: { code: dto.code },
    });
    if (existing) throw new ConflictException('Department code already exists');

    const department = await this.prisma.department.create({ data: dto });

    await this.events.record({
      event: 'department.created',
      actorId,
      targetId: department.id,
      targetLabel: department.name,
      ip,
    });

    return department;
  }

  async update(
    id: string,
    dto: UpdateDepartmentDto,
    actorId?: string,
    ip?: string,
  ) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });
    if (!department) throw new NotFoundException('Department not found');

    if (dto.code && dto.code !== department.code) {
      const existing = await this.prisma.department.findUnique({
        where: { code: dto.code },
      });
      if (existing)
        throw new ConflictException('Department code already exists');
    }

    const updated = await this.prisma.department.update({
      where: { id },
      data: dto,
    });

    const changedFields = Object.entries(dto)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key);

    await this.events.record({
      event: 'department.updated',
      actorId,
      targetId: id,
      targetLabel: updated.name,
      changedFields,
      ip,
    });

    return updated;
  }

  async remove(id: string, actorId?: string, ip?: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });
    if (!department) throw new NotFoundException('Department not found');

    await this.prisma.department.delete({ where: { id } });

    await this.events.record({
      event: 'department.deleted',
      actorId,
      targetId: id,
      targetLabel: department.name,
      ip,
    });

    return { id, deleted: true };
  }

  async bulkDelete(ids: string[], actorId?: string, ip?: string) {
    const departments = await this.prisma.department.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });

    await this.prisma.department.deleteMany({
      where: { id: { in: ids } },
    });

    for (const department of departments) {
      await this.events.record({
        event: 'department.deleted',
        actorId,
        targetId: department.id,
        targetLabel: department.name,
        ip,
      });
    }

    return { count: ids.length };
  }
}
