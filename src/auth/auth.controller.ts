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
import { SSO_SESSION_COOKIE } from './guards/self-auth.guard';
import type { GoogleProfile } from './strategies/google.strategy';
import { PrismaService } from '../prisma/prisma.service';

const PKCE_VERIFIER_COOKIE = 'mpc_pkce_v';
const PROFILE_UI_PATH = '/profile/ui';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  private isGoogleEnabled(): boolean {
    return Boolean(this.configService.get('google', { infer: true }).clientId);
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
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
  async serveLoginPage(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (typeof req.query.request_id === 'string' && req.query.request_id) {
      res.sendFile(join(WEB_UI_DIST, 'oidc-login.html'));
      return;
    }

    const sessionId = (req.cookies as Record<string, string> | undefined)?.[
      SSO_SESSION_COOKIE
    ];
    if (sessionId) {
      const session = await this.prisma.userSession.findUnique({
        where: { sessionId },
      });
      if (session && session.expiresAt >= new Date()) {
        res.redirect(PROFILE_UI_PATH);
        return;
      }
    }

    res.redirect('/login/self');
  }

  @Get('login/self')
  async initiateSelfLogin(@Res() res: Response): Promise<void> {
    const { requestId, pkceVerifier } =
      await this.authService.initiateSelfLogin();

    res.cookie(PKCE_VERIFIER_COOKIE, pkceVerifier, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isProduction(),
      maxAge: 10 * 60 * 1000,
      path: '/login',
    });

    res.redirect(`/login?request_id=${encodeURIComponent(requestId)}`);
  }

  @Get('login/self/callback')
  async completeSelfLogin(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const pkceVerifier = (req.cookies as Record<string, string> | undefined)?.[
      PKCE_VERIFIER_COOKIE
    ];

    if (!code || !pkceVerifier) {
      throw new BadRequestException(bilingual('self_login_expired'));
    }

    const { sessionId, expiresAt } = await this.authService.completeSelfLogin(
      code,
      pkceVerifier,
      req.ip,
      req.header('User-Agent'),
    );

    res.clearCookie(PKCE_VERIFIER_COOKIE, { path: '/login' });
    res.cookie(SSO_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isProduction(),
      expires: expiresAt,
      path: '/',
    });

    res.redirect(PROFILE_UI_PATH);
  }

  @Post('login/self/logout')
  @HttpCode(HttpStatus.OK)
  async logoutSelf(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const sessionId = (req.cookies as Record<string, string> | undefined)?.[
      SSO_SESSION_COOKIE
    ];
    if (sessionId) {
      await this.authService.logoutSelfSession(sessionId);
    }
    res.clearCookie(SSO_SESSION_COOKIE, { path: '/' });
    return { message: 'Logged out' };
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
  async postLogin(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<{ redirectUrl: string }> {
    const redirectUrl = await this.authService.login(
      dto,
      req.ip,
      req.header('User-Agent'),
    );
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
      req.ip,
      req.header('User-Agent'),
    );
    res.redirect(redirectUrl);
  }
}
