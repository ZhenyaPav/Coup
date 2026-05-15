import { describe, expect, it } from 'vitest';
import { buildServer } from '../src/app.js';

describe('server api', () => {
  it('returns health', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('serves rules markdown', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/api/rules' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/markdown');
    expect(res.body).toContain('# Coup AI Rules');
  });

  it('serves rules markdown with forwarded public base url', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'GET',
      url: '/api/rules',
      headers: {
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'coup.k8s.pve.internal'
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('https://coup.k8s.pve.internal/api/game/new');
    expect(res.body).not.toContain('http://localhost:8080/api/game/new');
  });

  it('falls back to configured public base url when forwarded headers are absent', async () => {
    const previous = process.env.PUBLIC_BASE_URL;
    process.env.PUBLIC_BASE_URL = 'http://coup.k8s.pve.internal/';
    try {
      const app = await buildServer();
      const res = await app.inject({ method: 'GET', url: '/api/rules' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('http://coup.k8s.pve.internal/api/game/new');
      expect(res.body).not.toContain('http://localhost:8080/api/game/new');
    } finally {
      if (previous === undefined) {
        delete process.env.PUBLIC_BASE_URL;
      } else {
        process.env.PUBLIC_BASE_URL = previous;
      }
    }
  });

  it('enforces out of turn action', async () => {
    const app = await buildServer();
    await app.inject({ method: 'POST', url: '/api/game/new', payload: { startingPlayer: 'human', viewer: 'human' } });

    const res = await app.inject({
      method: 'POST',
      url: '/api/game/action',
      payload: { viewer: 'ai', move: { type: 'declare_action', action: 'income' } }
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('NOT_YOUR_TURN');
  });

  it('returns masked opponent cards in state view', async () => {
    const app = await buildServer();
    await app.inject({ method: 'POST', url: '/api/game/new', payload: { viewer: 'human' } });

    const res = await app.inject({ method: 'GET', url: '/api/game/state?viewer=human' });
    expect(res.statusCode).toBe(200);

    const payload = res.json() as { state: { players: { ai: { cards: Array<{ character?: string }> } } } };
    const hidden = payload.state.players.ai.cards.filter((c) => !c.character);
    expect(hidden.length).toBeGreaterThan(0);
  });

  it('returns masked human cards when a new game is created for ai viewer', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/api/game/new',
      payload: { startingPlayer: 'human', viewer: 'ai' }
    });
    expect(res.statusCode).toBe(200);

    const payload = res.json() as { state: { players: { human: { cards: Array<{ character?: string }> } } } };
    const leaked = payload.state.players.human.cards.filter((c) => c.character);
    expect(leaked).toHaveLength(0);
  });

  it('does not expose opponent hidden card ids in state view', async () => {
    const app = await buildServer();
    await app.inject({ method: 'POST', url: '/api/game/new', payload: { startingPlayer: 'human', viewer: 'ai' } });

    const res = await app.inject({ method: 'GET', url: '/api/game/state?viewer=ai' });
    expect(res.statusCode).toBe(200);

    const payload = res.json() as { state: { players: { human: { cards: Array<{ id: string; character?: string }> } } } };
    for (const card of payload.state.players.human.cards) {
      expect(card.character).toBeUndefined();
      expect(card.id).toMatch(/^hidden-human-\d+$/);
    }
  });
});
