import { useEffect, useMemo, useState } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  Swords, 
  Shield, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Trophy,
  Skull,
  Coins,
  User,
  Bot,
  CircleDollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getState, newGame, submitAction, type GameStateResponse, type Move, type PlayerId } from './api';
import { PlayerPanel } from './components/PlayerPanel';
import { RulesPanel } from './components/RulesPanel';
import { QuickReference } from './components/QuickReference';
import { phaseNames, waitingMessages, actionDescriptions, actionButtonLabels, blockLabels } from './data/human-rules';

const POLL_MS = 1500;

function formatCharacterName(character: string): string {
  return character.charAt(0).toUpperCase() + character.slice(1);
}

type VisibleCard = GameStateResponse['state']['players'][PlayerId]['cards'][number];

function exchangeCardsFor(state: GameStateResponse['state']): Array<VisibleCard & { source: 'current' | 'drawn' }> {
  const pending = state.pendingExchange;
  if (!pending) return [];

  const current = state.players[pending.player].cards
    .filter((card) => !card.revealed)
    .map((card) => ({ ...card, source: 'current' as const }));
  const drawn = pending.drawn.map((card) => ({ ...card, source: 'drawn' as const }));
  return [...current, ...drawn];
}

function exchangeCardLabel(card: Pick<VisibleCard, 'id' | 'character'>): string {
  return card.character ? formatCharacterName(card.character) : `Card ${card.id}`;
}

function exchangeKeepLabel(move: Extract<Move, { type: 'choose_exchange' }>, state?: GameStateResponse['state']): string {
  if (!state) return `Keep ${move.keepCardIds.length} cards`;
  const cards = exchangeCardsFor(state);
  const names = move.keepCardIds.map((id) => {
    const card = cards.find((candidate) => candidate.id === id);
    return card ? exchangeCardLabel(card) : `Card ${id}`;
  });
  return `Keep ${names.join(' + ')}`;
}

function getActionIcon(moveType: string, action?: string) {
  if (moveType === 'declare_action') {
    switch (action) {
      case 'income': return <Coins size={16} />;
      case 'foreign_aid': return <Coins size={16} style={{ color: 'var(--accent-sapphire)' }} />;
      case 'coup': return <Skull size={16} style={{ color: 'var(--accent-crimson)' }} />;
      case 'tax': return <Coins size={16} style={{ color: 'var(--accent-gold)' }} />;
      case 'assassinate': return <Swords size={16} style={{ color: 'var(--accent-amethyst)' }} />;
      case 'steal': return <Coins size={16} style={{ color: 'var(--accent-sapphire)' }} />;
      case 'exchange': return <RefreshCw size={16} style={{ color: 'var(--accent-emerald)' }} />;
      default: return <Sparkles size={16} />;
    }
  }
  if (moveType === 'block') return <Shield size={16} style={{ color: 'var(--accent-emerald)' }} />;
  if (moveType.startsWith('challenge')) return <AlertCircle size={16} style={{ color: 'var(--accent-crimson)' }} />;
  if (moveType === 'allow') return <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)' }} />;
  if (moveType === 'choose_influence_to_reveal') return <Eye size={16} />;
  if (moveType === 'choose_exchange') return <RefreshCw size={16} />;
  return <Sparkles size={16} />;
}

function parseActionLabel(label: string): { main: string; claim?: string; coinEffect?: string } {
  // Parse formats like: "Tax (claim Duke) +3" or "Income +1" or "Exchange (claim Ambassador)"
  const claimMatch = label.match(/\s*\(claim\s+([^)]+)\)\s*/);
  const claim = claimMatch ? claimMatch[1] : undefined;
  
  // Extract coin effect (+N or −N at the end)
  const coinMatch = label.match(/\s*([+−]\d+)\s*$/);
  const coinEffect = coinMatch ? coinMatch[1] : undefined;
  
  // Main part is everything before claim and coin effect
  let main = label;
  if (claimMatch) {
    main = main.replace(claimMatch[0], ' ').trim();
  }
  if (coinMatch) {
    main = main.replace(coinMatch[0], '').trim();
  }
  
  return { main, claim, coinEffect };
}

