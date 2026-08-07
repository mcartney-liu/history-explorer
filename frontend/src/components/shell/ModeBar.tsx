// ============================================================
// M90.3 Stage B-2 — Mode Bar
//
// Renders: 4-mode selector (Exploration / Explanation /
// Relationship / Understanding). Highlights the active mode
// and dispatches mode switches via Router.navigate().
//
// Data source: router.route.mode + router.navigate().
//
// This is the primary mode-switching UI. Per M90 Architecture:
//   Mode ≠ Page — it changes the perspective on the SAME topic.
//   Switching modes preserves the topic and focus.
//
// Stage C will: replace the inline tab styles with a proper
// ModeBar Primitive and add mode-specific tooltips.
// ============================================================

import { MODE_REGISTRY, type ExperienceMode, type RouteState } from '../../routing'

interface ModeBarProps {
  /** Current mode from the Router. */
  currentMode: ExperienceMode | null
  /** Current topic from the Router (needed to preserve on mode switch). */
  currentTopic: string | null
  /** Current focus from the Router (needed to preserve on mode switch). */
  currentFocus: string | null
  /** Navigate to a new mode, preserving topic and focus. */
  onModeChange: (state: RouteState) => void
}

const MODE_LABELS: Record<ExperienceMode, { zh: string; en: string }> = {
  exploration: { zh: '探索', en: 'Explore' },
  explanation: { zh: '解释', en: 'Explain' },
  relationship: { zh: '关系', en: 'Connect' },
  understanding: { zh: '理解', en: 'Understand' },
}

export function ModeBar({ currentMode, currentTopic, currentFocus, onModeChange }: ModeBarProps) {
  const handleModeClick = (mode: ExperienceMode) => {
    if (!currentTopic) return
    onModeChange({ topic: currentTopic, mode, focus: currentFocus })
  }

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
      {MODE_REGISTRY.map((mode) => {
        const isActive = mode === currentMode
        const label = MODE_LABELS[mode]
        return (
          <button
            key={mode}
            type="button"
            onClick={() => handleModeClick(mode)}
            disabled={!currentTopic}
            title={label.en}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm, 6px)',
              fontSize: '0.8rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--color-accent)' : 'var(--color-ink-500)',
              background: isActive ? 'var(--color-accent-soft)' : 'transparent',
              border: isActive
                ? '1px solid var(--color-accent-soft)'
                : '1px solid transparent',
              cursor: currentTopic ? 'pointer' : 'default',
              opacity: currentTopic ? 1 : 0.5,
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            {label.zh}
          </button>
        )
      })}
    </div>
  )
}
