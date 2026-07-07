import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

/** Forwards our internal `request_id` (pending authorization) through Google's OAuth `state` param */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request.query.request_id;
    return { state: typeof requestId === 'string' ? requestId : '' };
  }
}
