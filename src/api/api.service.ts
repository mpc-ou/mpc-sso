import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ClubRole, Department, User } from '@prisma/client';
import type { PaginationDto } from '../common/dto/pagination.dto';
import { EventsService } from '../events/events.service';
import {
  checkIsAlumni,
  computeClassOf,
  computeCurrentDepartment,
} from '../lib/member-utils';
import { stripPassword } from '../lib/user-claims';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateDiscordDto } from './dto/update-discord.dto';

type UserWithRoles = User & {
  clubRoles: (ClubRole & { department: Department | null })[];
};

@Injectable()
export class ApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  formatUser(u: UserWithRoles) {
    const safe = stripPassword(u);
    const isAlumni = checkIsAlumni(u.clubRoles || []);
    const currentDepartment = computeCurrentDepartment(u.clubRoles || []);
    const classOf = computeClassOf(u.clubRoles || []);

    return {
      ...safe,
      currentDepartment,
      classOf,
      member: u.firstName
        ? {
            id: u.id,
            userId: u.id,
            firstName: u.firstName,
            middleName: u.middleName,
            lastName: u.lastName,
            dob: u.dob,
            address: u.address,
            className: u.className,
            mssv: u.mssv,
            faculty: u.faculty,
            phone: u.phone,
            avatar: u.avatar,
            bio: u.bio,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            isAlumni,
            Alumni: isAlumni,
            currentDepartment,
            classOf,
          }
        : null,
    };
  }

  formatMember(u: UserWithRoles) {
    const isAlumni = checkIsAlumni(u.clubRoles || []);
    const currentDepartment = computeCurrentDepartment(u.clubRoles || []);
    const classOf = computeClassOf(u.clubRoles || []);

    return {
      id: u.id,
      userId: u.id,
      username: u.username,
      email: u.email,
      webRole: u.webRole,
      isDisabled: u.isDisabled,
      firstName: u.firstName ?? '',
      middleName: u.middleName,
      lastName: u.lastName ?? '',
      dob: u.dob,
      address: u.address,
      className: u.className,
      mssv: u.mssv,
      faculty: u.faculty,
      phone: u.phone,
      avatar: u.avatar,
      bio: u.bio,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      roles: u.clubRoles,
      isAlumni,
      Alumni: isAlumni,
      currentDepartment,
      classOf,
    };
  }

  async listUsers(pagination: PaginationDto) {
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: { clubRoles: { include: { department: true } } },
      }),
      this.prisma.user.count(),
    ]);

    return {
      items: items.map((u) => this.formatUser(u)),
      total,
      page: pagination.page ?? 1,
      limit: pagination.take,
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ id }, { username: id }] },
      include: { clubRoles: { include: { department: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.formatUser(user);
  }

  async getUserByDiscordId(discordId: string) {
    const user = await this.prisma.user.findFirst({
      where: { discordId },
      include: { clubRoles: { include: { department: true } } },
    });
    if (!user) throw new NotFoundException('User not found by Discord ID');
    return this.formatUser(user);
  }

  async updateDiscordIdByUser(
    idOrUsername: string,
    dto: UpdateDiscordDto,
    ip?: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ id: idOrUsername }, { username: idOrUsername }],
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const newDiscordId = dto.discordId ? dto.discordId.trim() : null;

    if (newDiscordId && newDiscordId !== user.discordId) {
      const existing = await this.prisma.user.findFirst({
        where: { discordId: newDiscordId, id: { not: user.id } },
      });
      if (existing) {
        throw new ConflictException(
          'Discord ID already linked to another user',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        discordId: newDiscordId,
        discordUsername:
          dto.discordUsername !== undefined
            ? dto.discordUsername?.trim() || null
            : undefined,
        discordLinkedAt: newDiscordId ? new Date() : null,
      },
      include: { clubRoles: { include: { department: true } } },
    });

    await this.events.record({
      event: 'member.changed',
      actorId: user.id,
      actorLabel: user.username,
      targetId: user.id,
      targetLabel: user.username,
      changedFields: ['discordId', 'discordUsername', 'discordLinkedAt'],
      extra: {
        action: newDiscordId ? 'discord-linked' : 'discord-unlinked',
        discordId: updated.discordId,
        discordUsername: updated.discordUsername,
      },
      ip,
    });

    return this.formatUser(updated);
  }

  async listMembers(pagination: PaginationDto) {
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: { clubRoles: { include: { department: true } } },
      }),
      this.prisma.user.count(),
    ]);

    return {
      items: items.map((u) => this.formatMember(u)),
      total,
      page: pagination.page ?? 1,
      limit: pagination.take,
    };
  }

  async getMember(id: string) {
    const u = await this.prisma.user.findFirst({
      where: { OR: [{ id }, { username: id }] },
      include: { clubRoles: { include: { department: true } } },
    });
    if (!u) throw new NotFoundException('Member not found');
    return this.formatMember(u);
  }
}
