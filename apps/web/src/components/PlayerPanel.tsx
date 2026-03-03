import { User, Bot, Heart, Skull, Coins, EyeOff } from 'lucide-react';
import type { PlayerId } from '../api';

interface Props {
  viewer: PlayerId;
  player: {
    id: PlayerId;
    coins: number;
    alive: boolean;
    cards: Array<{ id: string; character?: string; revealed: boolean }>;
  };
  isActive?: boolean;
}

export function PlayerPanel({ viewer, player, isActive = false }: Props) {
  const isViewer = player.id === viewer;
  const displayName = isViewer ? 'You' : 'AI Opponent';
  const hiddenCount = player.cards.filter(c => !c.revealed).length;

  return (
    <section className={`player-panel ${!player.alive ? 'player-eliminated' : ''} ${isActive ? 'active-turn' : ''}`}>
      <div className="player-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isViewer ? (
            <User size={20} style={{ color: 'var(--accent-emerald)' }} />
          ) : (
            <Bot size={20} style={{ color: 'var(--accent-amethyst)' }} />
          )}
          <h3 className="panel-title">{displayName}</h3>
        </div>
        <span className={`status-badge ${player.alive ? 'status-alive' : 'status-eliminated'}`}>
          {player.alive ? (
            <>
              <Heart size={12} />
              Alive
            </>
          ) : (
            <>
              <Skull size={12} />
              Eliminated
            </>
          )}
        </span>
      </div>

      <div className="player-stats">
        <div className="stat-item">
          <span className="stat-label">
            <Coins size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Coins
          </span>
          <span className="stat-value coins-value">{player.coins}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">
            <EyeOff size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Hidden
          </span>
          <span className="stat-value">{hiddenCount}</span>
        </div>
      </div>

      <div className="cards-row">
        {player.cards.map((card) => (
          <CardChip key={card.id} card={card} isViewer={isViewer} />
        ))}
      </div>
    </section>
  );
}

interface CardChipProps {
  card: { id: string; character?: string; revealed: boolean };
  isViewer: boolean;
}

function CardChip({ card, isViewer }: CardChipProps) {
  const displayName = card.character
    ? card.character.charAt(0).toUpperCase() + card.character.slice(1)
    : isViewer
      ? 'Unknown'
      : 'Hidden';

  return (
    <span
      className={`card-chip ${card.revealed ? 'card-revealed' : 'card-hidden'}`}
      data-character={card.character?.toLowerCase()}
    >
      {displayName}
    </span>
  );
}
