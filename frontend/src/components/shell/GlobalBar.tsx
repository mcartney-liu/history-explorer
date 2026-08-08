// ============================================================
// M90.3 Stage B-2 — Global Bar
//
// Renders: system identity (fixed) + current topic name + the
// active experience mode. This is the ONE place the user can
// always look to answer "where am I and what am I doing".
// Data source: router.route.topic + topic title map.
//
// Wave2-#141: mode label added so a topic view always carries
// its cognitive perspective (explore/explain/connect/understand).
//
// Stage E will add: global search, topic switcher dropdown.
// ============================================================

import { useMemo } from 'react'
import type { ExperienceMode } from '../../routing'

const MODE_LABELS: Record<ExperienceMode, string> = {
  exploration: '探索',
  explanation: '解释',
  relationship: '关系',
  understanding: '理解',
}

interface GlobalBarProps {
  /** Current topic slug from the Router. */
  topic: string | null
  /** Active experience mode — what the user is looking at the topic through. */
  mode?: ExperienceMode | null
  /**
   * Optional topic title map. When missing, renders the slug as-is.
   * In Stage C this becomes a proper topic resolver.
   */
  topicTitles?: Record<string, string>
}

export function GlobalBar({ topic, mode, topicTitles }: GlobalBarProps) {
  const title = useMemo(() => {
    if (!topic) return null
    return topicTitles?.[topic] ?? topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }, [topic, topicTitles])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{
        fontFamily: 'var(--serif, "Spectral", serif)',
        fontSize: '1rem',
        fontWeight: 700,
        color: 'var(--color-accent)',
      }}>
        History Explorer
      </span>
      {title && (
        <>
          <span style={{ color: 'var(--color-accent-soft)', fontSize: '0.9rem' }}>›</span>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-ink-500)' }}>{title}</span>
        </>
      )}
      {mode && (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '999px',
            color: 'var(--color-accent)',
            background: 'var(--color-accent-soft)',
            border: '1px solid var(--color-accent-soft)',
          }}
        >
          {MODE_LABELS[mode]}
        </span>
      )}
    </div>
  )
}
