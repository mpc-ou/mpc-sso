import { DiscordService } from './discord.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ConfigService } from '@nestjs/config';
import type { EventsService } from '../../events/events.service';
import type { AppConfig } from '../../config/config';
import type { User } from '@prisma/client';

describe('DiscordService', () => {
  let service: DiscordService;
  let updateMock: jest.Mock;
  let recordMock: jest.Mock;

  beforeEach(() => {
    updateMock = jest.fn();
    recordMock = jest.fn().mockResolvedValue(undefined);

    const mockPrisma = {
      user: {
        update: updateMock,
      },
    } as unknown as PrismaService;

    const mockConfig = {
      get: jest.fn().mockReturnValue({
        clientId: 'test-client-id',
        clientSecret: 'test-secret',
        callbackUrl: 'http://localhost:3000/connect/discord/callback',
      }),
    } as unknown as ConfigService<AppConfig, true>;

    const mockEvents = {
      record: recordMock,
    } as unknown as EventsService;

    service = new DiscordService(mockPrisma, mockConfig, mockEvents);
  });

  describe('link', () => {
    it('should update user and record member.changed event with discord-linked action', async () => {
      const mockUpdatedUser = {
        id: 'user-123',
        username: 'testuser',
        discordId: 'discord-456',
        discordUsername: 'discorduser',
      } as unknown as User;
      updateMock.mockResolvedValue(mockUpdatedUser);

      const result = await service.link(
        'user-123',
        {
          id: 'discord-456',
          username: 'discorduser',
          avatarUrl: 'https://cdn.discordapp.com/avatar.png',
        },
        '127.0.0.1',
      );

      expect(result).toBe(mockUpdatedUser);
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          discordId: 'discord-456',
          discordUsername: 'discorduser',
          discordAvatar: 'https://cdn.discordapp.com/avatar.png',
        }) as unknown,
      });

      expect(recordMock).toHaveBeenCalledWith({
        event: 'member.changed',
        actorId: 'user-123',
        actorLabel: 'testuser',
        targetId: 'user-123',
        targetLabel: 'testuser',
        changedFields: [
          'discordId',
          'discordUsername',
          'discordAvatar',
          'discordLinkedAt',
        ],
        extra: {
          action: 'discord-linked',
          discordId: 'discord-456',
          discordUsername: 'discorduser',
        },
        ip: '127.0.0.1',
      });
    });
  });

  describe('unlink', () => {
    it('should clear discord fields and record member.changed event with discord-unlinked action', async () => {
      const mockUpdatedUser = {
        id: 'user-123',
        username: 'testuser',
        discordId: null,
        discordUsername: null,
      } as unknown as User;
      updateMock.mockResolvedValue(mockUpdatedUser);

      const result = await service.unlink('user-123', '127.0.0.1');

      expect(result).toBe(mockUpdatedUser);
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          discordId: null,
          discordUsername: null,
          discordAvatar: null,
          discordLinkedAt: null,
        },
      });

      expect(recordMock).toHaveBeenCalledWith({
        event: 'member.changed',
        actorId: 'user-123',
        actorLabel: 'testuser',
        targetId: 'user-123',
        targetLabel: 'testuser',
        changedFields: [
          'discordId',
          'discordUsername',
          'discordAvatar',
          'discordLinkedAt',
        ],
        extra: {
          action: 'discord-unlinked',
        },
        ip: '127.0.0.1',
      });
    });
  });
});
