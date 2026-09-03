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
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientsService } from './clients.service';

@Controller('admin/clients')
@UseGuards(AdminGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(@Body() dto: CreateClientDto, @Req() req: Request) {
    return this.clientsService.create(dto, actorIdFrom(req), req.ip);
  }

  @Get()
  list() {
    return this.clientsService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @Req() req: Request,
  ) {
    return this.clientsService.update(id, dto, actorIdFrom(req), req.ip);
  }

  @Delete('bulk')
  bulkDelete(@Body('ids') ids: string[], @Req() req: Request) {
    return this.clientsService.bulkDelete(ids, actorIdFrom(req), req.ip);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.clientsService.remove(id, actorIdFrom(req), req.ip);
  }
}
