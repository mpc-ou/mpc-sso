import { Module } from '@nestjs/common';
import { StaticUiController } from './static-ui.controller';

@Module({
  controllers: [StaticUiController],
})
export class StaticUiModule {}
