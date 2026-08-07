// M5-A-6: Interpretation layer. This panel is the designated seam that answers
// "WHY are these connections worth exploring" — as opposed to
// ConnectionsExplainedPanel, which answers "WHAT connections exist". It is a
// PURE presentational component: it does not compute, generate, or format
// anything, and it does NOT import navigation. All data arrives pre-mapped via
// `interpretations` (see interpretationFormatter.ts, which preserves the
// backend's deterministic `explanation` verbatim — no AI, no invented text).
//
// M90.3 Stage D-1 — migrated to UnderstandingCard Explorer Primitive for the
// "understandings" section. The interpretations list retains its existing
// rendering (scores + clickable nodes) because UnderstandingCard is designed
// for Before→Evidence→After transitions, not scored entity lists.
import { useLocale } from '../data/locale'
import { InterpretationViewModel } from '../data/interpretationFormatter'
import type { UnderstandingViewModel } from '../data/understandingRules'
import { UnderstandingCard } from './primitives/UnderstandingCard'

type InterpretationPanelProps = {
  interpretations?: InterpretationViewModel[]
  understandings?: UnderstandingViewModel[]
  title?: string
  onNodeClick?: (globalId: string) => void
}

function InterpretationPanel({
  interpretations,
  understandings,
  title,
  onNodeClick,
}: InterpretationPanelProps) {
  const { t } = useLocale()
  const hasInterpretations = !!interpretations && interpretations.length > 0
  const hasUnderstandings = !!understandings && understandings.length > 0
  if (!hasInterpretations && !hasUnderstandings) return null

  const resolvedTitle = title ?? t('discover.interpretationTitle')

  return (
    <div className="result-section interpretation-panel">
      <h3>{resolvedTitle}</h3>
      {hasInterpretations && (
        <div className="he-interpret-list">
          {interpretations!.map((item, idx) => (
            <div className="he-interpret-item" key={idx}>
              <div className="he-interpret-head">
                {onNodeClick ? (
                  <button
                    type="button"
                    className="he-interpret-node is-clickable"
                    data-node={item.global_id}
                    aria-label={t('discover.openAria', { name: item.localName })}
                    onClick={() => onNodeClick(item.global_id)}
                  >
                    {item.localName}
                  </button>
                ) : (
                  <span className="he-interpret-name">{item.localName}</span>
                )}
                {typeof item.score === 'number' && (
                  <span className="he-interpret-score">{t('discover.score', { score: String(item.score) })}</span>
                )}
              </div>
              {item.explanation && (
                <p className="he-interpret-why">{item.explanation}</p>
              )}
            </div>
          ))}
        </div>
      )}
      {hasUnderstandings && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--color-ink-500)', fontWeight: 600 }}>
            {t('discover.historicalMeaning')}
          </h4>
          {understandings!.map((u, idx) => (
            <UnderstandingCard
              key={idx}
              before={`${u.actor} 与 ${u.target}`}
              evidence={
                <>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                    {u.perspective}
                  </span>
                  {u.timeContext && (
                    <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--color-ink-500)' }}>
                      · {u.timeContext}
                    </span>
                  )}
                </>
              }
              after={u.meaning}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default InterpretationPanel
