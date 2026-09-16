import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';

@Module({
  imports: [EventsModule],
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule {}
