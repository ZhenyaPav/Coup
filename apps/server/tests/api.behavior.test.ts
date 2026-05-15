import { describe, expect, it } from 'vitest';
import { buildServer } from '../src/app.js';

describe('server behavior', () => {
  it('returns 400 for invalid viewer', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/api/game/state?viewer=bot' });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('BAD_REQUEST');
  });

  it('returns ILLEGAL_MOVE when move is not legal in current phase', async () => {
    const app = await buildServer();
    await app.inject({ method: 'POST', url: '/api/game/new', payload: { startingPlayer: 'human', viewer: 'human' } });

    const res = await app.inject({
      method: 'POST',
      url: '/api/game/action',
      payload: { viewer: 'human', move: { type: 'challenge_action' } }
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().code).toBe('ILLEGAL_MOVE');
  });

  it('state response includes legal moves and turn flag', async () => {
    const app = await buildServer();
    await app.inject({ method: 'POST', url: '/api/game/new', payload: { startingPlayer: 'human', viewer: 'human' } });

    const res = await app.inject({ method: 'GET', url: '/api/game/state?viewer=human' });
    expect(res.statusCode).toBe(200);

    const payload = res.json() as { state: { isYourTurn: boolean; legalMoves: unknown[] } };
    expect(payload.state.isYourTurn).toBe(true);
    expect(payload.state.legalMoves.length).toBeGreaterThan(0);
  });
});
