import { Crown, Swords, Ship, Shuffle, Heart, Lightbulb, AlertTriangle } from 'lucide-react';
import { characters, quickTips } from '../data/human-rules';

const characterIcons: Record<string, React.ReactNode> = {
  Duke: <Crown size={16} />,
  Assassin: <Swords size={16} />,
  Captain: <Ship size={16} />,
  Ambassador: <Shuffle size={16} />,
  Contessa: <Heart size={16} />,
};

export function QuickReference() {
  return (
    <div className="quick-reference">
      <section className="ref-section">
        <h3>Characters</h3>
        <div className="characters-list">
          {characters.map(char => (
            <div key={char.name} className={`character-card character-${char.name.toLowerCase()}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ opacity: 0.8 }}>{characterIcons[char.name]}</span>
                <span className="char-name">{char.name}</span>
              </div>
              <span className="char-ability">{char.ability}</span>
              <span className="char-blocks">
                {char.blocks === '—' ? 'No blocking ability' : `Blocks: ${char.blocks}`}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="ref-section">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lightbulb size={16} style={{ color: 'var(--accent-gold)' }} />
          Quick Tips
        </h3>
        <ul className="tips-list">
          {quickTips.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </section>

      <section className="ref-section">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} style={{ color: 'var(--accent-crimson)' }} />
          Coin Reminder
        </h3>
        <div className="coin-reminder">
          <div className="coin-rule">
            <span className="coin-threshold">10+ coins</span>
            <span className="coin-mandatory">Must Coup!</span>
          </div>
        </div>
      </section>
    </div>
  );
}
