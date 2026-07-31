import {
  getEntityDisplayName,
  type ExplorationPackage,
  type Locale,
} from '../../data/explorationPackages'
import { getGuideSnapshot } from '../../data/explorationGuide'
import { getRelationshipLabel } from '../../data/entity/entityLabels'

interface GuidePanelProps {
  pkg: ExplorationPackage
  /** visited entity global_ids (deduped trail, from behavior events) */
  visited: string[]
  locale?: Locale
  onEntityClick?: (gid: string) => void
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
}: GuidePanelProps) {
  const snap = getGuideSnapshot(pkg, visited, locale)
  if (!snap.position) return null

  const entityName = (gid: string) => getEntityDisplayName(gid, locale)

  return (
    <section className="guide-panel" data-testid="exploration-guide" aria-label="探索向导">
      <h3 className="guide-title">探索向导</h3>
      <p className="guide-sub">确定性导航：你现在在哪、下一步去哪、以及为什么。</p>

      <div className="guide-position">
        <span className="guide-position-label">你现在在</span>
        <button
          type="button"
          className="guide-position-value"
          onClick={() => onEntityClick?.(snap.position!.entityGlobalId)}
        >
          {snap.position.name}
        </button>
        {snap.position.atEntry && (
          <span className="guide-position-hint">（本包入口）</span>
        )}
      </div>

      {snap.nextSteps.length > 0 && (
        <div className="guide-next">
          <p className="guide-next-label">下一步可以探索</p>
          <ul className="guide-next-list">
            {snap.nextSteps.slice(0, MAX_NEXT_STEPS).map((step, i) => (
              <li key={i} className="guide-next-item">
                <button
                  type="button"
                  className="guide-next-btn"
                  onClick={() => onEntityClick?.(step.edge.to)}
                >
                  <span className="guide-next-arrow">
                    {entityName(step.edge.from)} {getRelationshipLabel(step.edge.type, locale)}{' '}
                    {step.toName}
                  </span>
                  <span className="guide-next-cta">查看 {step.toName} →</span>
                </button>
                <p className="guide-next-reason">{step.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="guide-coverage">
        <span className="guide-coverage-text">
          已探索 {snap.coverage.visitedEntities}/{snap.coverage.totalEntities} 实体 ·{' '}
          {snap.coverage.visitedRelationships}/{snap.coverage.totalRelationships} 关系 ·{' '}
          {snap.coverage.entityPercent}%
        </span>
        {snap.nextSteps.length === 0 && (
          <span className="guide-coverage-done">—— 本包探索已全部完成 🎉</span>
        )}
      </div>
    </section>
  )
}
