// ============================================================
// M59-017 — ExplorationGuide (P-U17 重写)
// 知识概览区：展示实体关联数据 + 可点击入口。
// 用户语言替代技术术语，统计标签可跳转到对应面板。
// A4 (ADR-0025): 移除组件内 nextNode 自算与"推荐探索"卡（禁 UI 自算推荐）；
//   组件只消费上游传入结果，展示层零决策。
// ============================================================

import type { GraphNode, GraphEdge } from '../../data/entity/entityTypes'
import { Icon } from '../ui/Icon'
import { useLocale } from '../../data/locale'

interface ExplorationGuideProps {
  /** Current entity name */
  entityName: string
  /** All graph nodes */
  nodes: GraphNode[]
  /** All graph edges */
  edges: GraphEdge[]
  /** Already visited entity ids */
  visitedIds?: string[]
  /** Total timeline events */
  timelineCount: number
  /** 点击"关联实体/条关系"入口 */
  onViewRelations?: () => void
  /** 点击"时间节点"入口 */
  onViewTimeline?: () => void
}

export function ExplorationGuide({
  entityName,
  nodes,
  edges,
  visitedIds = [],
  timelineCount,
  onViewRelations,
  onViewTimeline,
}: ExplorationGuideProps) {
  const { t } = useLocale()
  const totalRelations = edges.length
  const totalRelated = nodes.filter((n) => n.id !== entityName && n.name !== entityName).length
  const visitedCount = visitedIds.length

  // Exploration depth: 0–4 based on visited + connections
  const depth = Math.min(4, visitedCount + (totalRelated > 0 ? 1 : 0))

  return (
    <section className="eg" aria-label={t('entity.explore')}>
      {/* 标题 + 引导语 */}
      <div className="eg-header">
        <span className="eg-title">知识概览</span>
        <span className="eg-hint">这个实体在知识网络中的位置与关联</span>
      </div>

      {/* 探索深度指示器 */}
      <div className="eg-progress">
        <div className="eg-progress-label">探索深度</div>
        <div className="eg-progress-track">
          <div className="eg-progress-bar" style={{ width: `${(depth / 4) * 100}%` }} />
        </div>
        <span className="eg-progress-text">{depth}/4</span>
      </div>

      <div className="eg-body">
        {/* 可点击统计入口 */}
        <div className="eg-stats">
          <button type="button" className="eg-stat eg-stat--clickable" onClick={onViewRelations} disabled={!onViewRelations}>
            <Icon name="person" size={16} className="eg-stat-icon" />
            <span className="eg-stat-value">{totalRelated}</span>
            <span className="eg-stat-label">{t('entity.relations')}</span>
          </button>
          <button type="button" className="eg-stat eg-stat--clickable" onClick={onViewRelations} disabled={!onViewRelations}>
            <Icon name="link" size={16} className="eg-stat-icon" />
            <span className="eg-stat-value">{totalRelations}</span>
            <span className="eg-stat-label">{t('entity.relations_count')}</span>
          </button>
          <button type="button" className="eg-stat eg-stat--clickable" onClick={onViewTimeline} disabled={!onViewTimeline}>
            <Icon name="timeline" size={16} className="eg-stat-icon" />
            <span className="eg-stat-value">{timelineCount}</span>
            <span className="eg-stat-label">{t('entity.timeline_count')}</span>
          </button>
        </div>

        {/* Exploration path */}
        {visitedIds.length > 0 && (
          <div className="eg-path">
            <span className="eg-path-label">探索路径</span>
            <div className="eg-path-items">
              {visitedIds.slice(-4).map((id, i) => (
                <span key={id} className="eg-path-step">
                  {i > 0 && <span className="eg-path-arr">→</span>}
                  <span className="eg-path-name">{id}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default ExplorationGuide
