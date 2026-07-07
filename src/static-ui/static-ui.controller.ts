import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'node:path';
import { WEB_UI_DIST } from '../lib/paths';

@Controller('admin/ui')
export class StaticUiController {
  @Get('login')
  serveLogin(@Res() res: Response): void {
    res.sendFile(join(WEB_UI_DIST, 'login.html'));
  }

  @Get()
  serveRoot(@Res() res: Response): void {
    res.sendFile(join(WEB_UI_DIST, 'index.html'));
  }

  @Get('*splat')
  serveSpaFallback(@Res() res: Response): void {
    res.sendFile(join(WEB_UI_DIST, 'index.html'));
  }
}
