import type { GameState, Phase } from './types.js';

export function setPhase(state: GameState, phase: Phase): void {
  state.phase = phase;
}

export function clearPending(state: GameState): void {
  state.pendingAction = undefined;
  state.pendingBlock = undefined;
}
