import { CoupEngine } from '@coup/game-logic';
import type { FastifyInstance } from 'fastify';
import { parseViewer } from '../serialize.js';

export function createGameContext(): { engine: CoupEngine } {
  return { engine: new CoupEngine() };
}

export async function registerGameRoutes(app: FastifyInstance, ctx: { engine: CoupEngine }): Promise<void> {
  app.post('/api/game/new', async (request, reply) => {
    const body = (request.body ?? {}) as { startingPlayer?: 'human' | 'ai'; viewer?: 'human' | 'ai' };
    const startingPlayer = body.startingPlayer === 'ai' ? 'ai' : 'human';
    const viewer = parseViewer(body.viewer);
    if (!viewer) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'viewer must be human or ai' });
    }

    ctx.engine.newGame(startingPlayer);
    return reply.send({
      gameId: 'default',
      state: ctx.engine.getView(viewer)
    });
  });

  app.get('/api/game/state', async (request, reply) => {
    const viewer = parseViewer((request.query as { viewer?: string }).viewer);
    if (!viewer) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'viewer must be human or ai' });
    }

    return reply.send({
      gameId: 'default',
      state: ctx.engine.getView(viewer)
    });
  });
}
