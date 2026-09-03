import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'node:path';
import { WEB_UI_DIST } from '../lib/paths';

@Controller('profile/ui')
export class ProfileUiController {
  @Get()
  serveRoot(@Res() res: Response): void {
    res.sendFile(join(WEB_UI_DIST, 'profile.html'));
  }

  @Get('*splat')
  serveSpaFallback(@Res() res: Response): void {
    res.sendFile(join(WEB_UI_DIST, 'profile.html'));
  }
}
