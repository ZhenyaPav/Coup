import {
  ACTION_CLAIMS,
  actionCoinDelta,
  actionCost,
  actionRequiresTarget,
  blockMustBeTarget,
  canBeBlocked,
  oppositePlayer,
  validBlockCharacters
} from './rules.js';
import { shuffleInPlace, type RandomFn } from './random.js';
import { clearPending, setPhase } from './state-machine.js';
import type {
  ActionType,
  Character,
  ContinuationType,
  GameState,
  GameStateView,
  InfluenceCard,
  LogEntry,
  Move,
  MoveResult,
  PendingAction,
  PlayerId,
  PlayerState,
  SerializedPendingExchange,
  SerializedPlayer
} from './types.js';

const CHARACTERS: Character[] = ['duke', 'assassin', 'captain', 'ambassador', 'contessa'];

function cloneCard(card: InfluenceCard): InfluenceCard {
  return { ...card };
}

function cardVisibleTo(
  card: InfluenceCard,
  viewer: PlayerId,
  owner: PlayerId,
  index: number
): SerializedPlayer['cards'][number] {
  if (owner === viewer || card.revealed) {
    return { id: card.id, character: card.character, revealed: card.revealed };
  }
  return { id: `hidden-${owner}-${index}`, revealed: false };
}

function nextPlayer(player: PlayerId): PlayerId {
  return player === 'human' ? 'ai' : 'human';
}

export class CoupEngine {
  private random: RandomFn;

  private state: GameState;

  private cardSeq: number;

  constructor(random: RandomFn = Math.random) {
    this.random = random;
    this.cardSeq = 0;
    this.state = this.createInitialState('human');
  }

  newGame(startingPlayer: PlayerId = 'human'): GameState {
    this.cardSeq = 0;
    this.state = this.createInitialState(startingPlayer);
    return this.state;
  }

  getState(): GameState {
    return this.state;
  }

  getView(viewer: PlayerId): GameStateView {
    const players: Record<PlayerId, SerializedPlayer> = {
      human: this.serializePlayer('human', viewer),
      ai: this.serializePlayer('ai', viewer)
    };

    const legalMoves = this.getLegalMoves(viewer);
    const isYourTurn = legalMoves.length > 0;
    return {
      phase: this.state.phase,
      currentPlayer: this.state.currentPlayer,
      winner: this.state.winner,
      turnNumber: this.state.turnNumber,
      pendingAction: this.state.pendingAction,
      pendingBlock: this.state.pendingBlock,
      pendingExchange: this.serializePendingExchange(viewer),
      players,
      legalMoves,
      isYourTurn,
      nextInstruction: this.nextInstructionFor(viewer, isYourTurn),
      waitingReason: isYourTurn ? undefined : this.waitingReasonFor(viewer),
      log: this.state.log.slice(-50)
    };
  }

  getLegalMoves(player: PlayerId): Move[] {
    if (this.state.phase === 'game_over') return [];

    if (this.state.pendingReveal) {
      if (this.state.pendingReveal.player !== player) return [];
      return this.hiddenCards(player).map((card) => ({ type: 'choose_influence_to_reveal', cardId: card.id }));
    }

    if (this.state.pendingExchange) {
      if (this.state.pendingExchange.player !== player) return [];
      return this.exchangeChoices(player).map((keepCardIds) => ({ type: 'choose_exchange', keepCardIds }));
    }

    if (this.state.phase === 'await_action') {
      if (this.state.currentPlayer !== player) return [];
      return this.actionMoves(player);
    }

    if (this.state.phase === 'await_action_response') {
      const responder = oppositePlayer(this.state.currentPlayer);
      if (responder !== player || !this.state.pendingAction) return [];

      const moves: Move[] = [];
      if (this.state.pendingAction.challengeWindowOpen && this.state.pendingAction.claimedCharacter) {
        moves.push({ type: 'challenge_action' });
      }

      if (this.state.pendingAction.blockWindowOpen) {
        const valid = validBlockCharacters(this.state.pendingAction.action);
        for (const blockCharacter of valid) {
          moves.push({ type: 'block', as: blockCharacter });
        }
      }

      moves.push({ type: 'allow' });
      return moves;
    }

    if (this.state.phase === 'await_block_response') {
      if (!this.state.pendingAction || !this.state.pendingBlock) return [];
      if (this.state.pendingAction.actor !== player) return [];
      return [{ type: 'challenge_block' }, { type: 'allow' }];
    }

    return [];
  }

