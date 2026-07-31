// M74-003 (C3-1): TrustDisplay — renders evidence-bound exploration output.
// Pure presentational component: it consumes ONLY fields that already passed
// EvidenceValidation server-side (evidence / next_exploration) and renders
// them as-is. It never assembles facts, never fetches, never infers.
//
// PO Condition 1/2: deterministic output is explicitly NOT presented as
// "AI-generated" — the title reads "基于知识库证据的探索建议" and an engine
// badge distinguishes deterministic vs AI output.
import { useLocale } from '../../data/locale'
import type { AIEvidence, AIEngine, AINextExploration } from '../../data/aiClient'
import { Badge, type BadgeTone } from '../ui/Badge'

interface TrustDisplayProps {
  evidence?: AIEvidence[]
  nextExploration?: AINextExploration[]
  engine?: AIEngine
  /** M74-003 (C3-2): optional navigation — fired with the suggestion's
   *  global_id when a next-exploration item is clicked. The consumer wires
   *  this to the EXISTING onEntityClick path; no new navigation logic here. */
  onNextClick?: (globalId: string) => void
}

function engineBadge(engine: AIEngine | undefined, t: (k: string) => string): {
  tone: BadgeTone
  label: string
} | null {
  if (engine === 'ai' || engine === 'ai_unverified') {
    return { tone: 'academic', label: t('ai.trust_engine_ai') }
  }
  if (engine === 'deterministic') {
    return { tone: 'primary', label: t('ai.trust_engine_deterministic') }
  }
  return null
}

export function TrustDisplay({ evidence, nextExploration, engine, onNextClick }: TrustDisplayProps) {
  const { t } = useLocale()
  const evidenceList = evidence ?? []
  const nextList = nextExploration ?? []
  const badge = engineBadge(engine, t)

  if (evidenceList.length === 0 && nextList.length === 0) {
    return (
      <section className="trust-display" data-testid="trust-display">
        <p className="trust-display-empty">{t('ai.trust_no_evidence')}</p>
      </section>
    )
  }

  return (
    <section className="trust-display" data-testid="trust-display">
      <header className="trust-display-header">
        <h3 className="trust-display-title">{t('ai.trust_title')}</h3>
        {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
      </header>

      {nextList.length > 0 && (
        <div className="trust-display-section">
          <p className="trust-display-label">{t('ai.trust_next_label')}</p>
          <ul className="trust-display-next">
            {nextList.map((item) => (
              <li key={item.global_id} className="trust-display-next-item">
                {onNextClick ? (
                  <button
                    type="button"
                    className="trust-display-next-btn"
                    onClick={() => onNextClick(item.global_id)}
                  >
                    <span className="trust-display-next-name">{item.label}</span>
                    <span className="trust-display-next-rel">{item.relationship}</span>
                  </button>
                ) : (
                  <>
                    <span className="trust-display-next-name">{item.label}</span>
                    <span className="trust-display-next-rel">{item.relationship}</span>
                  </>
                )}
                <code className="trust-display-source">{item.source_id}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {evidenceList.length > 0 && (
        <div className="trust-display-section">
          <p className="trust-display-label">{t('ai.trust_evidence_label')}</p>
          <ul className="trust-display-evidence">
            {evidenceList.map((ev, i) => (
              <li key={`${ev.global_id}-${i}`} className="trust-display-evidence-item">
                <span className="trust-display-evidence-name">{ev.label}</span>
                <code className="trust-display-source">{ev.global_id}</code>
                {ev.status === 'verified' && (
                  <Badge tone="primary">{t('ai.trust_verified')}</Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default TrustDisplay
