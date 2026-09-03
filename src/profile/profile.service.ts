import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { bilingual } from '../common/errors';
import { EventsService } from '../events/events.service';
import { stripPassword } from '../lib/user-claims';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';

const IMMUTABLE_ONCE_SET_FIELDS = [
  'phone',
  'dob',
  'className',
  'mssv',
  'faculty',
  'address',
] as const satisfies readonly (keyof UpdateProfileDto)[];

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');
    return stripPassword(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.isProfileLocked) {
      throw new ForbiddenException(bilingual('profile_locked'));
    }

    for (const field of IMMUTABLE_ONCE_SET_FIELDS) {
      const incoming = dto[field];
      if (incoming === undefined) continue;
      if (user[field] && !incoming) {
        throw new ForbiddenException(bilingual('profile_field_immutable'));
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        dob: dto.dob != null ? new Date(dto.dob) : undefined,
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
      event: 'member.changed',
      actorId: userId,
      actorLabel: user.username,
      targetId: userId,
      targetLabel: user.username,
      changedFields,
      extra: { action: 'updated' },
      ip,
    });

    return updated;
  }
}
