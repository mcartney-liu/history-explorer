import { useMemo } from 'react'
import { generateRecommendations } from '../data/ResearchPlanner'
import { listResearch } from '../data/ResearchHistory'
import ResearchRecommendationCardView from './ResearchRecommendationCard'
import { generateResearchInsights, insightSummary } from '../data/ResearchInsights'
import type { EntityInfo, RelationshipInfo } from '../data/ResearchPlanner'

export type ResearchDiscoveryPanelProps = {
  currentEntity: EntityInfo
  relationships: RelationshipInfo[]
  onExplore?: (entityGlobalId: string) => void
}

export function ResearchDiscoveryPanelView({
  currentEntity,
  relationships,
  onExplore,
  // Stateful props for testability
  recommendations = [] as ReturnType<typeof generateRecommendations>,
  insightText = null as string | null,
}: ResearchDiscoveryPanelProps & {
  recommendations?: ReturnType<typeof generateRecommendations>
  insightText?: string | null
}) {
  return (
    <section className="rdp" aria-label="推荐探索">
      <h3 className="rdp-title">推荐探索</h3>
      <p className="rdp-subtitle">
        根据实体关系与您的研究历史，为您发现下一步探索方向。
      </p>

      {insightText && (
        <p className="rdp-insight">{insightText}</p>
      )}

      {recommendations.length === 0 ? (
        <p className="rdp-empty">
          暂无推荐探索。探索更多实体后，将为您发现新的关联路径。
        </p>
      ) : (
        <div className="rdp-cards">
          {recommendations.map((rec) => (
            <ResearchRecommendationCardView
              key={rec.entityGlobalId}
              recommendation={rec}
              onExplore={onExplore}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default function ResearchDiscoveryPanel(props: ResearchDiscoveryPanelProps) {
  const history = useMemo(() => listResearch(), [])
  const recommendations = useMemo(
    () =>
      generateRecommendations({
        currentEntity: props.currentEntity,
        relationships: props.relationships,
        researchHistory: history,
      }),
    [props.currentEntity.globalId, props.relationships.length],
  )
  const insightText = useMemo(
    () => insightSummary(generateResearchInsights(history)),
    [history.length],
  )

  return (
    <ResearchDiscoveryPanelView
      {...props}
      recommendations={recommendations}
      insightText={insightText}
    />
  )
}
