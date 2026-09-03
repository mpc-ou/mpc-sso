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
import { PUBLIC_EVENTS } from '../../events/events.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhooksService } from './webhooks.service';

@Controller('admin/webhooks')
@UseGuards(AdminGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('events')
  events() {
    return PUBLIC_EVENTS;
  }

  @Get()
  list() {
    return this.webhooksService.list();
  }

  @Post()
  create(@Body() dto: CreateWebhookDto, @Req() req: Request) {
    return this.webhooksService.create(dto, actorIdFrom(req));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
    @Req() req: Request,
  ) {
    return this.webhooksService.update(id, dto, actorIdFrom(req));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.webhooksService.remove(id, actorIdFrom(req));
  }

  @Get(':id/deliveries')
  deliveries(@Param('id') id: string) {
    return this.webhooksService.deliveries(id);
  }
}
