// ============================================================
// M65 Phase 2B — CompanionRouter
// Routes activeMode to the corresponding AI View component.
// Commit 3: View routing established. Container state → future commit.
// Views receive minimal idle-state props; no external API calls.
// ============================================================

import { useCompanion } from './CompanionContext'
import { AIExplanationView, type AIExplanationViewProps } from '../AIExplanationPanel'
import { HistorianChatView } from '../HistorianChat'
import { ResearchPanelView } from '../ResearchPanel'
import { ResearchDiscoveryPanelView } from '../ResearchDiscoveryPanel'

export function CompanionRouter() {
  const { state } = useCompanion()
  const { activeMode } = state

  switch (activeMode) {
    case 'explain': {
      const props: AIExplanationViewProps = {
        status: 'idle',
        question: '',
        response: null,
        error: '',
        contextCount: 0,
        promptMode: 'explain',
        onQuestionChange: () => {},
        onAsk: () => {},
        onModeChange: () => {},
      }
      return <AIExplanationView {...props} />
    }

    case 'chat':
      return (
        <HistorianChatView
          entityGlobalId=""
          entityName=""
          entityType=""
          status="idle"
          messages={[]}
          error=""
          onAsk={() => {}}
          onClear={() => {}}
        />
      )

    case 'research':
      return (
        <ResearchPanelView
          entityGlobalId=""
          entityName=""
          entityType=""
          relationships={[]}
          mode="idle"
          dimensions={[]}
          onStart={() => {}}
          onReset={() => {}}
        />
      )

    case 'discover':
      return (
        <ResearchDiscoveryPanelView
          currentEntity={{ globalId: '', name: '', type: '' }}
          relationships={[]}
          onExplore={() => {}}
          recommendations={[]}
          insightText={null}
        />
      )

    default:
      return null
  }
}

export default CompanionRouter
