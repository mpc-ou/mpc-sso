import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { join } from 'node:path';
import { bilingual } from '../common/errors';
import type { AppConfig } from '../config/config';
import { WEB_UI_DIST } from '../lib/paths';
import { AuthService } from './auth.service';
import { AuthorizeQueryDto } from './dto/authorize.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import type { GoogleProfile } from './strategies/google.strategy';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  private isGoogleEnabled(): boolean {
    return Boolean(this.configService.get('google', { infer: true }).clientId);
  }

  @Get('authorize')
  async authorize(
    @Query() query: AuthorizeQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const { requestId } = await this.authService.authorize(query);
    res.redirect(`/login?request_id=${encodeURIComponent(requestId)}`);
  }

  @Get('login')
  serveLoginPage(@Res() res: Response): void {
    res.sendFile(join(WEB_UI_DIST, 'oidc-login.html'));
  }

  @Get('login/info')
  async getLoginInfo(@Query('request_id') requestId: string | undefined) {
    if (!requestId) {
      throw new BadRequestException(bilingual('missing_request_id'));
    }

    const pending = await this.authService.getPendingAuthorization(requestId);
    if (!pending) {
      throw new BadRequestException(bilingual('session_expired'));
    }

    const clientName = await this.authService.getClientName(pending.clientId);
    return { clientName, googleEnabled: this.isGoogleEnabled() };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async postLogin(@Body() dto: LoginDto): Promise<{ redirectUrl: string }> {
    const redirectUrl = await this.authService.login(dto);
    return { redirectUrl };
  }

  @Get('login/google')
  @UseGuards(GoogleAuthGuard)
  loginGoogle(): void {
    // GoogleAuthGuard redirects to Google's consent screen
  }

  @Get('login/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const profile = req.user as GoogleProfile;
    const requestId =
      typeof req.query.state === 'string' ? req.query.state : '';
    const redirectUrl = await this.authService.completeGoogleLogin(
      requestId,
      profile,
    );
    res.redirect(redirectUrl);
  }
}
