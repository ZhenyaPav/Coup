import { characters, quickTips } from '../data/human-rules';

export function QuickReference() {
  return (
    <div className="quick-reference">
      <section className="ref-section">
        <h3>Characters</h3>
        <div className="characters-list">
          {characters.map(char => (
            <div key={char.name} className={`character-card character-${char.name.toLowerCase()}`}>
              <span className="char-name">{char.name}</span>
              <span className="char-ability">{char.ability}</span>
              <span className="char-blocks">
                {char.blocks === '—' ? 'No blocking ability' : `Blocks: ${char.blocks}`}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="ref-section">
        <h3>Quick Tips</h3>
        <ul className="tips-list">
          {quickTips.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </section>

      <section className="ref-section">
        <h3>Coin Reminder</h3>
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
