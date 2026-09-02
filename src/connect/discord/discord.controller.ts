import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { bilingual } from '../../common/errors';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AccessTokenData } from '../../common/guards/bearer-auth.guard';
import { SelfAuthGuard } from '../../auth/guards/self-auth.guard';
import { generateToken } from '../../lib/crypto';
import { DiscordService } from './discord.service';

const DISCORD_STATE_COOKIE = 'discord_oauth_state';

@Controller('connect/discord')
@UseGuards(SelfAuthGuard)
export class DiscordController {
  constructor(private readonly discordService: DiscordService) {}

  @Get('enabled')
  enabled(): { enabled: boolean } {
    return { enabled: this.discordService.isConfigured() };
  }

  @Get()
  start(@Res() res: Response): void {
    const state = generateToken();
    res.cookie(DISCORD_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000,
      path: '/connect/discord',
    });
    res.redirect(this.discordService.buildAuthorizeUrl(state));
  }

  @Get('callback')
  async callback(
    @CurrentUser() tokenData: AccessTokenData,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const returnedState =
      typeof req.query.state === 'string' ? req.query.state : '';
    const expectedState = (req.cookies as Record<string, string> | undefined)?.[
      DISCORD_STATE_COOKIE
    ];

    res.clearCookie(DISCORD_STATE_COOKIE, { path: '/connect/discord' });

    if (!code || !returnedState || returnedState !== expectedState) {
      throw new BadRequestException(bilingual('discord_state_mismatch'));
    }

    const profile = await this.discordService.exchangeCodeForProfile(code);
    await this.discordService.link(tokenData.userId, profile);

    res.redirect('/profile/ui');
  }

  @Delete()
  unlink(@CurrentUser() tokenData: AccessTokenData) {
    return this.discordService.unlink(tokenData.userId);
  }
}
