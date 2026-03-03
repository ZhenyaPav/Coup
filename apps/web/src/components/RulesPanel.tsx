import { humanRules } from '../data/human-rules';

export function RulesPanel() {
  return (
    <div className="rules-panel">
      <section className="rules-section">
        <h3>Objective</h3>
        <p className="rules-objective">{humanRules.objective}</p>
      </section>

      <section className="rules-section">
        <h3>Your Turn</h3>
        <ul className="rules-list">
          {humanRules.turnRules.points.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      </section>

      <section className="rules-section">
        <h3>Actions</h3>
        
        <div className="action-category">
          <h4>Basic Actions (Anyone can do)</h4>
          {humanRules.actions.basic.map(action => (
            <div key={action.name} className="action-item">
              <div className="action-header">
                <span className="action-name">{action.name}</span>
                {action.cost > 0 && <span className="action-cost">{action.cost} coins</span>}
              </div>
              <span className="action-effect">{action.effect}</span>
              {action.blockable ? (
                <span className="action-blockable">Blockable by {action.blockable}</span>
              ) : (
                <span className="action-unblockable">Cannot be blocked</span>
              )}
            </div>
          ))}
        </div>

        <div className="action-category">
          <h4>Character Actions (Must claim a card)</h4>
          {humanRules.actions.character.map(action => (
            <div key={action.name} className="action-item">
              <div className="action-header">
                <span className="action-name">{action.name}</span>
                {action.cost > 0 && <span className="action-cost">{action.cost} coins</span>}
                {action.claim && <span className="action-claim">as {action.claim}</span>}
              </div>
              <span className="action-effect">{action.effect}</span>
              {action.blockable ? (
                <span className="action-blockable">Blockable by {action.blockable}</span>
              ) : (
                <span className="action-unblockable">Cannot be blocked</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rules-section">
        <h3>Blocking</h3>
        <p className="rules-description">{humanRules.blocking.description}</p>
        <ul className="rules-list blocks-list">
          {humanRules.blocking.blocks.map((block, index) => (
            <li key={index}>
              <span className="block-action">{block.action}</span>
              <span className="block-arrow">→</span>
              <span className="block-blocker">{block.blocker}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rules-section">
        <h3>Challenges</h3>
        <p className="rules-description">{humanRules.challenging.description}</p>
        <div className="challenge-outcomes">
          <div className="challenge-success">
            <span className="outcome-label">Challenge Wins:</span>
            <span>{humanRules.challenging.success}</span>
          </div>
          <div className="challenge-failure">
            <span className="outcome-label">Challenge Fails:</span>
            <span>{humanRules.challenging.failure}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
