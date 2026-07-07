import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginationDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateClubRoleDto } from './dto/create-club-role.dto';
import type { UpdateClubRoleDto } from './dto/update-club-role.dto';

@Injectable()
export class ClubRolesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(dto: CreateClubRoleDto) {
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

    return this.prisma.clubRole.create({ data: dto });
  }

  async update(id: string, dto: UpdateClubRoleDto) {
    const clubRole = await this.prisma.clubRole.findUnique({ where: { id } });
    if (!clubRole) throw new NotFoundException('Club role not found');

    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!department) throw new NotFoundException('Department not found');
    }

    return this.prisma.clubRole.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const clubRole = await this.prisma.clubRole.findUnique({ where: { id } });
    if (!clubRole) throw new NotFoundException('Club role not found');

    await this.prisma.clubRole.delete({ where: { id } });
    return { id, deleted: true };
  }
}
