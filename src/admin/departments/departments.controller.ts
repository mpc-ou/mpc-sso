import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { actorIdFrom } from '../../common/admin-actor';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsService } from './departments.service';

@Controller('admin/departments')
@UseGuards(AdminGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  create(@Body() dto: CreateDepartmentDto, @Req() req: Request) {
    return this.departmentsService.create(dto, actorIdFrom(req), req.ip);
  }

  @Get()
  list() {
    return this.departmentsService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @Req() req: Request,
  ) {
    return this.departmentsService.update(id, dto, actorIdFrom(req), req.ip);
  }

  @Delete('bulk')
  bulkDelete(@Body('ids') ids: string[], @Req() req: Request) {
    return this.departmentsService.bulkDelete(ids, actorIdFrom(req), req.ip);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.departmentsService.remove(id, actorIdFrom(req), req.ip);
  }
}
