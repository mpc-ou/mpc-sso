import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  type AccessTokenData,
  BearerAuthGuard,
} from '../common/guards/bearer-auth.guard';
import { UserinfoService } from './userinfo.service';

@Controller('userinfo')
@UseGuards(BearerAuthGuard)
export class UserinfoController {
  constructor(private readonly userinfoService: UserinfoService) {}

  @Get()
  getUserinfo(@CurrentUser() tokenData: AccessTokenData) {
    return this.userinfoService.getUserinfo(tokenData);
  }
}
