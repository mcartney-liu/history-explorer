import {
  getEntityDisplayName,
  type ExplorationPackage,
  type Locale,
} from '../../data/explorationPackages'
import { getGuideSnapshot } from '../../data/explorationGuide'
import { getRelationshipLabel } from '../../data/entity/entityLabels'
import { useLocale } from '../../data/locale'
import { recordEvent } from '../../data/UserBehaviorEvent'
import { Button } from '../ui/Button'
import CausalStatementCard from '../causal/CausalStatementCard'
import type { CausalStatementData } from '../../data/causalStatement'

interface GuidePanelProps {
  pkg: ExplorationPackage
  /** visited entity global_ids (deduped trail, from behavior events) */
  visited: string[]
  locale?: Locale
  onEntityClick?: (gid: string) => void
  /** M71 — fired when the user clicks a "next step" suggestion. Presentational
   *  passthrough only; telemetry wiring lives in the page layer (behavior-
   *  analysis only, no recommendation logic). */
  onNextClick?: (to: string) => void
  /** M82 P2 — CausalStatements for narrative reason enrichment. */
  causalStatements?: readonly CausalStatementData[]
}

const MAX_NEXT_STEPS = 5

// Exploration Guide（探索向导）— deterministic navigation, NOT a chat/assistant.
// Renders the GuideSnapshot: current position / next graph-reachable steps with
// reasons / exploration coverage. Presentational only — all logic lives in the
// pure functions of data/explorationGuide.ts.
export default function GuidePanel({
  pkg,
  visited,
  locale = 'zh',
  onEntityClick,
  onNextClick,
  causalStatements,
}: GuidePanelProps) {
  const { t } = useLocale()
  const snap = getGuideSnapshot(pkg, visited, locale, causalStatements)
  if (!snap.position) return null

  const entityName = (gid: string) => getEntityDisplayName(gid, locale)

  return (
    <section className="guide-panel" data-testid="exploration-guide" aria-label={t('guide.title')}>
      <h3 className="guide-title">{t('guide.title')}</h3>
      <p className="guide-sub">{t('guide.subtitle')}</p>

      <div className="guide-position">
        <span className="guide-position-label">{t('guide.positionLabel')}</span>
        <Button
          variant="text"
          className="guide-position-value"
          onClick={() => onEntityClick?.(snap.position!.entityGlobalId)}
        >
          {snap.position.name}
        </Button>
        {snap.position.atEntry && (
          <span className="guide-position-hint">{t('guide.entryHint')}</span>
        )}
      </div>

      {snap.nextSteps.length > 0 && (
        <div className="guide-next">
          <p className="guide-next-label">{t('guide.nextLabel')}</p>
          <ul className="guide-next-list">
            {snap.nextSteps.slice(0, MAX_NEXT_STEPS).map((step, i) => (
              <li key={i} className="guide-next-item">
                <Button
                  variant="ghost"
                  className="guide-next-btn"
                  onClick={() => {
                    // M83.1 — track cs_guide_next when CS reason is present
                    if (step.causal?.id) {
                      recordEvent({ action: 'cs_guide_next', causalId: step.causal.id })
                    }
                    onEntityClick?.(step.edge.to)
                    onNextClick?.(step.edge.to)
                  }}
                >
                  <span className="guide-next-arrow">
                    {entityName(step.edge.from)} {getRelationshipLabel(step.edge.type, locale)}{' '}
                    {step.toName}
                  </span>
                  <span className="guide-next-cta">{t('guide.nextCta', { name: step.toName })}</span>
                </Button>
                <p className="guide-next-reason">{step.reason}</p>
                {/* M82 P2 — show full CausalStatementCard when CS exists */}
                {step.causal && (
                  <CausalStatementCard cs={step.causal} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="guide-coverage">
        <span className="guide-coverage-text">
          {t('guide.coverageText', {
            visitedEntities: String(snap.coverage.visitedEntities),
            totalEntities: String(snap.coverage.totalEntities),
            visitedRelationships: String(snap.coverage.visitedRelationships),
            totalRelationships: String(snap.coverage.totalRelationships),
            entityPercent: String(snap.coverage.entityPercent),
          })}
        </span>
        {snap.nextSteps.length === 0 && (
          <span className="guide-coverage-done">{t('guide.doneText')}</span>
        )}
      </div>
    </section>
  )
}
