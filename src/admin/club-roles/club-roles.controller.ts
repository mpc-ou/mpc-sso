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
} from '@nestjs/common';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CreateClubRoleDto } from './dto/create-club-role.dto';
import { UpdateClubRoleDto } from './dto/update-club-role.dto';
import { ClubRolesService } from './club-roles.service';

@Controller('admin/club-roles')
@UseGuards(AdminGuard)
export class ClubRolesController {
  constructor(private readonly clubRolesService: ClubRolesService) {}

  @Post()
  create(@Body() dto: CreateClubRoleDto) {
    return this.clubRolesService.create(dto);
  }

  @Get()
  list(@Query() pagination: PaginationDto) {
    return this.clubRolesService.list(pagination);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClubRoleDto) {
    return this.clubRolesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clubRolesService.remove(id);
  }
}