  applyMove(player: PlayerId, move: Move): MoveResult {
    if (this.state.phase === 'game_over') {
      return { ok: false, error: { code: 'GAME_OVER', message: 'Game is over.' } };
    }

    const legalMoves = this.getLegalMoves(player);
    if (legalMoves.length === 0) {
      return { ok: false, error: { code: 'NOT_YOUR_TURN', message: 'It is not your turn.' } };
    }

    const isLegal = legalMoves.some((candidate) => JSON.stringify(candidate) === JSON.stringify(move));
    if (!isLegal) {
      return { ok: false, error: { code: 'ILLEGAL_MOVE', message: 'Move is not legal in current state.' } };
    }

    switch (move.type) {
      case 'declare_action':
        this.handleDeclareAction(player, move.action, move.target);
        break;
      case 'challenge_action':
        this.handleChallengeAction(player);
        break;
      case 'block':
        this.handleBlock(player, move.as);
        break;
      case 'challenge_block':
        this.handleChallengeBlock(player);
        break;
      case 'allow':
        this.handleAllow(player);
        break;
      case 'choose_influence_to_reveal':
        this.handleRevealChoice(player, move.cardId);
        break;
      case 'choose_exchange':
        this.handleExchangeChoice(player, move.keepCardIds);
        break;
      default:
        return { ok: false, error: { code: 'ILLEGAL_MOVE', message: 'Unsupported move.' } };
    }

    return { ok: true };
  }

  private createInitialState(startingPlayer: PlayerId): GameState {
    const deck: InfluenceCard[] = [];
    for (const character of CHARACTERS) {
      for (let i = 0; i < 3; i += 1) {
        deck.push(this.newCard(character));
      }
    }
    shuffleInPlace(deck, this.random);

    const second = nextPlayer(startingPlayer);
    const players: Record<PlayerId, PlayerState> = {
      human: {
        id: 'human',
        coins: startingPlayer === 'human' ? 1 : 2,
        cards: [deck.pop() as InfluenceCard, deck.pop() as InfluenceCard],
        alive: true
      },
      ai: {
        id: 'ai',
        coins: startingPlayer === 'ai' ? 1 : 2,
        cards: [deck.pop() as InfluenceCard, deck.pop() as InfluenceCard],
        alive: true
      }
    };

    return {
      players,
      treasuryCoins: 50 - players.human.coins - players.ai.coins,
      courtDeck: deck,
      currentPlayer: startingPlayer,
      phase: 'await_action',
      pendingAction: undefined,
      pendingBlock: undefined,
      pendingReveal: undefined,
      pendingExchange: undefined,
      winner: undefined,
      turnNumber: 1,
      log: [
        {
          turn: 1,
          actor: 'system',
          type: 'game_start',
          message: `New game started. ${startingPlayer} acts first. ${second} starts with 2 coins.`
        }
      ]
    };
  }

  private actionMoves(player: PlayerId): Move[] {
    const p = this.state.players[player];
    const target = oppositePlayer(player);
    if (!p.alive) return [];
    if (p.coins >= 10) {
      return [{ type: 'declare_action', action: 'coup', target }];
    }

    const actions: Move[] = [
      { type: 'declare_action', action: 'income' },
      { type: 'declare_action', action: 'foreign_aid' },
      { type: 'declare_action', action: 'tax' },
      { type: 'declare_action', action: 'exchange' }
    ];

    if (p.coins >= actionCost('assassinate')) {
      actions.push({ type: 'declare_action', action: 'assassinate', target });
    }
    actions.push({ type: 'declare_action', action: 'steal', target });
    if (p.coins >= actionCost('coup')) {
      actions.push({ type: 'declare_action', action: 'coup', target });
    }

    return actions;
  }

  private handleDeclareAction(actor: PlayerId, action: ActionType, target?: PlayerId): void {
    if (actionRequiresTarget(action) && !target) {
      throw new Error('Target required.');
    }

    const cost = actionCost(action);
    const actorState = this.state.players[actor];
    actorState.coins -= cost;
    this.state.treasuryCoins += cost;

    this.log(actor, 'action_declared', `${actor} declared ${action}${target ? ` targeting ${target}` : ''}.`);

    const pendingAction: PendingAction = {
      actor,
      target,
      action,
      claimedCharacter: ACTION_CLAIMS[action],
      coinCostPaid: cost,
      challengeWindowOpen: action === 'tax' || action === 'assassinate' || action === 'steal' || action === 'exchange',
      blockWindowOpen: canBeBlocked(action),
      challenged: false
    };

    this.state.pendingAction = pendingAction;
    this.state.pendingBlock = undefined;

    if (!pendingAction.challengeWindowOpen && !pendingAction.blockWindowOpen) {
      this.resolveAction();
      return;
    }

    setPhase(this.state, 'await_action_response');
  }

