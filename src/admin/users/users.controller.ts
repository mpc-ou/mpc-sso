import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { actorIdFrom } from '../../common/admin-actor';
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
  create(@Body() dto: CreateUserDto, @Req() req: Request) {
    return this.usersService.create(dto, actorIdFrom(req), req.ip);
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

  @Get('ids')
  listIds(@Query() query: UserQueryDto) {
    return this.usersService.listIds(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('lock-all')
  lockAll(
    @Body('isProfileLocked') isProfileLocked: boolean,
    @Req() req: Request,
  ) {
    return this.usersService.bulkSetProfileLocked(
      isProfileLocked,
      actorIdFrom(req),
      req.ip,
    );
  }

  @Patch('bulk-lock')
  bulkLock(
    @Body('ids') ids: string[],
    @Body('isProfileLocked') isProfileLocked: boolean,
    @Req() req: Request,
  ) {
    return this.usersService.bulkSetProfileLockedForIds(
      ids,
      isProfileLocked,
      actorIdFrom(req),
      req.ip,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    return this.usersService.update(id, dto, actorIdFrom(req), req.ip);
  }

  @Delete('bulk')
  bulkDelete(@Body('ids') ids: string[], @Req() req: Request) {
    return this.usersService.bulkDelete(ids, actorIdFrom(req), req.ip);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.usersService.delete(id, actorIdFrom(req), req.ip);
  }
}
