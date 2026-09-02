import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { bilingual } from '../../common/errors';
import type { AppConfig } from '../../config/config';
import { PrismaService } from '../../prisma/prisma.service';

const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';

interface DiscordProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface DiscordTokenResponse {
  access_token: string;
}

interface DiscordUserResponse {
  id: string;
  username: string;
  avatar: string | null;
}

@Injectable()
export class DiscordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.configService.get('discord', { infer: true }).clientId);
  }

  private requireConfig() {
    const discord = this.configService.get('discord', { infer: true });
    if (!discord.clientId || !discord.clientSecret || !discord.callbackUrl) {
      throw new ServiceUnavailableException(
        bilingual('discord_not_configured'),
      );
    }
    return discord;
  }

  buildAuthorizeUrl(state: string): string {
    const discord = this.requireConfig();
    const url = new URL(DISCORD_AUTHORIZE_URL);
    url.searchParams.set('client_id', discord.clientId);
    url.searchParams.set('redirect_uri', discord.callbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'identify');
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCodeForProfile(code: string): Promise<DiscordProfile> {
    const discord = this.requireConfig();

    const tokenRes = await fetch(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: discord.clientId,
        client_secret: discord.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: discord.callbackUrl,
      }),
    });
    if (!tokenRes.ok) {
      throw new BadRequestException(bilingual('discord_state_mismatch'));
    }
    const token = (await tokenRes.json()) as DiscordTokenResponse;

    const userRes = await fetch(DISCORD_USER_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!userRes.ok) {
      throw new BadRequestException(bilingual('discord_state_mismatch'));
    }
    const user = (await userRes.json()) as DiscordUserResponse;

    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null,
    };
  }

  async link(userId: string, profile: DiscordProfile) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          discordId: profile.id,
          discordUsername: profile.username,
          discordAvatar: profile.avatarUrl,
          discordLinkedAt: new Date(),
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(bilingual('discord_already_linked'));
      }
      throw err;
    }
  }

  async unlink(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        discordId: null,
        discordUsername: null,
        discordAvatar: null,
        discordLinkedAt: null,
      },
    });
  }
}
