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
} from '@nestjs/common';
import type { Request } from 'express';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { actorIdFrom } from '../../common/admin-actor';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CreateClubRoleDto } from './dto/create-club-role.dto';
import { UpdateClubRoleDto } from './dto/update-club-role.dto';
import { ClubRolesService } from './club-roles.service';

@Controller('admin/club-roles')
@UseGuards(AdminGuard)
export class ClubRolesController {
  constructor(private readonly clubRolesService: ClubRolesService) {}

  @Post()
  create(@Body() dto: CreateClubRoleDto, @Req() req: Request) {
    return this.clubRolesService.create(dto, actorIdFrom(req), req.ip);
  }

  @Get()
  list(@Query() pagination: PaginationDto) {
    return this.clubRolesService.list(pagination);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClubRoleDto,
    @Req() req: Request,
  ) {
    return this.clubRolesService.update(id, dto, actorIdFrom(req), req.ip);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.clubRolesService.remove(id, actorIdFrom(req), req.ip);
  }
}
