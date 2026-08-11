import { useMemo } from 'react'
import { useLocale } from '../data/locale'
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
  onExplore,
  // Stateful props for testability
  recommendations = [] as ReturnType<typeof generateRecommendations>,
  insightText = null as string | null,
}: ResearchDiscoveryPanelProps & {
  recommendations?: ReturnType<typeof generateRecommendations>
  insightText?: string | null
}) {
  const { t } = useLocale()
  return (
    <section className="rdp" aria-label={t('discover.recommendAria')}>
      <h3 className="rdp-title">{t('discover.recommendTitle')}</h3>
      <p className="rdp-subtitle">
        {t('discover.recommendSubtitle')}
      </p>

      {insightText && (
        <p className="rdp-insight">{insightText}</p>
      )}

      {recommendations.length === 0 ? (
        <p className="rdp-empty">
          {t('discover.recommendEmpty')}
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
