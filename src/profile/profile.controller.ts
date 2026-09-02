import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AccessTokenData } from '../common/guards/bearer-auth.guard';
import { SelfAuthGuard } from '../auth/guards/self-auth.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@Controller('profile')
@UseGuards(SelfAuthGuard)
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

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

  @Post('upload-avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser() tokenData: AccessTokenData,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const current = await this.profileService.getProfile(tokenData.userId);
    if (current.avatar) {
      try {
        await this.cloudinaryService.deleteFile(current.avatar);
      } catch (err) {
        console.error('Failed to delete old avatar from Cloudinary:', err);
      }
    }

    const result = (await this.cloudinaryService.uploadFile(file)) as {
      secure_url: string;
    };
    await this.profileService.updateProfile(tokenData.userId, {
      avatar: result.secure_url,
    });
    return { url: result.secure_url };
  }
}
