// M5-A-6: Interpretation layer. This panel is the designated seam that answers
// "WHY are these connections worth exploring" — as opposed to
// ConnectionsExplainedPanel, which answers "WHAT connections exist". It is a
// PURE presentational component: it does not compute, generate, or format
// anything, and it does NOT import navigation. All data arrives pre-mapped via
// `interpretations` (see interpretationFormatter.ts, which preserves the
// backend's deterministic `explanation` verbatim — no AI, no invented text).
import { InterpretationViewModel } from '../data/interpretationFormatter'

type InterpretationPanelProps = {
  interpretations?: InterpretationViewModel[]
  title?: string
  // When provided, each node becomes clickable and calls back with the raw
  // global_id. The panel never imports navigation.ts; the caller wires this to
  // the app's single navigation entry.
  onNodeClick?: (globalId: string) => void
}

function InterpretationPanel({
  interpretations,
  title = 'Why these connections are worth exploring',
  onNodeClick,
}: InterpretationPanelProps) {
  // Strictly additive: nothing to interpret -> render nothing (no empty shell).
  if (!interpretations || interpretations.length === 0) return null

  return (
    <div className="result-section interpretation-panel">
      <h3>{title}</h3>
      <div className="he-interpret-list">
        {interpretations.map((item, idx) => (
          <div className="he-interpret-item" key={idx}>
            <div className="he-interpret-head">
              {onNodeClick ? (
                <button
                  type="button"
                  className="he-interpret-node is-clickable"
                  data-node={item.global_id}
                  aria-label={`Open ${item.localName}`}
                  onClick={() => onNodeClick(item.global_id)}
                >
                  {item.localName}
                </button>
              ) : (
                <span className="he-interpret-name">{item.localName}</span>
              )}
              {typeof item.score === 'number' && (
                <span className="he-interpret-score">{`score ${item.score}`}</span>
              )}
            </div>
            {item.explanation && (
              <p className="he-interpret-why">{item.explanation}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default InterpretationPanel
