// ============================================================
// M90.3 Stage B-2 — Global Bar
//
// Renders: system identity (fixed) + current topic name.
// Data source: router.route.topic + topic title map.
//
// Stage E will add: global search, topic switcher dropdown.
// ============================================================

import { useMemo } from 'react'

interface GlobalBarProps {
  /** Current topic slug from the Router. */
  topic: string | null
  /**
   * Optional topic title map. When missing, renders the slug as-is.
   * In Stage C this becomes a proper topic resolver.
   */
  topicTitles?: Record<string, string>
}

export function GlobalBar({ topic, topicTitles }: GlobalBarProps) {
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
    </div>
  )
}
