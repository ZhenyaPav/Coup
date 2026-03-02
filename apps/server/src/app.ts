import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerActionRoutes } from './routes/actions.js';
import { createGameContext, registerGameRoutes } from './routes/game.js';
import { registerSystemRoutes } from './routes/system.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const ctx = createGameContext();

  await app.register(cors, { origin: true });
  await registerSystemRoutes(app);
  await registerGameRoutes(app, ctx);
  await registerActionRoutes(app, ctx);

  const webDist = process.env.WEB_DIST_DIR ?? resolve(process.cwd(), 'apps/web/dist');
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, {
      root: webDist,
      prefix: '/'
    });

    app.setNotFoundHandler(async (request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api/')) {
        return reply.type('text/html').sendFile('index.html');
      }
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Not found' });
    });
  }

  return app;
}

async function start(): Promise<void> {
  const app = await buildServer();
  const port = Number(process.env.PORT ?? '8080');
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen({ host, port });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
