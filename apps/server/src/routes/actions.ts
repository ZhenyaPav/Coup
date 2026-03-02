import type { CoupEngine } from '@coup/game-logic';
import type { FastifyInstance } from 'fastify';
import { parseMove, parseViewer, toHttpStatus } from '../serialize.js';

export async function registerActionRoutes(app: FastifyInstance, ctx: { engine: CoupEngine }): Promise<void> {
  app.post('/api/game/action', async (request, reply) => {
    const body = (request.body ?? {}) as { viewer?: 'human' | 'ai'; move?: unknown };
    const viewer = parseViewer(body.viewer);
    const move = parseMove(body.move);

    if (!viewer || !move) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'Invalid viewer or move payload.' });
    }

    const result = ctx.engine.applyMove(viewer, move);
    if (!result.ok && result.error) {
      return reply.status(toHttpStatus(result.error)).send(result.error);
    }

    return reply.send({
      gameId: 'default',
      state: ctx.engine.getView(viewer)
    });
  });
}
