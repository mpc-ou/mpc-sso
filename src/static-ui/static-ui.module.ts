import { Module } from '@nestjs/common';
import { ErrorUiController } from './error-ui.controller';
import { ProfileUiController } from './profile-ui.controller';
import { StaticUiController } from './static-ui.controller';

@Module({
  controllers: [ErrorUiController, ProfileUiController, StaticUiController],
})
export class StaticUiModule {}
