import { describe, expect, it } from 'vitest';
import { CoupEngine } from '../src/engine.js';

function firstLegal(engine: CoupEngine, player: 'human' | 'ai') {
  const moves = engine.getLegalMoves(player);
  expect(moves.length).toBeGreaterThan(0);
  return moves[0]!;
}

describe('CoupEngine', () => {
  it('creates a two-player game with 1 coin for starting player', () => {
    const engine = new CoupEngine(() => 0.5);
    const state = engine.newGame('human');

    expect(state.players.human.coins).toBe(1);
    expect(state.players.ai.coins).toBe(2);
    expect(state.players.human.cards).toHaveLength(2);
    expect(state.players.ai.cards).toHaveLength(2);
    expect(state.courtDeck).toHaveLength(11);
  });

  it('enforces forced coup at 10+ coins', () => {
    const engine = new CoupEngine(() => 0.5);
    const state = engine.newGame('human');
    state.players.human.coins = 10;

    const moves = engine.getLegalMoves('human');
    expect(moves).toEqual([{ type: 'declare_action', action: 'coup', target: 'ai' }]);
  });

  it('returns not your turn for out-of-turn action', () => {
    const engine = new CoupEngine(() => 0.5);
    engine.newGame('human');

    const result = engine.applyMove('ai', { type: 'declare_action', action: 'income' });
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('NOT_YOUR_TURN');
  });

  it('resolves basic income and switches turn', () => {
    const engine = new CoupEngine(() => 0.5);
    const state = engine.newGame('human');

    const before = state.players.human.coins;
    const result = engine.applyMove('human', { type: 'declare_action', action: 'income' });
    expect(result.ok).toBe(true);
    expect(state.players.human.coins).toBe(before + 1);
    expect(state.currentPlayer).toBe('ai');
    expect(state.phase).toBe('await_action');
  });

  it('supports challenge flow for a claimed action', () => {
    const engine = new CoupEngine(() => 0.3);
    const state = engine.newGame('human');
    state.players.human.cards[0]!.character = 'duke';
    state.players.human.cards[0]!.revealed = false;

    const declared = engine.applyMove('human', { type: 'declare_action', action: 'tax' });
    expect(declared.ok).toBe(true);

    const challenged = engine.applyMove('ai', { type: 'challenge_action' });
    expect(challenged.ok).toBe(true);

    const revealPlayer = engine.getState().pendingReveal?.player;
    expect(revealPlayer).toBe('ai');

    const revealMove = firstLegal(engine, 'ai');
    const revealed = engine.applyMove('ai', revealMove);
    expect(revealed.ok).toBe(true);
  });

  it('shows exchange draws only to the exchanging player', () => {
    const engine = new CoupEngine(() => 0.3);
    engine.newGame('human');

    expect(engine.applyMove('human', { type: 'declare_action', action: 'exchange' }).ok).toBe(true);
    expect(engine.applyMove('ai', { type: 'allow' }).ok).toBe(true);

    const humanView = engine.getView('human');
    expect(humanView.pendingExchange?.player).toBe('human');
    expect(humanView.pendingExchange?.drawn).toHaveLength(2);
    expect(humanView.pendingExchange?.drawn.every((card) => card.character && !card.revealed)).toBe(true);

    const aiView = engine.getView('ai');
    expect(aiView.pendingExchange?.player).toBe('human');
    expect(aiView.pendingExchange?.drawn).toHaveLength(2);
    expect(aiView.pendingExchange?.drawn.every((card) => !card.character && !card.revealed)).toBe(true);
  });
});
