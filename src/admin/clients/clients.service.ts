import { Injectable, NotFoundException } from '@nestjs/common';
import type { Client } from '@prisma/client';
import { generateId, generateToken } from '../../lib/crypto';
import { hashPassword } from '../../lib/password';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateClientDto } from './dto/create-client.dto';
import type { UpdateClientDto } from './dto/update-client.dto';

function toSafeClient(client: Client) {
  const { clientSecretHash: _hash, ...safe } = client;
  return { ...safe, redirectUris: JSON.parse(client.redirectUris) as string[] };
}

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const clients = await this.prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return clients.map(toSafeClient);
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');
    return toSafeClient(client);
  }

  /** Returns the plaintext client_secret exactly once — it is never retrievable again */
  async create(dto: CreateClientDto) {
    const clientId = generateId();
    const clientSecret = generateToken();
    const clientSecretHash = await hashPassword(clientSecret);

    const client = await this.prisma.client.create({
      data: {
        clientId,
        clientSecretHash,
        name: dto.name,
        redirectUris: JSON.stringify(dto.redirectUris),
        allowedScopes: dto.allowedScopes ?? 'openid profile email',
        createdBy: dto.createdBy ?? 'system',
      },
    });

    return { ...toSafeClient(client), clientSecret };
  }

  async update(id: string, dto: UpdateClientDto) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');

    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        name: dto.name,
        redirectUris: dto.redirectUris
          ? JSON.stringify(dto.redirectUris)
          : undefined,
        allowedScopes: dto.allowedScopes,
        isActive: dto.isActive,
      },
    });

    return toSafeClient(updated);
  }

  async remove(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');

    await this.prisma.client.delete({ where: { id } });
    return { id, deleted: true };
  }

  async bulkDelete(ids: string[]) {
    await this.prisma.client.deleteMany({
      where: { id: { in: ids } },
    });
    return { count: ids.length };
  }
}
