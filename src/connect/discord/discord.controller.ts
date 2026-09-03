import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { AppConfig } from '../../config/config';
import { bilingual } from '../../common/errors';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AccessTokenData } from '../../common/guards/bearer-auth.guard';
import { SelfAuthGuard } from '../../auth/guards/self-auth.guard';
import { signState, verifyState } from '../../lib/crypto';
import { DiscordService } from './discord.service';

const STATE_MAX_AGE_MS = 10 * 60 * 1000;

@Controller('connect/discord')
@UseGuards(SelfAuthGuard)
export class DiscordController {
  constructor(
    private readonly discordService: DiscordService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  @Get('enabled')
  enabled(): { enabled: boolean } {
    return { enabled: this.discordService.isConfigured() };
  }

  @Get()
  start(@CurrentUser() tokenData: AccessTokenData, @Res() res: Response): void {
    // Signed state carries its own CSRF binding (userId + timestamp + nonce +
    // HMAC) so it doesn't need a round-tripped cookie — avoids state mismatches
    // from browsers/extensions that drop cookies across the OAuth redirect.
    const state = signState(
      tokenData.userId,
      this.configService.get('sessionSecret', { infer: true }),
    );
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

    const statePayload = returnedState
      ? verifyState(
          returnedState,
          this.configService.get('sessionSecret', { infer: true }),
          STATE_MAX_AGE_MS,
        )
      : null;

    if (!code || !statePayload || statePayload !== tokenData.userId) {
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