function MoveButtonContent({ label, move }: { label: string; move: Move }) {
  const { main, claim, coinEffect } = parseActionLabel(label);
  
  // Determine coin effect styling
  const isCost = coinEffect?.startsWith('−');
  const coinClass = isCost ? 'coin-badge cost' : 'coin-badge gain';
  
  return (
    <>
      <span className="move-btn-main">{main}</span>
      {claim && (
        <span className="move-btn-claim">claim {claim}</span>
      )}
      {coinEffect && (
        <span className={coinClass}>
          <CircleDollarSign size={12} />
          {coinEffect} coins
        </span>
      )}
      {move.type === 'declare_action' && move.target && (
        <span className="move-btn-target">
          → {move.target === 'human' ? 'You' : 'AI'}
        </span>
      )}
    </>
  );
}

function moveLabel(move: Move, state?: GameStateResponse['state']): string {
  if (move.type === 'declare_action') {
    const label = actionButtonLabels[move.action] || move.action;
    if (move.target) {
      return `${label} → ${move.target === 'human' ? 'You' : 'AI'}`;
    }
    return label;
  }
  if (move.type === 'block') {
    return blockLabels[move.as] || `Block (claim ${move.as})`;
  }
  if (move.type === 'challenge_action') return 'Challenge Action';
  if (move.type === 'challenge_block') return 'Challenge Block';
  if (move.type === 'allow') return 'Allow';
  if (move.type === 'choose_influence_to_reveal') {
    if (!state) return `Reveal ${move.cardId}`;
    const allCards = [...state.players.human.cards, ...state.players.ai.cards];
    const card = allCards.find((candidate) => candidate.id === move.cardId);
    if (card?.character) {
      return `Reveal ${formatCharacterName(card.character)}`;
    }
    return `Reveal Card`;
  }
  if (move.type === 'choose_exchange') return exchangeKeepLabel(move, state);
  return move.type;
}

function getMoveDescription(move: Move): string {
  if (move.type === 'declare_action') {
    return actionDescriptions[`declare_action:${move.action}`] || '';
  }
  if (move.type === 'block') {
    return actionDescriptions[`block:${move.as}`] || `Block as ${move.as}`;
  }
  return actionDescriptions[move.type] || '';
}

function formatPhase(phase: string): string {
  return phaseNames[phase] || phase;
}

function getWaitingMessage(reason?: string): string {
  return waitingMessages[reason || ''] || 'Waiting for AI...';
}

function logActorClass(actor: string): string {
  if (actor === 'human') return 'log-human';
  if (actor === 'ai') return 'log-ai';
  return 'log-system';
}

function logActorLabel(actor: string): string {
  if (actor === 'human') return 'You';
  if (actor === 'ai') return 'AI';
  return 'System';
}

function logActorIcon(actor: string) {
  if (actor === 'human') return <User size={12} />;
  if (actor === 'ai') return <Bot size={12} />;
  return <Sparkles size={12} />;
}

