/** M85.8 — CausalObjectDetailPage — Explorer Experience Alpha.

Three-act narrative arc:
  Act 1 — Understanding: why it happened, what impact it had
  Act 2 — Connections: why these objects are worth exploring together (M85)
  Act 3 — Exploration: where to go next

Design principles:
- Not an encyclopedia page — focused on "understand → connect → explore"
- Understanding Layer has independent visual identity (Act 2)
- "Continue Exploring" is NOT a recommendation engine
- Architecture v3: Fact → Explanation → Understanding → Exploration
*/
import { useEffect } from 'react'
import type { CausalObjectData } from '../../data/causalStatement'
import { confidenceLabelKey } from '../../data/causalStatement'
import { useLocale } from '../../data/locale'
import { recordEvent } from '../../data/UserBehaviorEvent'
import LayerBadge from '../common/LayerBadge'

interface CausalObjectDetailPageProps {
  object: CausalObjectData
  /** Map from object_id to human-readable title. */
  objectTitleMap?: Record<string, string>
  onEntityClick?: (gid: string) => void
  onCausalObjectClick?: (objectId: string) => void
  onBack?: () => void
}

/** Human-readable labels for relation_type values. */
const RELATION_TYPE_LABELS: Record<string, string> = {
  institutional_evolution: '制度演化',
  technological_chain: '技术链',
  civilization_contrast: '文明对比',
  ideological_influence: '思想影响',
}

export default function CausalObjectDetailPage({
  object,
  objectTitleMap,
  onEntityClick,
  onCausalObjectClick,
  onBack,
}: CausalObjectDetailPageProps) {
  const { t } = useLocale()

  // M84 — co_detail_open on mount
  useEffect(() => {
    recordEvent({ action: 'co_detail_open', causalId: object.id })
  }, [object.id])

  const handleEntityClick = (gid: string) => {
    recordEvent({ action: 'co_entity_follow', causalId: object.id })
    onEntityClick?.(gid)
  }

  const handleRelatedObjectClick = (targetId: string) => {
    recordEvent({ action: 'co_related_object_click', causalId: object.id })
    onCausalObjectClick?.(targetId)
  }

  const resolveObjectTitle = (id: string): string =>
    objectTitleMap?.[id] ?? id

  return (
    <div className="co-explorer-experience" data-testid="causal-object-detail">
      {/* ═══ Header ═══ */}
      <div className="co-experience-header">
        {onBack && (
          <button type="button" className="co-experience-back" onClick={onBack}>
            ← {t('common.back')}
          </button>
        )}
        <LayerBadge layer="causal" />
        {object.confidence && (
          <span className={`causal-confidence causal-confidence--${object.confidence}`}>
            {t(confidenceLabelKey(object.confidence))}
          </span>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          Act 1 — Understanding (Explanation Layer)
          ═══════════════════════════════════════════ */}
      <div className="co-act co-act--understanding">
        {/* Mechanism */}
        {object.mechanism && (
          <section className="co-narrative-section">
            <h2 className="co-narrative-question">{t('causal.mechanism')}</h2>
            <p className="co-narrative-text">{object.mechanism}</p>
          </section>
        )}

        {/* Consequence */}
        {object.consequence && (
          <section className="co-narrative-section">
            <h2 className="co-narrative-question">{t('causal.consequence')}</h2>
            <p className="co-narrative-text">{object.consequence}</p>
          </section>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          Act 2 — Connections (Understanding Layer)
          ═══════════════════════════════════════════ */}
      {object.related_causal_objects && object.related_causal_objects.length > 0 && (
        <div className="co-act co-act--connections">
          <div className="co-act-divider" aria-hidden="true" />

          <section className="co-connections-section">
            <h2 className="co-connections-heading">
              {t('causal.understandingConnections')}
            </h2>
            <p className="co-connections-intro">
              {t('causal.whyExploreTogether')}
            </p>

            <div className="co-connections-grid">
              {object.related_causal_objects.map((ref, i) => (
                <button
                  key={`${ref.target_id}-${i}`}
                  type="button"
                  className="co-connection-card"
                  onClick={() => handleRelatedObjectClick(ref.target_id)}
                  data-testid={`co-related-${ref.target_id}`}
                >
                  <div className="co-connection-card-top">
                    <span
                      className="co-relation-tag"
                      data-relation-type={ref.relation_type}
                    >
                      {RELATION_TYPE_LABELS[ref.relation_type] ?? ref.relation_type}
                    </span>
                    <span className="co-connection-target-name">
                      {resolveObjectTitle(ref.target_id)}
                    </span>
                  </div>
                  <p className="co-connection-explanation">{ref.explanation}</p>
                  <span className="co-connection-cta">
                    {t('causal.exploreObject', { name: resolveObjectTitle(ref.target_id) })}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Act 3 — Exploration (Continue Exploring)
          ═══════════════════════════════════════════ */}
      <div className="co-act co-act--exploration">
        <div className="co-act-divider" aria-hidden="true" />

        <section className="co-explore-section">
          <h2 className="co-explore-heading">
            {t('causal.continueExploring')}
          </h2>
          <p className="co-explore-intro">
            {t('causal.fromHereExplore')}
          </p>

          {/* Related Entities as cards */}
          {object.related_entities.length > 0 && (
            <div className="co-explore-entity-grid">
              {object.related_entities.map((gid) => (
                <button
                  key={gid}
                  type="button"
                  className="co-explore-entity-card"
                  onClick={() => handleEntityClick(gid)}
                >
                  <span className="co-explore-entity-name">{gid}</span>
                </button>
              ))}
            </div>
          )}

          {/* Exploration Paths as arrow list */}
          {object.exploration_paths.length > 0 && (
            <div className="co-explore-paths">
              {object.exploration_paths.map((path, i) => (
                <button
                  key={i}
                  type="button"
                  className="co-explore-path-item"
                  onClick={() => handleEntityClick(path.to)}
                >
                  <span className="co-explore-path-arrow">→</span>
                  <span className="co-explore-path-label">{path.label}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
