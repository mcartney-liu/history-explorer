// ============================================================
// M65 Phase 2B/3C/3D — CompanionRouter
// Routes activeMode to the corresponding AI View component.
//
// M65 Phase 3C-1: Explain mode wired to real AI runtime.
// M65 Phase 3D-1: Chat mode activated — real messages + sendChat.
// Research / Discover remain idle.
// ============================================================

import { useState, useMemo } from 'react'
import { useCompanion } from './CompanionContext'
import { useCompanionAI } from './useCompanionAI'
import { AIExplanationView, type AIExplanationViewProps } from '../AIExplanationPanel'
import { HistorianChatView } from '../HistorianChat'
import { ResearchPanelView } from '../ResearchPanel'
import RecommendationPanel from '../RecommendationPanel'

export function CompanionRouter({ onNavigateEntity }: { onNavigateEntity?: (globalId: string) => void }) {
  const { state, workspace } = useCompanion()
  const { activeMode } = state
  const { status, response, error, ask, chatMessages, sendChat, clearChat } = useCompanionAI()
  const [question, setQuestion] = useState('')

  // Map CompanionContext status to View-compatible status union
  const chatStatus = status as 'idle' | 'loading' | 'error'

  const contextCount = workspace.currentEntityId ? 1 : 0

  // M65 Phase 3D-3: seen entity IDs for discover recommendation dedup
  const discoverSeenIds = useMemo(
    () => new Set(workspace.recentEntityIds ?? []),
    [workspace.recentEntityIds],
  )

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
          entityGlobalId={workspace.currentEntityId ?? ''}
          entityName={workspace.currentEntityName ?? ''}
          entityType={workspace.entityType ?? ''}
          status={chatStatus}
          messages={chatMessages}
          error={error}
          onAsk={(q: string) => sendChat(q)}
          onClear={clearChat}
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
      if (!workspace.currentEntityId) {
        return (
          <div className="companion-section">
            <p className="companion-hint">选择一个实体后，将为您发现相关探索方向。</p>
          </div>
        )
      }
      return (
        <RecommendationPanel
          entityId={workspace.currentEntityId}
          seenGlobalIds={discoverSeenIds}
          max={5}
          onNodeClick={(gid) => onNavigateEntity?.(gid)}
        />
      )

    default:
      return null
  }
}

export default CompanionRouter
