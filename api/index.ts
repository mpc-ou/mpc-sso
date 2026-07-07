import type { IncomingMessage, ServerResponse } from 'node:http';
import serverlessHttp from 'serverless-http';
import type { NestExpressApplication } from '@nestjs/platform-express';

type ServerlessHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<unknown>;

let cachedHandler: ServerlessHandler | null = null;

async function getHandler(): Promise<ServerlessHandler> {
  if (!cachedHandler) {
    const { createApp } = (await import('../dist/src/create-app.js')) as {
      createApp: () => Promise<NestExpressApplication>;
    };
    const app = await createApp();
    await app.init();
    cachedHandler = serverlessHttp(
      app.getHttpAdapter().getInstance() as Parameters<typeof serverlessHttp>[0],
    );
  }
  return cachedHandler;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<unknown> {
  const serverless = await getHandler();
  return serverless(req, res);
}