  private handleChallengeAction(challenger: PlayerId): void {
    const pending = this.state.pendingAction;
    if (!pending || !pending.claimedCharacter) return;

    pending.challenged = true;
    pending.challengeWindowOpen = false;
    const actorHasClaim = this.hiddenCards(pending.actor).some((card) => card.character === pending.claimedCharacter);

    this.log(challenger, 'challenge_action', `${challenger} challenges ${pending.actor}'s ${pending.action} claim.`);

    if (actorHasClaim) {
      this.replaceProvenCard(pending.actor, pending.claimedCharacter);
      this.requestReveal(challenger, 'failed challenge', 'continue_action_after_challenge');
      return;
    }

    this.refundActionCost();
    this.requestReveal(pending.actor, 'failed claim', 'action_failed');
  }

  private handleBlock(blocker: PlayerId, as: Character): void {
    const pending = this.state.pendingAction;
    if (!pending) return;

    if (blockMustBeTarget(pending.action) && pending.target !== blocker) {
      throw new Error('Only target can block this action.');
    }

    this.state.pendingBlock = {
      blocker,
      blockCharacter: as,
      challenged: false
    };

    this.log(blocker, 'block', `${blocker} blocks ${pending.action} as ${as}.`);
    setPhase(this.state, 'await_block_response');
  }

  private handleChallengeBlock(challenger: PlayerId): void {
    const pendingAction = this.state.pendingAction;
    const pendingBlock = this.state.pendingBlock;
    if (!pendingAction || !pendingBlock) return;

    pendingBlock.challenged = true;
    this.log(challenger, 'challenge_block', `${challenger} challenges ${pendingBlock.blocker}'s block (${pendingBlock.blockCharacter}).`);

    const blockerHasClaim = this.hiddenCards(pendingBlock.blocker).some((card) => card.character === pendingBlock.blockCharacter);

    if (blockerHasClaim) {
      this.replaceProvenCard(pendingBlock.blocker, pendingBlock.blockCharacter);
      this.requestReveal(challenger, 'failed block challenge', 'block_succeeds');
      return;
    }

    this.requestReveal(pendingBlock.blocker, 'failed block claim', 'resolve_action_after_block_failed');
  }

  private handleAllow(player: PlayerId): void {
    if (this.state.phase === 'await_action_response') {
      this.log(player, 'allow', `${player} allows action.`);
      this.resolveAction();
      return;
    }

    if (this.state.phase === 'await_block_response') {
      this.log(player, 'allow_block', `${player} accepts the block.`);
      this.clearActionAndEndTurn();
    }
  }

  private handleRevealChoice(player: PlayerId, cardId: string): void {
    const pendingReveal = this.state.pendingReveal;
    if (!pendingReveal || pendingReveal.player !== player) return;

    const card = this.state.players[player].cards.find((c) => c.id === cardId && !c.revealed);
    if (!card) throw new Error('Invalid reveal card selection.');

    card.revealed = true;
    this.log(player, 'reveal', `${player} reveals ${card.character}.`);

    this.state.pendingReveal = undefined;
    this.updateAliveStatus(player);

    if (this.state.phase === 'game_over') return;

    this.continueAfterReveal(pendingReveal.continuation);
  }

  private handleExchangeChoice(player: PlayerId, keepCardIds: string[]): void {
    const pendingExchange = this.state.pendingExchange;
    if (!pendingExchange || pendingExchange.player !== player) return;

    const currentHidden = this.hiddenCards(player);
    const revealed = this.state.players[player].cards.filter((c) => c.revealed).map(cloneCard);
    const pool = [...currentHidden.map(cloneCard), ...pendingExchange.drawn.map(cloneCard)];

    const keepCount = currentHidden.length;
    if (keepCardIds.length !== keepCount) throw new Error('Invalid exchange card count.');

    const unique = new Set(keepCardIds);
    if (unique.size !== keepCardIds.length) throw new Error('Duplicate exchange card id.');

    const kept = keepCardIds.map((id) => {
      const found = pool.find((card) => card.id === id);
      if (!found) throw new Error('Invalid exchange card id.');
      return found;
    });

    const keptIds = new Set(keepCardIds);
    const returning = pool.filter((card) => !keptIds.has(card.id));
    this.state.courtDeck.push(...returning.map(cloneCard));
    shuffleInPlace(this.state.courtDeck, this.random);

    this.state.players[player].cards = [...revealed, ...kept.map(cloneCard)];
    this.state.pendingExchange = undefined;
    this.log(player, 'exchange', `${player} completes exchange.`);
    this.clearActionAndEndTurn();
  }

