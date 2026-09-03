import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { BilingualErrorBody } from '../errors';
import { bilingual } from '../errors';

/**
 * GET routes that are always reached by a top-level browser navigation
 * (redirects from /login or Discord), never by fetch/XHR — an exception
 * here must land the user on a real page instead of raw JSON in the tab.
 */
const BROWSER_REDIRECT_ROUTES = new Set([
  '/login/self',
  '/login/self/callback',
  '/connect/discord',
  '/connect/discord/callback',
]);

function isBilingualErrorBody(body: unknown): body is BilingualErrorBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    'error_i18n' in body
  );
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    if (!isHttpException) {
      this.logger.error(exception);
    }

    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException
      ? exception.getResponse()
      : bilingual('internal_server_error');

    if (
      request.method === 'GET' &&
      BROWSER_REDIRECT_ROUTES.has(request.path) &&
      isBilingualErrorBody(body)
    ) {
      const params = new URLSearchParams({
        code: body.error,
        vi: body.error_i18n.vi,
        en: body.error_i18n.en,
      });
      response.redirect(`/error?${params.toString()}`);
      return;
    }

    response.status(status).json(body);
  }
}
