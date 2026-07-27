import type {
  ResearchRecommendation,
  RecommendationReason,
} from '../data/ResearchPlanner'

export type ResearchRecommendationCardProps = {
  recommendation: ResearchRecommendation
  onExplore?: (entityGlobalId: string) => void
}

function reasonText(reason: RecommendationReason): string {
  switch (reason.kind) {
    case 'related':
      return `关联关系：${reason.relationshipType} → ${reason.viaEntity}`
    case 'causal_chain':
      return `因果链：${reason.position === 'cause' ? '前因' : '后果'}关系`
    case 'comparison_candidate':
      return `适合对比研究：同为${reason.sharedType}类型`
    case 'from_history':
      return `基于您的研究历史：曾探索相关内容 ${reason.researchCount} 次`
    case 'similar_type':
      return `同类探索：更多${reason.entityType}类型实体`
  }
}

function reasonLabel(reason: RecommendationReason): string {
  switch (reason.kind) {
    case 'related':
      return '关联发现'
    case 'causal_chain':
      return '因果探索'
    case 'comparison_candidate':
      return '对比推荐'
    case 'from_history':
      return '历史推荐'
    case 'similar_type':
      return '同类推荐'
  }
}

export function ResearchRecommendationCardView({
  recommendation,
  onExplore,
}: ResearchRecommendationCardProps) {
  const { entityName, entityType, reason, suggestedDimensions, entityGlobalId } =
    recommendation

  return (
    <div className="rrc-card">
      {/* Header: label + entity info */}
      <div className="rrc-header">
        <span className="rrc-reason-label">{reasonLabel(reason)}</span>
      </div>

      <h4 className="rrc-entity-name">{entityName}</h4>
      <span className="rrc-entity-type">{entityType}</span>

      {/* Reason explanation */}
      <p className="rrc-reason">{reasonText(reason)}</p>

      {/* Suggested dimensions */}
      {suggestedDimensions.length > 0 && (
        <div className="rrc-dimensions">
          <span className="rrc-dimensions-label">建议研究方向：</span>
          <ul className="rrc-dimension-list">
            {suggestedDimensions.map((dim, i) => (
              <li key={i} className="rrc-dimension-item">
                {dim}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action */}
      <button
        type="button"
        className="rrc-explore-btn"
        aria-label={`探索 ${entityName}`}
        onClick={() => onExplore?.(entityGlobalId)}
      >
        探索
      </button>
    </div>
  )
}

export default ResearchRecommendationCardView