  private resolveAction(): void {
    const pending = this.state.pendingAction;
    if (!pending) return;

    setPhase(this.state, 'resolve');

    const actor = this.state.players[pending.actor];
    const targetId = pending.target;

    const delta = actionCoinDelta(pending.action);
    if (delta > 0) {
      actor.coins += delta;
      this.state.treasuryCoins -= delta;
    }

    switch (pending.action) {
      case 'income':
      case 'foreign_aid':
      case 'tax':
        this.log(pending.actor, 'action_resolved', `${pending.action} resolved.`);
        this.clearActionAndEndTurn();
        return;
      case 'steal': {
        if (!targetId) throw new Error('Steal target missing');
        const target = this.state.players[targetId];
        const amount = Math.min(2, target.coins);
        target.coins -= amount;
        actor.coins += amount;
        this.log(pending.actor, 'action_resolved', `${pending.actor} steals ${amount} coins from ${targetId}.`);
        this.clearActionAndEndTurn();
        return;
      }
      case 'exchange': {
        const draw = [this.drawFromDeck(), this.drawFromDeck()];
        this.state.pendingExchange = { player: pending.actor, drawn: draw };
        this.log(pending.actor, 'action_resolved', `${pending.actor} draws 2 cards for exchange.`);
        return;
      }
      case 'assassinate': {
        if (!targetId) throw new Error('Assassination target missing');
        this.log(pending.actor, 'action_resolved', `${pending.actor} assassination lands on ${targetId}.`);
        this.requestReveal(targetId, 'assassination', 'end_turn');
        return;
      }
      case 'coup': {
        if (!targetId) throw new Error('Coup target missing');
        this.log(pending.actor, 'action_resolved', `${pending.actor} coups ${targetId}.`);
        this.requestReveal(targetId, 'coup', 'end_turn');
        return;
      }
      default:
        this.clearActionAndEndTurn();
    }
  }

  private continueAfterReveal(continuation: ContinuationType): void {
    switch (continuation) {
      case 'end_turn':
        this.clearActionAndEndTurn();
        break;
      case 'continue_action_after_challenge': {
        const pending = this.state.pendingAction;
        if (!pending) return;
        pending.challengeWindowOpen = false;
        if (pending.blockWindowOpen) {
          setPhase(this.state, 'await_action_response');
        } else {
          this.resolveAction();
        }
        break;
      }
      case 'resolve_action_after_no_block':
      case 'resolve_action_after_block_failed':
        this.resolveAction();
        break;
      case 'action_failed':
      case 'block_succeeds':
        this.clearActionAndEndTurn();
        break;
      default:
        this.clearActionAndEndTurn();
    }
  }

  private clearActionAndEndTurn(): void {
    clearPending(this.state);
    this.state.pendingExchange = undefined;
    this.state.pendingReveal = undefined;

    if (this.checkGameOver()) return;

    this.state.currentPlayer = nextPlayer(this.state.currentPlayer);
    this.state.turnNumber += 1;
    setPhase(this.state, 'await_action');
  }

  private checkGameOver(): boolean {
    const humanAlive = this.state.players.human.alive;
    const aiAlive = this.state.players.ai.alive;
    if (humanAlive && aiAlive) return false;

    this.state.winner = humanAlive ? 'human' : 'ai';
    this.state.phase = 'game_over';
    this.log('system', 'game_over', `Winner: ${this.state.winner}`);
    return true;
  }

  private requestReveal(player: PlayerId, reason: string, continuation: ContinuationType): void {
    const hidden = this.hiddenCards(player);
    if (hidden.length === 1) {
      const forced = hidden[0]!;
      forced.revealed = true;
      this.log(player, 'reveal', `${player} reveals ${forced.character}.`);
      this.updateAliveStatus(player);
      if (this.state.phase === 'game_over') return;
      this.continueAfterReveal(continuation);
      return;
    }

    this.state.pendingReveal = { player, reason, continuation };
    setPhase(this.state, 'resolve');
  }

