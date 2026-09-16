import { ApiService } from './api.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { EventsService } from '../events/events.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import type { User, ClubRole, Department } from '@prisma/client';

type UserWithRelations = User & {
  clubRoles: (ClubRole & { department: Department | null })[];
};

describe('ApiService', () => {
  let service: ApiService;
  let userFindUniqueMock: jest.Mock;
  let userFindFirstMock: jest.Mock;
  let userFindManyMock: jest.Mock;
  let userCountMock: jest.Mock;
  let userUpdateMock: jest.Mock;
  let eventsRecordMock: jest.Mock;

  beforeEach(() => {
    userFindUniqueMock = jest.fn();
    userFindFirstMock = jest.fn();
    userFindManyMock = jest.fn();
    userCountMock = jest.fn();
    userUpdateMock = jest.fn();
    eventsRecordMock = jest.fn().mockResolvedValue(undefined);

    const mockPrisma = {
      user: {
        findUnique: userFindUniqueMock,
        findFirst: userFindFirstMock,
        findMany: userFindManyMock,
        count: userCountMock,
        update: userUpdateMock,
      },
    } as unknown as PrismaService;

    const mockEvents = {
      record: eventsRecordMock,
    } as unknown as EventsService;

    service = new ApiService(mockPrisma, mockEvents);
  });

  const mockUser: UserWithRelations = {
    id: 'user-1',
    username: 'holedev',
    email: 'ho.pl@ou.edu.vn',
    password: null,
    googleId: null,
    webRole: 'MEMBER',
    isDisabled: false,
    firstName: 'Hồ',
    middleName: null,
    lastName: 'Phan Lê',
    dob: new Date('2001-02-06'),
    address: null,
    className: null,
    mssv: '2051052051',
    faculty: null,
    phone: '',
    avatar: 'https://example.com/avatar.jpg',
    bio: null,
    isProfileLocked: false,
    discordId: '732157441889927239',
    discordUsername: 'hole',
    discordAvatar: null,
    discordLinkedAt: new Date('2026-09-01'),
    lastActiveAt: null,
    lastActiveIp: null,
    createdAt: new Date('2026-02-27'),
    updatedAt: new Date('2026-09-03'),
    clubRoles: [
      {
        id: 'cr-1',
        userId: 'user-1',
        departmentId: 'dept-1',
        position: 'DEPARTMENT_LEADER',
        term: null,
        note: null,
        startAt: new Date('2022-10-01'),
        endAt: new Date('2025-08-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
        department: {
          id: 'dept-1',
          name: 'Ban Lập trình',
          code: 'PROGRAMMING',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        id: 'cr-2',
        userId: 'user-1',
        departmentId: 'dept-1',
        position: 'DEPARTMENT_MEMBER',
        term: null,
        note: null,
        startAt: new Date('2021-05-01'),
        endAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        department: {
          id: 'dept-1',
          name: 'Ban Lập trình',
          code: 'PROGRAMMING',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ],
  };

  describe('getUser', () => {
    it('should return user with currentDepartment and classOf', async () => {
      userFindFirstMock.mockResolvedValue(mockUser);

      const result = await service.getUser('user-1');

      expect(result.id).toBe('user-1');
      expect(result.currentDepartment).toBe('PROGRAMMING');
      expect(result.classOf).toBe(2021);
      expect(result.member?.currentDepartment).toBe('PROGRAMMING');
      expect(result.member?.classOf).toBe(2021);
    });

    it('should throw NotFoundException if user not found', async () => {
      userFindFirstMock.mockResolvedValue(null);

      await expect(service.getUser('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserByDiscordId', () => {
    it('should return user found by discordId with virtual fields', async () => {
      userFindFirstMock.mockResolvedValue(mockUser);

      const result = await service.getUserByDiscordId('732157441889927239');

      expect(result.username).toBe('holedev');
      expect(result.currentDepartment).toBe('PROGRAMMING');
      expect(result.classOf).toBe(2021);
      expect(userFindFirstMock).toHaveBeenCalledWith({
        where: { discordId: '732157441889927239' },
        include: { clubRoles: { include: { department: true } } },
      });
    });

    it('should throw NotFoundException if discordId not found', async () => {
      userFindFirstMock.mockResolvedValue(null);

      await expect(
        service.getUserByDiscordId('unknown-discord'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDiscordIdByUser', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      userFindFirstMock.mockResolvedValue(null);

      await expect(
        service.updateDiscordIdByUser('non-existent', {
          discordId: '123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if discordId is already taken', async () => {
      userFindFirstMock
        .mockResolvedValueOnce(mockUser) // find user
        .mockResolvedValueOnce({ id: 'user-2' }); // existing check

      await expect(
        service.updateDiscordIdByUser('user-1', {
          discordId: 'taken-discord-id',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should update discordId and record member.changed event', async () => {
      userFindFirstMock
        .mockResolvedValueOnce(mockUser) // find user
        .mockResolvedValueOnce(null); // existing check
      const updatedUser: UserWithRelations = {
        ...mockUser,
        discordId: '999888777',
        discordUsername: 'new_discord',
      };
      userUpdateMock.mockResolvedValue(updatedUser);

      const result = await service.updateDiscordIdByUser(
        'user-1',
        {
          discordId: '999888777',
          discordUsername: 'new_discord',
        },
        '127.0.0.1',
      );

      expect(result.discordId).toBe('999888777');
      expect(result.discordUsername).toBe('new_discord');
      expect(eventsRecordMock).toHaveBeenCalledWith({
        event: 'member.changed',
        actorId: 'user-1',
        actorLabel: 'holedev',
        targetId: 'user-1',
        targetLabel: 'holedev',
        changedFields: ['discordId', 'discordUsername', 'discordLinkedAt'],
        extra: {
          action: 'discord-linked',
          discordId: '999888777',
          discordUsername: 'new_discord',
        },
        ip: '127.0.0.1',
      });
    });
  });
});
