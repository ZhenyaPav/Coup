import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

const humanTurnState = {
  gameId: 'default',
  state: {
    phase: 'await_action',
    currentPlayer: 'human',
    turnNumber: 1,
    isYourTurn: true,
    legalMoves: [{ type: 'declare_action', action: 'income' }],
    players: {
      human: {
        id: 'human',
        coins: 1,
        alive: true,
        cards: [
          { id: 'h1', character: 'duke', revealed: false },
          { id: 'h2', character: 'captain', revealed: false }
        ]
      },
      ai: {
        id: 'ai',
        coins: 2,
        alive: true,
        cards: [
          { id: 'a1', revealed: false },
          { id: 'a2', revealed: false }
        ]
      }
    },
    log: []
  }
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('renders loading state before API data arrives', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
    render(<App />);
    expect(screen.getByText(/Loading game/i)).toBeTruthy();
  });

  it('renders legal move buttons after bootstrap fetches', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(humanTurnState), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('income')).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalled();
  });

  it('shows waiting text when it is not human turn', async () => {
    const notYourTurnState = {
      ...humanTurnState,
      state: {
        ...humanTurnState.state,
        isYourTurn: false,
        waitingReason: 'WAITING_FOR_TURN',
        legalMoves: []
      }
    };

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(notYourTurnState), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Waiting for AI turn/i)).toBeTruthy();
    });
  });

  it('does not auto-reset game on initial page load', async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes('/api/rules')) {
        return new Response('# Rules', { status: 200, headers: { 'Content-Type': 'text/markdown' } });
      }
      return new Response(JSON.stringify(humanTurnState), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('income')).toBeTruthy();
    });

    expect(calls.some((url) => url.includes('/api/game/new'))).toBe(false);
    expect(calls.some((url) => url.includes('/api/game/state?viewer=human'))).toBe(true);
  });
});
