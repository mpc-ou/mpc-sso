import { Module } from '@nestjs/common';
import { UserinfoController } from './userinfo.controller';
import { UserinfoService } from './userinfo.service';

@Module({
  controllers: [UserinfoController],
  providers: [UserinfoService],
})
export class UserinfoModule {}
