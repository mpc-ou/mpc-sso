import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginationDto } from '../common/dto/pagination.dto';
import { stripPassword } from '../lib/user-claims';
import { PrismaService } from '../prisma/prisma.service';

interface ClubRoleItem {
  position: string;
  startAt: Date | string;
  endAt: Date | string | null;
}

function checkIsAlumni(clubRoles: ClubRoleItem[]): boolean {
  if (!clubRoles) return false;
  const fourYearsInMs = 4 * 365.25 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  return clubRoles.some((role) => {
    if (role.position !== 'DEPARTMENT_MEMBER') return false;
    if (role.endAt) return false;
    const start = new Date(role.startAt).getTime();
    return now - start > fourYearsInMs;
  });
}

@Injectable()
export class ApiService {
  constructor(private readonly prisma: PrismaService) {}

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
      items: items.map((u) => {
        const safe = stripPassword(u);
        const isAlumni = checkIsAlumni(u.clubRoles || []);
        return {
          ...safe,
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
              }
            : null,
        };
      }),
      total,
      page: pagination.page ?? 1,
      limit: pagination.take,
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { clubRoles: { include: { department: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    const safe = stripPassword(user);
    const isAlumni = checkIsAlumni(user.clubRoles || []);
    return {
      ...safe,
      member: user.firstName
        ? {
            id: user.id,
            userId: user.id,
            firstName: user.firstName,
            middleName: user.middleName,
            lastName: user.lastName,
            dob: user.dob,
            address: user.address,
            className: user.className,
            mssv: user.mssv,
            faculty: user.faculty,
            phone: user.phone,
            avatar: user.avatar,
            bio: user.bio,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            isAlumni,
            Alumni: isAlumni,
          }
        : null,
    };
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
      items: items.map((u) => {
        const isAlumni = checkIsAlumni(u.clubRoles || []);
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
        };
      }),
      total,
      page: pagination.page ?? 1,
      limit: pagination.take,
    };
  }

  async getMember(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: { clubRoles: { include: { department: true } } },
    });
    if (!u) throw new NotFoundException('Member not found');
    const isAlumni = checkIsAlumni(u.clubRoles || []);
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
    };
  }
}
