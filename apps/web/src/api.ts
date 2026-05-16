export type PlayerId = 'human' | 'ai';

export type Move =
  | { type: 'declare_action'; action: string; target?: PlayerId }
  | { type: 'challenge_action' }
  | { type: 'block'; as: string }
  | { type: 'challenge_block' }
  | { type: 'allow' }
  | { type: 'choose_influence_to_reveal'; cardId: string }
  | { type: 'choose_exchange'; keepCardIds: string[] };

export interface GameStateResponse {
  gameId: string;
  state: {
    phase: string;
    currentPlayer: PlayerId;
    winner?: PlayerId;
    turnNumber: number;
    isYourTurn: boolean;
    waitingReason?: string;
    nextInstruction: string;
    legalMoves: Move[];
    pendingExchange?: {
      player: PlayerId;
      drawn: Array<{ id: string; character?: string; revealed: boolean }>;
    };
    players: Record<
      PlayerId,
      {
        id: PlayerId;
        coins: number;
        alive: boolean;
        cards: Array<{ id: string; character?: string; revealed: boolean }>;
      }
    >;
    log: Array<{ turn: number; actor: string; type: string; message: string }>;
  };
}

async function parseJson<T>(res: Response): Promise<T> {
  const payload = await res.json();
  if (!res.ok) {
    const message = (payload && payload.message) || 'Request failed';
    throw new Error(message);
  }
  return payload as T;
}

export async function newGame(startingPlayer: PlayerId = 'human'): Promise<GameStateResponse> {
  const res = await fetch('/api/game/new', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startingPlayer, viewer: 'human' })
  });
  return parseJson<GameStateResponse>(res);
}

export async function getState(viewer: PlayerId): Promise<GameStateResponse> {
  const res = await fetch(`/api/game/state?viewer=${viewer}`);
  return parseJson<GameStateResponse>(res);
}

export async function submitAction(viewer: PlayerId, move: Move): Promise<GameStateResponse> {
  const res = await fetch('/api/game/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ viewer, move })
  });
  return parseJson<GameStateResponse>(res);
}

export async function getRulesMarkdown(): Promise<string> {
  const res = await fetch('/api/rules');
  const body = await res.text();
  if (!res.ok) {
    throw new Error(body || 'Failed to fetch rules markdown');
  }
  return body;
}
