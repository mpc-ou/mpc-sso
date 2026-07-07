import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  type Profile,
  type VerifyCallback,
} from 'passport-google-oauth20';
import type { AppConfig } from '../../config/config';

export interface GoogleProfile {
  googleId: string;
  email: string;
  displayName: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService<AppConfig, true>) {
    const google = configService.get('google', { infer: true });
    super({
      clientID: google.clientId || 'not-configured',
      clientSecret: google.clientSecret || 'not-configured',
      callbackURL:
        google.callbackUrl || 'http://localhost:3000/login/google/callback',
      scope: ['profile', 'email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Google account has no public email'), false);
      return;
    }

    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email: email.toLowerCase(),
      displayName: profile.displayName,
    };
    done(null, googleProfile);
  }
}
