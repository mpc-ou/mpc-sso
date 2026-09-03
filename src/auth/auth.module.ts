import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { EventsModule } from '../events/events.module';
import { TokenModule } from '../token/token.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [PassportModule, TokenModule, EventsModule],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy],
})
export class AuthModule {}
