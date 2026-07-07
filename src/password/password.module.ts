import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { PasswordController } from './password.controller';
import { PasswordService } from './password.service';

@Module({
  controllers: [PasswordController],
  providers: [PasswordService, MailerService],
})
export class PasswordModule {}
