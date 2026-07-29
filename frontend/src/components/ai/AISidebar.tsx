// ============================================================
// M59-014 — AISidebar (upgraded)
// AI Historian Companion with full interaction flow.
// States: idle → action list → thinking → mock response.
// No real AI calls. Pure simulation shell.
// ============================================================

import { useState, useCallback } from 'react'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/Icon'
import type { AIContext } from '../../data/ai/AIContext'
import {
  createInteraction,
  startThinking,
  completeInteraction,
  getAvailableActions,
  type AIInteraction,
  type AIAction,
} from '../../data/ai/AIAction'
import { executeAIActionAsync, type AIRequest } from '../../data/ai/AIOrchestrator'

interface AISidebarProps {
  context: AIContext | null
}


export function AISidebar({ context }: AISidebarProps) {
  const [expanded, setExpanded] = useState(false)
  const [interaction, setInteraction] = useState<AIInteraction | null>(null)

  const handleAction = useCallback(
    (action: AIAction) => {
      if (!context) return
      let ix = createInteraction(action.capability, context)
      ix = startThinking(ix)
      setInteraction(ix)

      // Dispatch through AIOrchestrator (mock today → aiClient in production)
      const request: AIRequest = {
        actionId: action.id,
        capabilityId: action.capability,
        context,
      }
      executeAIActionAsync(request).then((result) => {
        ix = completeInteraction(ix, result.response, result.nextActions)
        setInteraction({ ...ix })
      })
    },
    [context],
  )

  const handleReset = useCallback(() => {
    setInteraction(null)
  }, [])

  if (!context) {
    return (
      <div className="ais">
        <div className="ais-collapsed" role="button" tabIndex={0}>
          <Icon name="chat" size={20} className="ais-icon" />
          <span className="ais-label">AI Historian</span>
          <span className="ais-hint">选择实体后可用</span>
        </div>
      </div>
    )
  }

  if (!expanded) {
    return (
      <div className="ais">
        <div
          className="ais-collapsed ais-ready"
          role="button"
          tabIndex={0}
          onClick={() => setExpanded(true)}
        >
          <Icon name="chat" size={20} className="ais-icon" />
          <span className="ais-label">Ask Historian</span>
          <span className="ais-entity-name">{context.entity.name}</span>
        </div>
      </div>
    )
  }

  const actions = getAvailableActions(context)

  return (
    <div className="ais ais-expanded">
      {/* Header */}
      <div className="ais-header">
        <div className="ais-header-left">
          <Icon name="chat" size={20} className="ais-icon" />
          <div>
            <span className="ais-title">AI Historian</span>
            <span className="ais-subtitle">你的历史研究伙伴</span>
            <span className="ais-entity-name">{context.entity.name}</span>
          </div>
        </div>
        <button
          type="button"
          className="ais-close"
          onClick={() => setExpanded(false)}
          aria-label="Close AI Historian"
        >
          ×
        </button>
      </div>

      {/* Context */}
      <div className="ais-context">
        <span className="ais-context-label">{context.entity.type}</span>
        {context.entity.timeLabel && (
          <span className="ais-context-label">{context.entity.timeLabel}</span>
        )}
      </div>

      {/* Interaction states */}
      {interaction ? (
        <InteractionView interaction={interaction} onReset={handleReset} />
      ) : (
        <ActionListView actions={actions} onAction={handleAction} />
      )}
    </div>
  )
}

// ---- Sub-views ----

function ActionListView({
  actions,
  onAction,
}: {
  actions: AIAction[]
  onAction: (action: AIAction) => void
}) {
  return (
    <div className="ais-actions-list">
      <span className="ais-suggestion-label">我可以帮你</span>
      {actions.map((action) => (
        <div
          key={action.id}
          className="ais-action-btn"
          role="button"
          tabIndex={0}
          onClick={() => onAction(action)}
        >
          <Icon name={action.icon as IconName} size={20} className="ais-action-icon" />
          <span>{action.label}</span>
        </div>
      ))}
    </div>
  )
}

function InteractionView({
  interaction,
  onReset,
}: {
  interaction: AIInteraction
  onReset: () => void
}) {
  if (interaction.state === 'thinking') {
    return (
      <div className="ais-thinking">
        <div className="ais-thinking-dot" />
        <span>正在分析历史上下文...</span>
      </div>
    )
  }

  if (interaction.state === 'error') {
    return (
      <div className="ais-error">
        <p>{interaction.error}</p>
        <button type="button" className="ais-retry-btn" onClick={onReset}>
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="ais-response">
      <p className="ais-response-text">{interaction.response}</p>
      {interaction.suggestedNextActions && (
        <div className="ais-next-actions">
          {interaction.suggestedNextActions.map((a, i) => (
            <span key={i} className="ais-next-tag" role="button" tabIndex={0}>
              {a} →
            </span>
          ))}
        </div>
      )}
      <button type="button" className="ais-retry-btn" onClick={onReset}>
        回到列表
      </button>
    </div>
  )
}

