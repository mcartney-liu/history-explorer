// ============================================================
// M59-014 — AISidebar (upgraded)
// AI Historian Companion with full interaction flow.
// States: idle → action list → thinking → mock response.
// No real AI calls. Pure simulation shell.
// ============================================================

import { useState, useCallback } from 'react'
import type { AIContext } from '../../data/ai/AIContext'
import {
  createInteraction,
  startThinking,
  completeInteraction,
  getAvailableActions,
  type AIInteraction,
  type AIAction,
  type AIInteractionState,
} from '../../data/ai/AIAction'
import { executeAIActionAsync, type AIRequest } from '../../data/ai/AIOrchestrator'

interface AISidebarProps {
  context: AIContext | null
}

const STATE_MESSAGES: Record<AIInteractionState, string> = {
  idle: '',
  thinking: '分析中...\nAI 正根据当前历史上下文思考',
  explaining: '',
  answering: '',
  suggesting: '',
  researching: '',
  error: '',
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
          <span className="ais-icon">💬</span>
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
          <span className="ais-icon">💬</span>
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
          <span className="ais-icon">💬</span>
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
          <span className="ais-action-icon">{action.icon}</span>
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

// ---- Mock response generator (no real AI) ----
function generateMockResponse(action: AIAction, context: AIContext): string {
  const { name, type, timeLabel } = context.entity
  const other = context.data.relatedEntityNames.find((n) => n !== name) ?? 'another entity'

  switch (action.capability) {
    case 'explain_entity':
      return `${name} 是历史上重要的${type}。${timeLabel ? `活跃于 ${timeLabel}。` : ''}其影响深远，至今仍被历史学家研究。未来接入 AI 后将提供深度分析。`
    case 'explain_relation':
      return `${name} 与 ${other} 之间的历史关系是多层次的。这些关系反映了当时的政治、经济和军事格局。详细分析将在 AI 接入后呈现。`
    case 'explain_timeline':
      return `${name} 的时间线包含 ${context.data.timeline.length} 个关键节点。每个事件都关联着更广泛的历史脉络。AI 接入后将逐事件解读。`
    case 'compare_entities':
      return `${name} 与 ${other} 各有独特的历史地位。对比分析涵盖时间、空间、影响范围等维度。本功能将在 AI 接入后完整呈现。`
    case 'suggest_exploration':
      return `基于你对 ${name} 的探索，建议下一步了解 ${other}，以及它们之间的历史关联。AI 将自动推荐最具探索价值的路径。`
    case 'research_topic':
      return `围绕 ${name}，有多个值得深入研究的维度：政治制度、军事策略、文化影响、经济体系。选择任一方向开始深度探索。`
    case 'generate_story':
      return `${name} 的历史充满了戏剧性的转折。${timeLabel ? `在 ${timeLabel} 时期，` : ''}一系列事件塑造了今日我们所知的历史面貌。完整故事将在 AI 接入后生成。`
    case 'summarize_research':
      return `你对 ${name} 的探索涵盖了基本信息和相关实体。建议将探索成果整理为研究笔记，方便后续回顾和深入。`
    default:
      return 'AI Historian 已接收到你的问题，将在接入后提供答案。'
  }
}
