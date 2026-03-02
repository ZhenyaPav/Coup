import type { PlayerId } from '../api';

interface Props {
  viewer: PlayerId;
  player: {
    id: PlayerId;
    coins: number;
    alive: boolean;
    cards: Array<{ id: string; character?: string; revealed: boolean }>;
  };
}

export function PlayerPanel({ viewer, player }: Props) {
  return (
    <section className="player-panel">
      <h3 className="panel-title">{player.id === 'human' ? 'You' : 'AI Opponent'}</h3>
      <div className="panel-meta">
        <span>Coins: {player.coins}</span>
        <span className={player.alive ? 'alive' : 'eliminated'}>{player.alive ? 'Alive' : 'Eliminated'}</span>
      </div>
      <div className="cards-row">
        {player.cards.map((card) => (
          <span key={card.id} className={`card-chip ${card.revealed ? 'card-revealed' : 'card-hidden'}`}>
            {card.character ?? (player.id === viewer ? 'Hidden (you)' : 'Hidden')}
          </span>
        ))}
      </div>
    </section>
  );
}
