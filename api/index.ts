import type { IncomingMessage, ServerResponse } from 'node:http';
import serverlessHttp from 'serverless-http';
import { createApp } from '../src/create-app';

type ServerlessHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<unknown>;

let cachedHandler: ServerlessHandler | null = null;

async function getHandler(): Promise<ServerlessHandler> {
  if (!cachedHandler) {
    const app = await createApp();
    await app.init();
    cachedHandler = serverlessHttp(app.getHttpAdapter().getInstance());
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
