import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ServiceKeyGuard } from '../common/guards/service-key.guard';
import { ApiService } from './api.service';

@Controller('api')
@UseGuards(ServiceKeyGuard)
export class ApiController {
  constructor(private readonly apiService: ApiService) {}

  @Get('users')
  listUsers(@Query() pagination: PaginationDto) {
    return this.apiService.listUsers(pagination);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.apiService.getUser(id);
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
