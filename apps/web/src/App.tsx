import { useEffect, useMemo, useState } from 'react';
import { getState, newGame, submitAction, type GameStateResponse, type Move, type PlayerId } from './api';
import { PlayerPanel } from './components/PlayerPanel';
import { RulesPanel } from './components/RulesPanel';
import { QuickReference } from './components/QuickReference';
import { phaseNames, waitingMessages, actionDescriptions, actionButtonLabels, blockLabels } from './data/human-rules';

const POLL_MS = 1500;

function formatCharacterName(character: string): string {
  return character.charAt(0).toUpperCase() + character.slice(1);
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
    return blockLabels[move.as] || `Block as ${move.as}`;
  }
  if (move.type === 'challenge_action') return 'Challenge Action';
  if (move.type === 'challenge_block') return 'Challenge Block';
  if (move.type === 'allow') return 'Allow';
  if (move.type === 'choose_influence_to_reveal') {
    if (!state) return `Reveal ${move.cardId}`;
    const allCards = [...state.players.human.cards, ...state.players.ai.cards];
    const card = allCards.find((candidate) => candidate.id === move.cardId);
    if (card?.character) {
      return `Reveal ${formatCharacterName(card.character)} (${move.cardId})`;
    }
    return `Reveal Card (${move.cardId})`;
  }
  if (move.type === 'choose_exchange') return `Keep ${move.keepCardIds.join(', ')}`;
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
      <div className="bg-orb bg-orb-left" />
      <div className="bg-orb bg-orb-right" />

      <aside className="sidebar sidebar-rules">
        <h2>How to Play</h2>
        <RulesPanel />
      </aside>

      <section className="board">
        <header className="hero">
          <div className="hero-top">
            <h1>Coup: Human vs AI</h1>
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
                New Game
              </button>
            </div>
          </div>
          <div className="hero-status">
            <span className="status-item">
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
                  {data.state.winner === 'human' ? '🎉 You Win!' : '🤖 AI Wins'}
                </span>
              </>
            )}
          </div>
          {error && <p className="error">{error}</p>}
        </header>

        <div className="players-grid">
          <PlayerPanel viewer="human" player={data.state.players.human} />
          <PlayerPanel viewer="human" player={data.state.players.ai} />
        </div>

        <section className="block actions-block">
          <h2>{data.state.isYourTurn ? 'Your Actions' : 'Waiting'}</h2>
          {!data.state.isYourTurn ? (
            <div className="waiting-container">
              <div className="waiting-spinner"></div>
              <p className="waiting">{getWaitingMessage(data.state.waitingReason)}</p>
            </div>
          ) : (
            <div className="moves-grid">
              {legalMoves.map((move, index) => (
                <button
                  key={`${move.type}-${index}`}
                  className={`move-btn move-btn--${move.type}`}
                  onClick={() => onMove(move)}
                  disabled={busy}
                  title={getMoveDescription(move)}
                >
                  {moveLabel(move, data.state)}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="block">
          <h2>Game Log</h2>
          <ul className="log-list">
            {data.state.log
              .slice()
              .reverse()
              .map((entry, index) => (
                <li
                  key={`${entry.turn}-${entry.actor}-${index}`}
                  className={logActorClass(entry.actor)}
                >
                  <span className="log-turn">T{entry.turn}</span>
                  <span className="log-actor">{logActorLabel(entry.actor)}</span>
                  <span className="log-message">{entry.message}</span>
                </li>
              ))}
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
