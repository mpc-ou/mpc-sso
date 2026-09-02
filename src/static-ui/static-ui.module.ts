import { Module } from '@nestjs/common';
import { ProfileUiController } from './profile-ui.controller';
import { StaticUiController } from './static-ui.controller';

@Module({
  controllers: [ProfileUiController, StaticUiController],
})
export class StaticUiModule {}
