// M65 Phase 2C — ResearchSuite: unified Research panel-family entry point.
// Composition wrapper — delegates to sub-components transparently.
// All business logic stays in existing Research family components.
//
// This wraps the 4 Research panel-layer components that are currently internal
// to ResearchPanel. Phase 2C does NOT modify ResearchPanel — the wrapper is
// established here for future migration.
//
// Scope (PO-freezed boundary):
//   Panel Layer:  ResearchSummary, ResearchReport, ResearchDimensionCard,
//                 ResearchRecommendationCard
//   AI Layer:     ResearchPanel, ResearchDiscoveryPanel — NOT migrated here
//
// Uses `as any` casts to avoid re-exporting sub-component prop interfaces
// (same strategy as ExplorationPath / CrossTopicView).

import ResearchSummary from './ResearchSummary'
import ResearchReport from './ResearchReport'
import ResearchDimensionCard from './ResearchDimensionCard'
import ResearchRecommendationCard from './ResearchRecommendationCard'

type ViewName = 'summary' | 'report' | 'dimension' | 'recommendation'

export type ResearchSuiteProps =
  | { view: 'summary'; [key: string]: unknown }
  | { view: 'report'; [key: string]: unknown }
  | { view: 'dimension'; [key: string]: unknown }
  | { view: 'recommendation'; [key: string]: unknown }

/**
 * Unified Research panel-family entry. Delegates to:
 *   view="summary"        → ResearchSummary
 *   view="report"         → ResearchReport
 *   view="dimension"      → ResearchDimensionCard
 *   view="recommendation" → ResearchRecommendationCard
 */
export function ResearchSuite(props: ResearchSuiteProps) {
  const { view, ...rest } = props as ResearchSuiteProps & { view: ViewName }
  switch (view) {
    case 'summary':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <ResearchSummary {...(rest as any)} />
    case 'report':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <ResearchReport {...(rest as any)} />
    case 'dimension':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <ResearchDimensionCard {...(rest as any)} />
    case 'recommendation':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <ResearchRecommendationCard {...(rest as any)} />
  }
}

export default ResearchSuite
