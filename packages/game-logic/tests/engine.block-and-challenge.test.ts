import { describe, expect, it } from 'vitest';
import { CoupEngine } from '../src/engine.js';

describe('CoupEngine blocks and challenges', () => {
  it('prevents foreign aid when blocked and actor allows block', () => {
    const engine = new CoupEngine(() => 0.4);
    const state = engine.newGame('human');

    const beforeCoins = state.players.human.coins;

    expect(engine.applyMove('human', { type: 'declare_action', action: 'foreign_aid' }).ok).toBe(true);
    expect(state.phase).toBe('await_action_response');

    expect(engine.applyMove('ai', { type: 'block', as: 'duke' }).ok).toBe(true);
    expect(state.phase).toBe('await_block_response');

    expect(engine.applyMove('human', { type: 'allow' }).ok).toBe(true);

    expect(state.players.human.coins).toBe(beforeCoins);
    expect(state.currentPlayer).toBe('ai');
    expect(state.phase).toBe('await_action');
  });

  it('refunds assassination cost when action claim fails under challenge', () => {
    const engine = new CoupEngine(() => 0.5);
    const state = engine.newGame('human');

    state.players.human.coins = 3;
    state.players.human.cards[0]!.character = 'duke';
    state.players.human.cards[0]!.revealed = false;
    state.players.human.cards[1]!.character = 'captain';
    state.players.human.cards[1]!.revealed = false;

    expect(engine.applyMove('human', { type: 'declare_action', action: 'assassinate', target: 'ai' }).ok).toBe(true);
    expect(state.players.human.coins).toBe(0);

    expect(engine.applyMove('ai', { type: 'challenge_action' }).ok).toBe(true);
    expect(state.players.human.coins).toBe(3);
    expect(state.pendingReveal?.player).toBe('human');

    const reveal = engine.getLegalMoves('human')[0];
    expect(reveal?.type).toBe('choose_influence_to_reveal');
    expect(engine.applyMove('human', reveal!).ok).toBe(true);

    expect(state.currentPlayer).toBe('ai');
    expect(state.phase).toBe('await_action');
  });

  it('auto-reveals when only one hidden influence remains', () => {
    const engine = new CoupEngine(() => 0.5);
    const state = engine.newGame('human');

    state.players.human.coins = 7;
    state.players.ai.cards[0]!.revealed = true;
    state.players.ai.cards[1]!.revealed = false;

    expect(engine.applyMove('human', { type: 'declare_action', action: 'coup', target: 'ai' }).ok).toBe(true);

    expect(state.pendingReveal).toBeUndefined();
    expect(state.phase).toBe('game_over');
    expect(state.winner).toBe('human');
  });
});
