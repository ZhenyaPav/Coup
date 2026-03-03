export type PlayerId = 'human' | 'ai';

export type Character =
  | 'duke'
  | 'assassin'
  | 'captain'
  | 'ambassador'
  | 'contessa';

export type ActionType =
  | 'income'
  | 'foreign_aid'
  | 'coup'
  | 'tax'
  | 'assassinate'
  | 'steal'
  | 'exchange';

export type Phase =
  | 'await_action'
  | 'await_action_response'
  | 'await_block_response'
  | 'resolve'
  | 'game_over';

export interface InfluenceCard {
  id: string;
  character: Character;
  revealed: boolean;
}

export interface PlayerState {
  id: PlayerId;
  coins: number;
  cards: InfluenceCard[];
  alive: boolean;
}

export interface LogEntry {
  turn: number;
  actor: PlayerId | 'system';
  type: string;
  message: string;
}

export interface PendingAction {
  actor: PlayerId;
  target: PlayerId | undefined;
  action: ActionType;
  claimedCharacter: Character | undefined;
  coinCostPaid: number;
  challengeWindowOpen: boolean;
  blockWindowOpen: boolean;
  challenged: boolean;
}

export interface PendingBlock {
  blocker: PlayerId;
  blockCharacter: Character;
  challenged: boolean;
}

export type ContinuationType =
  | 'end_turn'
  | 'continue_action_after_challenge'
  | 'resolve_action_after_no_block'
  | 'resolve_action_after_block_failed'
  | 'action_failed'
  | 'block_succeeds';

export interface PendingReveal {
  player: PlayerId;
  reason: string;
  continuation: ContinuationType;
}

export interface PendingExchange {
  player: PlayerId;
  drawn: InfluenceCard[];
}

export interface GameState {
  players: Record<PlayerId, PlayerState>;
  treasuryCoins: number;
  courtDeck: InfluenceCard[];
  currentPlayer: PlayerId;
  phase: Phase;
  pendingAction: PendingAction | undefined;
  pendingBlock: PendingBlock | undefined;
  pendingReveal: PendingReveal | undefined;
  pendingExchange: PendingExchange | undefined;
  winner: PlayerId | undefined;
  turnNumber: number;
  log: LogEntry[];
}

export type Move =
  | { type: 'declare_action'; action: ActionType; target?: PlayerId }
  | { type: 'challenge_action' }
  | { type: 'block'; as: Character }
  | { type: 'challenge_block' }
  | { type: 'allow' }
  | { type: 'choose_influence_to_reveal'; cardId: string }
  | { type: 'choose_exchange'; keepCardIds: string[] };

export interface EngineError {
  code: 'NOT_YOUR_TURN' | 'ILLEGAL_MOVE' | 'GAME_OVER';
  message: string;
}

export interface MoveResult {
  ok: boolean;
  error?: EngineError;
}

export interface SerializedPlayer {
  id: PlayerId;
  coins: number;
  alive: boolean;
  cards: Array<{
    id: string;
    character?: Character;
    revealed: boolean;
  }>;
}

export interface GameStateView {
  phase: Phase;
  currentPlayer: PlayerId;
  winner: PlayerId | undefined;
  turnNumber: number;
  pendingAction: Omit<PendingAction, 'claimedCharacter'> & { claimedCharacter: Character | undefined } | undefined;
  pendingBlock: PendingBlock | undefined;
  players: Record<PlayerId, SerializedPlayer>;
  legalMoves: Move[];
  isYourTurn: boolean;
  nextInstruction: string;
  waitingReason: string | undefined;
  log: LogEntry[];
}
