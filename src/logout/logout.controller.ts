import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { LogoutDto } from './dto/logout.dto';
import { LogoutService } from './logout.service';

@Controller('logout')
export class LogoutController {
  constructor(private readonly logoutService: LogoutService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: LogoutDto): Promise<{ message: string }> {
    await this.logoutService.logout(dto);
    return { message: 'Logged out successfully' };
  }
}
