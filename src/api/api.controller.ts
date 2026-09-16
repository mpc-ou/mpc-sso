import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ServiceKeyGuard } from '../common/guards/service-key.guard';
import { ApiService } from './api.service';
import { UpdateDiscordDto } from './dto/update-discord.dto';

@Controller('api')
@UseGuards(ServiceKeyGuard)
export class ApiController {
  constructor(private readonly apiService: ApiService) {}

  @Get('users')
  listUsers(@Query() pagination: PaginationDto) {
    return this.apiService.listUsers(pagination);
  }

  @Get(['users/discord/:discordId', 'users/by-discord/:discordId'])
  getUserByDiscordId(@Param('discordId') discordId: string) {
    return this.apiService.getUserByDiscordId(discordId);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.apiService.getUser(id);
  }

  @Patch(['users/:id/discord', 'users/discord/:id'])
  updateDiscordIdByUser(
    @Param('id') id: string,
    @Body() dto: UpdateDiscordDto,
    @Req() req: Request,
  ) {
    return this.apiService.updateDiscordIdByUser(id, dto, req.ip);
  }

  @Get('members')
  listMembers(@Query() pagination: PaginationDto) {
    return this.apiService.listMembers(pagination);
  }

  @Get('members/:id')
  getMember(@Param('id') id: string) {
    return this.apiService.getMember(id);
  }
}
