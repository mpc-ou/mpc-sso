import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type { AppConfig } from '../../config/config';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Protects /api/* service-to-service endpoints via the `X-Service-Key` header (see PLAN.md §4.3) */
@Injectable()
export class ServiceKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.header('X-Service-Key');
    const expected = this.configService.get('serviceApiKey', { infer: true });

    if (!key || !safeEqual(key, expected)) {
      throw new UnauthorizedException(
        'Invalid or missing X-Service-Key header',
      );
    }
    return true;
  }
}
