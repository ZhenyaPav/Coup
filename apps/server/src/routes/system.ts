import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';

const here = dirname(fileURLToPath(import.meta.url));

async function readRulesMarkdown(): Promise<string> {
  const candidates = process.env.RULES_PATH
    ? [process.env.RULES_PATH]
    : [
        resolve(process.cwd(), 'docs/coup-rules.md'),
        resolve(here, '../../../../docs/coup-rules.md')
      ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf8');
    } catch (_error) {
      // Try the next known runtime layout.
    }
  }

  throw new Error('Rules markdown not found.');
}

export async function registerSystemRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/health', async () => ({ ok: true }));

  app.get('/api/rules', async (_request, reply) => {
    try {
      const markdown = await readRulesMarkdown();
      return reply.type('text/markdown; charset=utf-8').send(markdown);
    } catch (_error) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Rules markdown not found.' });
    }
  });
}
