import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'node:path';
import { WEB_UI_DIST } from '../lib/paths';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordService } from './password.service';

@Controller('password')
export class PasswordController {
  constructor(private readonly passwordService: PasswordService) {}

  @Get('reset')
  serveResetPage(@Res() res: Response): void {
    res.sendFile(join(WEB_UI_DIST, 'login.html'));
  }

  @Post('forgot')
  @HttpCode(HttpStatus.OK)
  async forgot(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.passwordService.forgot(dto.email);
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async reset(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.passwordService.reset(dto.token, dto.newPassword);
    return { message: 'Password updated successfully.' };
  }
}
