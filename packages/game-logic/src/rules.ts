import type { ActionType, Character, PlayerId } from './types.js';

export const ACTION_CLAIMS: Partial<Record<ActionType, Character>> = {
  tax: 'duke',
  assassinate: 'assassin',
  steal: 'captain',
  exchange: 'ambassador'
};

export function actionCost(action: ActionType): number {
  if (action === 'coup') return 7;
  if (action === 'assassinate') return 3;
  return 0;
}

export function actionRequiresTarget(action: ActionType): boolean {
  return action === 'coup' || action === 'assassinate' || action === 'steal';
}

export function canBeBlocked(action: ActionType): boolean {
  return action === 'foreign_aid' || action === 'assassinate' || action === 'steal';
}

export function validBlockCharacters(action: ActionType): Character[] {
  if (action === 'foreign_aid') return ['duke'];
  if (action === 'assassinate') return ['contessa'];
  if (action === 'steal') return ['captain', 'ambassador'];
  return [];
}

export function blockMustBeTarget(action: ActionType): boolean {
  return action === 'assassinate' || action === 'steal';
}

export function oppositePlayer(player: PlayerId): PlayerId {
  return player === 'human' ? 'ai' : 'human';
}

export function actionCoinDelta(action: ActionType): number {
  if (action === 'income') return 1;
  if (action === 'foreign_aid') return 2;
  if (action === 'tax') return 3;
  return 0;
}
