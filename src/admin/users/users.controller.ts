import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../../common/guards/admin.guard';
import { UserQueryDto } from './dto/user-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

@Controller('admin/users')
@UseGuards(AdminGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Post('upload-avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile() file: any,
    @Query('oldUrl') oldUrl?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (oldUrl) {
      try {
        await this.cloudinaryService.deleteFile(oldUrl);
      } catch (err) {
        console.error('Failed to delete old avatar from Cloudinary:', err);
      }
    }
    const result = (await this.cloudinaryService.uploadFile(file)) as {
      secure_url: string;
    };
    return { url: result.secure_url };
  }

  @Get()
  list(@Query() query: UserQueryDto) {
    return this.usersService.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete('bulk')
  bulkDelete(@Body('ids') ids: string[]) {
    return this.usersService.bulkDelete(ids);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
