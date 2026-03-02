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

  it('enforces out of turn action', async () => {
    const app = await buildServer();
    await app.inject({ method: 'POST', url: '/api/game/new', payload: { startingPlayer: 'human' } });

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
    await app.inject({ method: 'POST', url: '/api/game/new' });

    const res = await app.inject({ method: 'GET', url: '/api/game/state?viewer=human' });
    expect(res.statusCode).toBe(200);

    const payload = res.json() as { state: { players: { ai: { cards: Array<{ character?: string }> } } } };
    const hidden = payload.state.players.ai.cards.filter((c) => !c.character);
    expect(hidden.length).toBeGreaterThan(0);
  });
});