function ExchangePool({ state }: { state: GameStateResponse['state'] }) {
  if (!state.pendingExchange || state.pendingExchange.player !== 'human') return null;

  const cards = exchangeCardsFor(state);
  if (cards.length === 0) return null;

  return (
    <div className="exchange-pool" aria-label="Exchange cards">
      {cards.map((card) => (
        <div
          key={`${card.source}-${card.id}`}
          className={`exchange-card exchange-card--${card.source} character-${card.character || 'hidden'}`}
        >
          <span className="exchange-card-name">{exchangeCardLabel(card)}</span>
          <span className="exchange-card-source">{card.source === 'current' ? 'Current' : 'Drawn'}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<GameStateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [startingPlayer, setStartingPlayer] = useState<PlayerId>('human');

  const refresh = async () => {
    try {
      const state = await getState('human');
      setData(state);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const state = await getState('human');
        if (!cancelled) {
          setData(state);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load game');
        }
      }
    };

    bootstrap();

    const timer = setInterval(() => {
      refresh().catch(() => undefined);
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const legalMoves = useMemo(() => data?.state.legalMoves ?? [], [data]);
  const currentPlayer = data?.state.currentPlayer;

  const onNewGame = async () => {
    setBusy(true);
    try {
      const next = await newGame(startingPlayer);
      setData(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setBusy(false);
    }
  };

  const onMove = async (move: Move) => {
    setBusy(true);
    try {
      const next = await submitAction('human', move);
      setData(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit move');
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <main className="shell">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading game...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <aside className="sidebar sidebar-rules">
        <h2>How to Play</h2>
        <RulesPanel />
      </aside>

      <section className="board">
        <header className="hero">
          <div className="hero-top">
            <h1>
              <Sparkles size={28} style={{ marginRight: '10px', verticalAlign: 'middle', color: 'var(--accent-gold)' }} />
              Coup: Human vs AI
            </h1>
            <div className="new-game-controls">
              <label className="start-label" htmlFor="starting-player">
                First Turn
              </label>
              <select
                id="starting-player"
                className="start-select"
                value={startingPlayer}
                onChange={(event) => setStartingPlayer(event.target.value as PlayerId)}
                disabled={busy}
              >
                <option value="human">You</option>
                <option value="ai">AI</option>
              </select>
              <button className="new-game-btn new-game-btn-top" onClick={onNewGame} disabled={busy}>
                <RefreshCw size={16} />
                New Game
              </button>
            </div>
          </div>
          <div className="hero-status">
            <span className="status-item">
              <Clock size={14} style={{ color: 'var(--ink-muted)' }} />
              <span className="status-label">Turn:</span>
              <span className="status-value">{data.state.turnNumber}</span>
            </span>
            <span className="status-separator">|</span>
            <span className="status-item">
              <span className="status-label">Phase:</span>
              <span className="status-value">{formatPhase(data.state.phase)}</span>
            </span>
            {data.state.winner && (
              <>
                <span className="status-separator">|</span>
                <span className="winner-announcement">
                  <Trophy size={14} style={{ marginRight: '6px' }} />
                  {data.state.winner === 'human' ? 'You Win!' : 'AI Wins'}
                </span>
              </>
            )}
          </div>
          <AnimatePresence>
            {error && (
              <motion.p 
                className="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AlertCircle size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </header>

        <div className="players-grid">
          <PlayerPanel 
            viewer="human" 
            player={data.state.players.human} 
            isActive={currentPlayer === 'human' && !data.state.winner}
          />
          <PlayerPanel 
            viewer="human" 
            player={data.state.players.ai} 
            isActive={currentPlayer === 'ai' && !data.state.winner}
          />
        </div>

        <section className="block actions-block">
          <h2>
            {data.state.isYourTurn ? (
              <>
                <Swords size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Your Actions
              </>
            ) : (
              <>
                <Clock size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Waiting
              </>
            )}
          </h2>
          {!data.state.isYourTurn ? (
            <div className="waiting-container">
              <div className="waiting-spinner"></div>
              <p className="waiting">{getWaitingMessage(data.state.waitingReason)}</p>
            </div>
          ) : (
            <>
              <ExchangePool state={data.state} />
              <div className="moves-grid">
                {legalMoves.map((move, index) => {
                  const actionType = move.type === 'declare_action' ? move.action : undefined;
                  const label = moveLabel(move, data.state);
                  return (
                    <motion.button
                      key={`${move.type}-${index}`}
                      className={`move-btn move-btn--${move.type}`}
                      onClick={() => onMove(move)}
                      disabled={busy}
                      title={getMoveDescription(move)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      {getActionIcon(move.type, actionType)}
                      <MoveButtonContent label={label} move={move} />
                    </motion.button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section className="block">
          <h2>
            <Eye size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Game Log
          </h2>
          <ul className="log-list">
            <AnimatePresence initial={false}>
              {data.state.log
                .slice()
                .reverse()
                .map((entry, index) => (
                  <motion.li
                    key={`${entry.turn}-${entry.actor}-${index}`}
                    className={logActorClass(entry.actor)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <span className="log-turn">T{entry.turn}</span>
                    <span className="log-actor" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {logActorIcon(entry.actor)}
                      {logActorLabel(entry.actor)}
                    </span>
                    <span className="log-message">{entry.message}</span>
                  </motion.li>
                ))}
            </AnimatePresence>
          </ul>
        </section>
      </section>

      <aside className="sidebar sidebar-reference">
        <h2>Quick Reference</h2>
        <QuickReference />
      </aside>
    </main>
  );
}
