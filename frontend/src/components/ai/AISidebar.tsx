// ============================================================
// M59-011 — AISidebar
// AI Historian Companion. Collapsible sidebar panel.
// Shell only — no real AI calls. Future wire point for
// HistorianChat + AIExplanationPanel unification.
// Pure presentational.
// ============================================================

import { useState } from 'react'
import type { AIContext } from '../../data/ai/AIContext'
import { getSuggestedCapabilities, getCapabilitiesForContext } from '../../data/ai/AIRegistry'

interface AISidebarProps {
  context: AIContext | null
}

export function AISidebar({ context }: AISidebarProps) {
  const [expanded, setExpanded] = useState(false)

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

  const suggestions = getSuggestedCapabilities(context)
  const availableCaps = getCapabilitiesForContext(context)

  return (
    <div className="ais ais-expanded">
      {/* Header */}
      <div className="ais-header">
        <div className="ais-header-left">
          <span className="ais-icon">💬</span>
          <div>
            <span className="ais-title">AI Historian</span>
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

      {/* Context summary */}
      <div className="ais-context">
        <span className="ais-context-label">
          {context.entity.type} · {context.entity.timeLabel}
        </span>
        {context.entity.locationLabel && (
          <span className="ais-context-label">{context.entity.locationLabel}</span>
        )}
        <span className="ais-context-label">{context.currentView} view</span>
      </div>

      {/* AI-generated prompts from Capability Registry */}
      {suggestions.length > 0 && (
        <div className="ais-suggestions">
          <span className="ais-suggestion-label">可以问我</span>
          {suggestions.map((s, i) => (
            <div key={i} className="ais-suggestion" role="button" tabIndex={0}>
              {s}
            </div>
          ))}
        </div>
      )}

      {/* Available capabilities as tags */}
      <div className="ais-actions">
        {availableCaps.map((cap) => (
          <span key={cap.id} className="ais-action-tag" title={cap.description}>
            {cap.name}
          </span>
        ))}
      </div>

      {/* Future: chat input */}
      <div className="ais-input">
        <input
          type="text"
          placeholder={`Ask about ${context.entity.name}...`}
          disabled
          className="ais-input-field"
        />
        <span className="ais-input-hint">AI 对话即将上线</span>
      </div>
    </div>
  )
}

export default AISidebar
