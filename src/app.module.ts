import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { ApiModule } from './api/api.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { configuration } from './config/config';
import { DiscoveryModule } from './discovery/discovery.module';
import { LogoutModule } from './logout/logout.module';
import { PasswordModule } from './password/password.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { StaticUiModule } from './static-ui/static-ui.module';
import { TokenModule } from './token/token.module';
import { UserinfoModule } from './userinfo/userinfo.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    DiscoveryModule,
    AuthModule,
    TokenModule,
    UserinfoModule,
    LogoutModule,
    AdminModule,
    PasswordModule,
    ProfileModule,
    ApiModule,
    // Registered last: its GET admin/ui/* wildcard must not shadow AdminModule's
    // POST admin/ui/login|logout and GET admin/ui/me routes above.
    StaticUiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
