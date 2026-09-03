import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventsService } from '../../events/events.service';
import { hashPassword } from '../../lib/password';
import { stripPassword } from '../../lib/user-claims';
import { PrismaService } from '../../prisma/prisma.service';
import { UserQueryDto } from './dto/user-query.dto';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

const toSafeUser = stripPassword;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async list(query: UserQueryDto) {
    const where: Prisma.UserWhereInput = {};

    if (query.webRole) {
      where.webRole = query.webRole;
    }

    if (query.status === 'active') {
      where.isDisabled = false;
    } else if (query.status === 'disabled') {
      where.isDisabled = true;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { username: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { mssv: { contains: s, mode: 'insensitive' } },
      ];
    }

    let orderBy:
      | Prisma.UserOrderByWithRelationInput
      | Prisma.UserOrderByWithRelationInput[] = { createdAt: 'desc' };
    if (query.sortBy) {
      if (query.sortBy === 'name') {
        orderBy = [
          { lastName: query.sortOrder || 'asc' },
          { firstName: query.sortOrder || 'asc' },
        ];
      } else {
        orderBy = { [query.sortBy]: query.sortOrder || 'asc' };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy,
        include: { clubRoles: { include: { department: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => toSafeUser(u)),
      total,
      page: query.page ?? 1,
      limit: query.take,
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        clubRoles: {
          include: { department: true },
          orderBy: { startAt: 'desc' },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return toSafeUser(user);
  }

  async create(dto: CreateUserDto, actorId?: string) {
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new ConflictException('Username already registered');
    }

    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException('Email already registered');
      }
    }

    const passwordHash = dto.password ? await hashPassword(dto.password) : null;

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: passwordHash,
        webRole: dto.webRole,
        isDisabled: dto.isDisabled ?? false,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        dob: dto.dob,
        address: dto.address,
        className: dto.className,
        mssv: dto.mssv,
        faculty: dto.faculty,
        phone: dto.phone,
        avatar: dto.avatar,
        bio: dto.bio,
      },
    });

    await this.events.record({
      event: 'member.changed',
      actorId,
      targetId: user.id,
      extra: { action: 'created' },
    });

    return toSafeUser(user);
  }

  async update(id: string, dto: UpdateUserDto, actorId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== user.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail)
        throw new ConflictException('Email already registered');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        webRole: dto.webRole,
        isDisabled: dto.isDisabled,
        isProfileLocked: dto.isProfileLocked,
        password: dto.password ? await hashPassword(dto.password) : undefined,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        dob: dto.dob,
        address: dto.address,
        className: dto.className,
        mssv: dto.mssv,
        faculty: dto.faculty,
        phone: dto.phone,
        avatar: dto.avatar,
        bio: dto.bio,
      },
    });

    const changedFields = Object.entries(dto)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key);

    await this.events.record({
      event: 'profile.updated',
      actorId,
      targetId: id,
      changedFields,
    });
    await this.events.record({
      event: 'member.changed',
      actorId,
      targetId: id,
      extra: { action: 'updated' },
    });

    return toSafeUser(updated);
  }

  async delete(id: string, actorId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.delete({ where: { id } });

    await this.events.record({
      event: 'member.changed',
      actorId,
      targetId: id,
      targetLabel: user.username,
      extra: { action: 'deleted' },
    });

    return { id, deleted: true };
  }

  async bulkDelete(ids: string[], actorId?: string) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, username: true },
    });

    await this.prisma.user.deleteMany({
      where: { id: { in: ids } },
    });

    for (const user of users) {
      await this.events.record({
        event: 'member.changed',
        actorId,
        targetId: user.id,
        targetLabel: user.username,
        extra: { action: 'deleted' },
      });
    }

    return { count: ids.length };
  }
}
