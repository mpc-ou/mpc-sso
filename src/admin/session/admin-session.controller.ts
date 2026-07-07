import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ADMIN_SESSION_COOKIE,
  AdminSessionGuard,
  type AdminSessionUser,
} from '../../auth/guards/admin-session.guard';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminSessionService } from './admin-session.service';

@Controller('admin/ui')
export class AdminSessionController {
  constructor(private readonly sessionService: AdminSessionService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const { sessionId, expiresAt } = await this.sessionService.login(dto);

    res.cookie(ADMIN_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      path: '/',
    });

    return { message: 'Logged in' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminSessionGuard)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const adminUser = (req as Request & { adminUser: AdminSessionUser })
      .adminUser;
    await this.sessionService.logout(adminUser.sessionId);
    res.clearCookie(ADMIN_SESSION_COOKIE, { path: '/' });
    return { message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(AdminSessionGuard)
  me(@Req() req: Request) {
    const adminUser = (req as Request & { adminUser: AdminSessionUser })
      .adminUser;
    return this.sessionService.getMe(adminUser.userId);
  }
}
