import { useEffect, useMemo, useState } from 'react';
import { getRulesMarkdown, getState, newGame, submitAction, type GameStateResponse, type Move } from './api';
import { PlayerPanel } from './components/PlayerPanel';

const POLL_MS = 1500;

function moveLabel(move: Move): string {
  if (move.type === 'declare_action') {
    return `${move.action}${move.target ? ` -> ${move.target}` : ''}`;
  }
  if (move.type === 'block') return `block as ${move.as}`;
  if (move.type === 'choose_influence_to_reveal') return `reveal ${move.cardId}`;
  if (move.type === 'choose_exchange') return `keep ${move.keepCardIds.join(', ')}`;
  return move.type;
}

function splitRules(markdown: string): { rulesText: string; curlText: string } {
  const marker = '## Curl Examples';
  const index = markdown.indexOf(marker);
  if (index < 0) {
    return { rulesText: markdown, curlText: 'Curl examples were not found in rules markdown.' };
  }

  return {
    rulesText: markdown.slice(0, index).trim(),
    curlText: markdown.slice(index).trim()
  };
}

export default function App() {
  const [data, setData] = useState<GameStateResponse | null>(null);
  const [rulesMarkdown, setRulesMarkdown] = useState('Loading rules...');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      const [stateResult, rulesResult] = await Promise.allSettled([getState('human'), getRulesMarkdown()]);

      if (cancelled) return;

      if (stateResult.status === 'fulfilled') {
        setData(stateResult.value);
      } else {
        setError(stateResult.reason instanceof Error ? stateResult.reason.message : 'Failed to load game');
      }

      if (rulesResult.status === 'fulfilled') {
        setRulesMarkdown(rulesResult.value);
      } else {
        setRulesMarkdown('Rules markdown unavailable.');
      }
    };

    bootstrap().catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to bootstrap game');
    });

    const timer = setInterval(() => {
      refresh().catch(() => undefined);
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const legalMoves = useMemo(() => data?.state.legalMoves ?? [], [data]);
  const { rulesText, curlText } = useMemo(() => splitRules(rulesMarkdown), [rulesMarkdown]);

  const onNewGame = async () => {
    setBusy(true);
    try {
      const next = await newGame();
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
    return <main className="shell"><div className="loading">Loading game...</div></main>;
  }

  return (
    <main className="shell">
      <div className="bg-orb bg-orb-left" />
      <div className="bg-orb bg-orb-right" />

      <aside className="sidebar">
        <h2>Rules</h2>
        <pre>{rulesText}</pre>
      </aside>

      <section className="board">
        <header className="hero">
          <h1>Coup: Human vs AI</h1>
          <p>
            Turn {data.state.turnNumber} | Phase: {data.state.phase}
            {data.state.winner ? ` | Winner: ${data.state.winner}` : ''}
          </p>
          {error ? <p className="error">{error}</p> : null}
        </header>

        <div className="players-grid">
          <PlayerPanel viewer="human" player={data.state.players.human} />
          <PlayerPanel viewer="human" player={data.state.players.ai} />
        </div>

        <section className="block">
          <h2>Actions</h2>
          {!data.state.isYourTurn ? (
            <p className="waiting">Waiting for AI turn ({data.state.waitingReason ?? 'WAITING'}).</p>
          ) : (
            <div className="moves-grid">
              {legalMoves.map((move, index) => (
                <button key={`${move.type}-${index}`} className="move-btn" onClick={() => onMove(move)} disabled={busy}>
                  {moveLabel(move)}
                </button>
              ))}
            </div>
          )}
          <button className="new-game-btn" onClick={onNewGame} disabled={busy}>
            New Game
          </button>
        </section>

        <section className="block">
          <h2>Event Log</h2>
          <ul className="log-list">
            {data.state.log
              .slice()
              .reverse()
              .map((entry, index) => (
                <li key={`${entry.turn}-${entry.actor}-${index}`}>
                  <span className="log-turn">T{entry.turn}</span> {entry.actor}: {entry.message}
                </li>
              ))}
          </ul>
        </section>
      </section>

      <aside className="sidebar">
        <h2>API Quick Curl</h2>
        <pre>{curlText}</pre>
      </aside>
    </main>
  );
}
