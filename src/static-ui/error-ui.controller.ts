import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'node:path';
import { WEB_UI_DIST } from '../lib/paths';

@Controller('error')
export class ErrorUiController {
  @Get()
  serveRoot(@Res() res: Response): void {
    res.sendFile(join(WEB_UI_DIST, 'error.html'));
  }
}
