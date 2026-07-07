import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { AccessTokenData } from '../guards/bearer-auth.guard';

/** Reads the token data attached by BearerAuthGuard (req.tokenData) */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenData => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as Request & { tokenData: AccessTokenData }).tokenData;
  },
);
