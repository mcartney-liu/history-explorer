// ============================================================
// M65 Phase 2B — CompanionRouter
// Routes activeMode to the corresponding AI View component.
//
// M65 Phase 3C-1: Explain mode wired to real AI runtime via useCompanionAI.
// Chat / Research / Discover remain idle — activated in 3C-2.
// ============================================================

import { useState } from 'react'
import { useCompanion } from './CompanionContext'
import { useCompanionAI } from './useCompanionAI'
import { AIExplanationView, type AIExplanationViewProps } from '../AIExplanationPanel'
import { HistorianChatView } from '../HistorianChat'
import { ResearchPanelView } from '../ResearchPanel'
import { ResearchDiscoveryPanelView } from '../ResearchDiscoveryPanel'

export function CompanionRouter() {
  const { state, workspace } = useCompanion()
  const { activeMode } = state
  const { status, response, error, ask } = useCompanionAI()
  const [question, setQuestion] = useState('')

  const contextCount = workspace.currentEntityId ? 1 : 0

  switch (activeMode) {
    case 'explain': {
      const props: AIExplanationViewProps = {
        status: status as AIExplanationViewProps['status'],
        question,
        response,
        error,
        contextCount,
        promptMode: 'explain',
        onQuestionChange: setQuestion,
        onAsk: (q: string) => ask(q, 'explain'),
        onModeChange: () => {},
      }
      return <AIExplanationView {...props} />
    }

    case 'chat':
      return (
        <HistorianChatView
          entityGlobalId=""
          entityName={workspace.currentEntityName ?? ''}
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
