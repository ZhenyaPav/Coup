import type { EngineError, Move, PlayerId } from '@coup/game-logic';

export function parseViewer(value: unknown): PlayerId | undefined {
  if (value === 'human' || value === 'ai') return value;
  return undefined;
}

export function parseMove(value: unknown): Move | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const move = value as Move;
  if (typeof move.type !== 'string') return undefined;
  return move;
}

export function toHttpStatus(error: EngineError): number {
  if (error.code === 'NOT_YOUR_TURN') return 409;
  if (error.code === 'GAME_OVER') return 409;
  return 422;
}
