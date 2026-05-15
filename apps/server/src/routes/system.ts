import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance, FastifyRequest } from 'fastify';

const here = dirname(fileURLToPath(import.meta.url));
const defaultPublicBaseUrl = 'http://localhost:8080';

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

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.split(',')[0]?.trim();
}

function publicBaseUrl(request: FastifyRequest): string {
  const forwardedProto = firstHeaderValue(request.headers['x-forwarded-proto']);
  const forwardedHost = firstHeaderValue(request.headers['x-forwarded-host']);

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, '');
  }

  return (process.env.PUBLIC_BASE_URL ?? defaultPublicBaseUrl).replace(/\/+$/, '');
}

function renderRulesMarkdown(markdown: string, request: FastifyRequest): string {
  return markdown.replaceAll(defaultPublicBaseUrl, publicBaseUrl(request));
}

export async function registerSystemRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/health', async () => ({ ok: true }));

  app.get('/api/rules', async (request, reply) => {
    try {
      const markdown = await readRulesMarkdown();
      return reply.type('text/markdown; charset=utf-8').send(renderRulesMarkdown(markdown, request));
    } catch (_error) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Rules markdown not found.' });
    }
  });
}
