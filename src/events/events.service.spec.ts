import { EventsService } from './events.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/config';
import { encryptSecret } from '../lib/crypto';
import type { User } from '@prisma/client';

describe('EventsService', () => {
  let service: EventsService;
  let auditLogCreateMock: jest.Mock;
  let webhookFindManyMock: jest.Mock;
  let webhookDeliveryCreateMock: jest.Mock;
  let userFindUniqueMock: jest.Mock;
  const masterKey = 'test-master-session-secret-123456';

  beforeEach(() => {
    auditLogCreateMock = jest.fn().mockResolvedValue({ id: 'log-1' });
    webhookFindManyMock = jest.fn();
    webhookDeliveryCreateMock = jest.fn().mockResolvedValue({ id: 'del-1' });
    userFindUniqueMock = jest.fn();

    const mockPrisma = {
      auditLog: {
        create: auditLogCreateMock,
      },
      webhook: {
        findMany: webhookFindManyMock,
      },
      webhookDelivery: {
        create: webhookDeliveryCreateMock,
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      user: {
        findUnique: userFindUniqueMock,
      },
    } as unknown as PrismaService;

    const mockConfig = {
      get: jest.fn().mockReturnValue(masterKey),
    } as unknown as ConfigService<AppConfig, true>;

    service = new EventsService(mockPrisma, mockConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should write audit log and deliver to matching webhooks awaiting all requests', async () => {
    const targetUser = {
      id: 'target-1',
      username: 'targetuser',
      firstName: 'Target',
      lastName: 'User',
      middleName: null,
      avatar: null,
      discordId: 'discord-123',
      discordUsername: 'target_discord',
      clubRoles: [],
    } as unknown as User;
    userFindUniqueMock.mockImplementation(
      ({ where }: { where: { id: string } }) => {
        if (where.id === 'target-1') return Promise.resolve(targetUser);
        return Promise.resolve(null);
      },
    );

    const secretEnc = encryptSecret('webhook-secret-token', masterKey);
    webhookFindManyMock.mockResolvedValue([
      {
        id: 'wh-1',
        url: 'https://example.com/webhook',
        secretEnc,
      },
    ]);

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    global.fetch = fetchMock;

    await service.record({
      event: 'member.changed',
      actorId: 'target-1',
      targetId: 'target-1',
      changedFields: ['discordId'],
      extra: { action: 'discord-linked' },
    });

    expect(auditLogCreateMock).toHaveBeenCalledTimes(1);
    expect(webhookFindManyMock).toHaveBeenCalledWith({
      where: { events: { has: 'member.changed' }, isActive: true },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [callUrl, callOptions] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(callUrl).toBe('https://example.com/webhook');
    expect(callOptions.method).toBe('POST');
    const headers = callOptions.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-MPC-Event']).toBe('member.changed');

    expect(webhookDeliveryCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        webhookId: 'wh-1',
        event: 'member.changed',
        statusCode: 200,
        ok: true,
        error: undefined,
      }) as unknown,
    });
  });

  it('should capture HTTP error text in webhook delivery when status is not ok', async () => {
    const secretEnc = encryptSecret('webhook-secret-token', masterKey);
    webhookFindManyMock.mockResolvedValue([
      {
        id: 'wh-2',
        url: 'https://discord.com/api/webhooks/123/xyz',
        secretEnc,
      },
    ]);

    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue('{"message": "Invalid Form Body"}'),
    });
    global.fetch = fetchMock;

    await service.record({
      event: 'member.changed',
      extra: { action: 'updated' },
    });

    expect(webhookDeliveryCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        webhookId: 'wh-2',
        event: 'member.changed',
        statusCode: 400,
        ok: false,
        error: 'HTTP 400: {"message": "Invalid Form Body"}',
      }) as unknown,
    });
  });
});
