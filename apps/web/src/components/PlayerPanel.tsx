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
  const isViewer = player.id === viewer;
  const displayName = isViewer ? 'You' : 'AI Opponent';

  return (
    <section className={`player-panel ${!player.alive ? 'player-eliminated' : ''}`}>
      <div className="player-header">
        <h3 className="panel-title">{displayName}</h3>
        <span className={`status-badge ${player.alive ? 'status-alive' : 'status-eliminated'}`}>
          {player.alive ? 'Alive' : 'Eliminated'}
        </span>
      </div>

      <div className="player-stats">
        <div className="stat-item">
          <span className="stat-label">Coins</span>
          <span className="stat-value coins-value">{player.coins}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Cards</span>
          <span className="stat-value">
            {player.cards.filter(c => !c.revealed).length} hidden
          </span>
        </div>
      </div>

      <div className="cards-row">
        {player.cards.map((card) => (
          <span
            key={card.id}
            className={`card-chip ${card.revealed ? 'card-revealed' : 'card-hidden'}`}
            data-character={card.character?.toLowerCase()}
          >
            {card.character
              ? card.character.charAt(0).toUpperCase() + card.character.slice(1)
              : isViewer
                ? 'Hidden (you)'
                : 'Hidden'}
          </span>
        ))}
      </div>
    </section>
  );
}
