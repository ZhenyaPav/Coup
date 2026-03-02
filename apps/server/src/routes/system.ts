import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';

export async function registerSystemRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/health', async () => ({ ok: true }));

  app.get('/api/rules', async (_request, reply) => {
    const rulesPath = process.env.RULES_PATH ?? resolve(process.cwd(), 'docs/coup-rules.md');
    try {
      const markdown = await readFile(rulesPath, 'utf8');
      return reply.type('text/markdown; charset=utf-8').send(markdown);
    } catch (_error) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Rules markdown not found.' });
    }
  });
}
