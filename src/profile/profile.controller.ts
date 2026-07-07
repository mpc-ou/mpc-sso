import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  type AccessTokenData,
  BearerAuthGuard,
} from '../common/guards/bearer-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@Controller('profile')
@UseGuards(BearerAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() tokenData: AccessTokenData) {
    return this.profileService.getProfile(tokenData.userId);
  }

  @Patch()
  updateProfile(
    @CurrentUser() tokenData: AccessTokenData,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(tokenData.userId, dto);
  }
}
