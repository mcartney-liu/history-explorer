/** M82 P1.6 — CausalStatementCard.

Renders a single CausalStatement for Explorer consumption.

Design goals:
- Mechanism answers "why it happened"
- Consequence answers "what impact it had"
- Confidence is NOT shown as a raw enum — it is translated to a
  human-readable curator-assessment label
- Evidence refs are listed as clickable placeholders (P1.7 will make
  them actionable)
*/
import { useEffect, useCallback } from 'react'
import type { CausalStatementData } from '../../data/causalStatement'
import { confidenceLabelKey } from '../../data/causalStatement'
import { useLocale } from '../../data/locale'
import { recordEvent } from '../../data/UserBehaviorEvent'
import LayerBadge from '../common/LayerBadge'
import CollapsibleText from '../ui/CollapsibleText'

interface CausalStatementCardProps {
  cs: CausalStatementData
  /** If provided, evidence refs become clickable (P1.7). */
  onEvidenceClick?: (evidenceId: string) => void
  /** M83.1 — called when user clicks the card body (expand). */
  onCardClick?: () => void
}

export default function CausalStatementCard({
  cs,
  onEvidenceClick,
  onCardClick,
}: CausalStatementCardProps) {
  const { t } = useLocale()

  // M83.1 — cs_card_view on mount
  useEffect(() => {
    if (cs.id) {
      recordEvent({ action: 'cs_card_view', causalId: cs.id })
    }
  }, [cs.id])

  const handleCardClick = useCallback(() => {
    if (cs.id) {
      recordEvent({ action: 'cs_card_expand', causalId: cs.id })
    }
    onCardClick?.()
  }, [cs.id, onCardClick])

  const handleEvidenceClick = useCallback(
    (ref: string) => {
      if (cs.id) {
        recordEvent({ action: 'cs_evidence_open', causalId: cs.id })
      }
      onEvidenceClick?.(ref)
    },
    [cs.id, onEvidenceClick],
  )

  return (
    <div
      className="causal-card"
      data-testid="causal-statement-card"
      data-confidence={cs.confidence ?? 'unknown'}
      onClick={handleCardClick}
    >
      {/* M82 P3 — LayerBadge: "因果解释" */}
      <div className="causal-card-header">
        <LayerBadge layer="causal" />
      </div>

      {/* --- Mechanism --- */}
      {cs.mechanism && (
        <section className="causal-section">
          <h4 className="causal-label">{t('causal.mechanism')}</h4>
          <CollapsibleText text={cs.mechanism} />
        </section>
      )}

      {/* --- Consequence --- */}
      {cs.consequence && (
        <section className="causal-section">
          <h4 className="causal-label">{t('causal.consequence')}</h4>
          <CollapsibleText text={cs.consequence} />
        </section>
      )}

      {/* --- Confidence (curator assessment, NOT a number) --- */}
      <div className="causal-meta">
        <span
          className={`causal-confidence causal-confidence--${cs.confidence ?? 'unknown'}`}
        >
          {t(confidenceLabelKey(cs.confidence))}
        </span>

        {/* --- Evidence refs (P1.7 will add click handler) --- */}
        {cs.evidence_refs.length > 0 && (
          <span className="causal-evidence">
            <span className="causal-evidence-label">{t('causal.evidence')}:</span>
            {cs.evidence_refs.map((ref) => (
              <button
                key={ref}
                type="button"
                className="causal-evidence-ref"
                data-evidence-id={ref}
                disabled={!onEvidenceClick}
                {...(onEvidenceClick
                  ? { onClick: (e: React.MouseEvent) => { e.stopPropagation(); handleEvidenceClick(ref); } }
                  : {})}
              >
                {ref}
              </button>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}
