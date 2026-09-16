import { Module } from '@nestjs/common';
import { EventsModule } from '../../events/events.module';
import { DiscordController } from './discord.controller';
import { DiscordService } from './discord.service';

@Module({
  imports: [EventsModule],
  controllers: [DiscordController],
  providers: [DiscordService],
})
export class DiscordModule {}