  private hiddenCards(player: PlayerId): InfluenceCard[] {
    return this.state.players[player].cards.filter((card) => !card.revealed);
  }

  private exchangeChoices(player: PlayerId): string[][] {
    const pending = this.state.pendingExchange;
    if (!pending || pending.player !== player) return [];

    const hidden = this.hiddenCards(player);
    const pool = [...hidden, ...pending.drawn];
    const keepCount = hidden.length;

    const results: string[][] = [];
    const current: string[] = [];

    const walk = (index: number): void => {
      if (current.length === keepCount) {
        results.push([...current]);
        return;
      }
      if (index >= pool.length) return;

      current.push(pool[index]!.id);
      walk(index + 1);
      current.pop();
      walk(index + 1);
    };

    walk(0);
    return results;
  }

  private replaceProvenCard(player: PlayerId, character: Character): void {
    const hidden = this.hiddenCards(player);
    const proven = hidden.find((card) => card.character === character);
    if (!proven) return;

    this.state.players[player].cards = this.state.players[player].cards.filter((card) => card.id !== proven.id);
    this.state.courtDeck.push(cloneCard(proven));
    shuffleInPlace(this.state.courtDeck, this.random);
    this.state.players[player].cards.push(this.drawFromDeck());

    this.log(player, 'proof', `${player} proves claim with ${character} and redraws.`);
  }

  private drawFromDeck(): InfluenceCard {
    const card = this.state.courtDeck.pop();
    if (!card) throw new Error('Court deck exhausted.');
    return card;
  }

  private refundActionCost(): void {
    const pending = this.state.pendingAction;
    if (!pending || pending.coinCostPaid === 0) return;
    this.state.players[pending.actor].coins += pending.coinCostPaid;
    this.state.treasuryCoins -= pending.coinCostPaid;
  }

  private updateAliveStatus(player: PlayerId): void {
    const p = this.state.players[player];
    if (p.cards.some((card) => !card.revealed)) {
      p.alive = true;
      return;
    }

    if (p.alive && p.coins > 0) {
      this.state.treasuryCoins += p.coins;
      p.coins = 0;
    }
    p.alive = false;
    this.checkGameOver();
  }

  private serializePlayer(owner: PlayerId, viewer: PlayerId): SerializedPlayer {
    const player = this.state.players[owner];
    return {
      id: owner,
      coins: player.coins,
      alive: player.alive,
      cards: player.cards.map((card, index) => cardVisibleTo(card, viewer, owner, index))
    };
  }

  private serializePendingExchange(viewer: PlayerId): SerializedPendingExchange | undefined {
    const pending = this.state.pendingExchange;
    if (!pending) return undefined;

    return {
      player: pending.player,
      drawn: pending.drawn.map((card, index) => cardVisibleTo(card, viewer, pending.player, index))
    };
  }

  private waitingReasonFor(player: PlayerId): string {
    if (this.state.pendingReveal) {
      return this.state.pendingReveal.player === player ? 'CHOOSING_REVEAL' : 'WAITING_FOR_REVEAL';
    }
    if (this.state.pendingExchange) {
      return this.state.pendingExchange.player === player ? 'CHOOSING_EXCHANGE' : 'WAITING_FOR_EXCHANGE';
    }
    if (this.state.phase === 'await_action') return 'WAITING_FOR_TURN';
    if (this.state.phase === 'await_action_response') return 'WAITING_FOR_ACTION_RESPONSE';
    if (this.state.phase === 'await_block_response') return 'WAITING_FOR_BLOCK_RESPONSE';
    return 'WAITING';
  }

  private nextInstructionFor(viewer: PlayerId, isYourTurn: boolean): string {
    if (this.state.phase === 'game_over') return 'Game over. No action needed.';
    if (isYourTurn) {
      return viewer === 'ai'
        ? 'AI action is expected. Call POST /api/game/action with one legal move.'
        : 'Human action is expected.';
    }
    return oppositePlayer(viewer) === 'ai'
      ? 'Wait. AI action is expected.'
      : 'Wait. Human action is expected.';
  }

  private newCard(character: Character): InfluenceCard {
    this.cardSeq += 1;
    return {
      id: `c${this.cardSeq}`,
      character,
      revealed: false
    };
  }

  private log(actor: PlayerId | 'system', type: string, message: string): void {
    const entry: LogEntry = {
      turn: this.state.turnNumber,
      actor,
      type,
      message
    };
    this.state.log.push(entry);
  }
}
