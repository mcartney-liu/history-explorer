import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ExplorationPathsPanel from '../components/ExplorationPathsPanel'
import { ConnectionExplained } from '../components/ConnectionsExplainedPanel'

describe('ExplorationPathsPanel (M3.5-004)', () => {
  it('renders nothing when connections are absent (additive, non-breaking)', () => {
    const html = renderToStaticMarkup(<ExplorationPathsPanel />)
    expect(html).toBe('')
  })

  it('renders a left-to-right chain of clickable node chips joined by edges', () => {
    const connections: ConnectionExplained[] = [
      {
        global_id: 'silk_road:han_dynasty',
        depth: 2,
        path: ['roman_empire:rome', 'silk_road:silk_road', 'roman_empire:han_dynasty'],
        steps: [
          {
            from_global_id: 'roman_empire:rome',
            to_global_id: 'silk_road:silk_road',
            relationship: 'traded_with',
            direction: 'outgoing',
            weight: 1,
          },
          {
            from_global_id: 'silk_road:silk_road',
            to_global_id: 'roman_empire:han_dynasty',
            relationship: 'spread',
            direction: 'outgoing',
            weight: 1,
          },
        ],
        score: 0.81,
        score_breakdown: {},
        explanation: 'Rome reached Han via the Silk Road.',
      },
    ]
    const html = renderToStaticMarkup(
      <ExplorationPathsPanel connections={connections} />,
    )
    // Heading present.
    expect(html).toContain('Exploration Paths')
    // All three path nodes rendered (local names after ':').
    expect(html).toContain('rome')
    expect(html).toContain('silk_road')
    expect(html).toContain('han_dynasty')
    // Relationship edges rendered with relationship + direction.
    expect(html).toContain('[traded_with outgoing]')
    expect(html).toContain('[spread outgoing]')
    // Each node is a cross-topic clickable button carrying its global_id.
    expect(html).toContain('aria-label="Open rome"')
    expect(html).toContain('aria-label="Open silk_road"')
  })

  it('is defensive: missing steps still render nodes with a plain connector', () => {
    const connections: ConnectionExplained[] = [
      {
        global_id: 'roman_empire:egypt',
        depth: 1,
        path: ['roman_empire:rome', 'roman_empire:egypt'],
        steps: [],
        score: 0.5,
        score_breakdown: {},
        explanation: '',
      },
    ]
    const html = renderToStaticMarkup(
      <ExplorationPathsPanel connections={connections} />,
    )
    expect(html).toContain('rome')
    expect(html).toContain('egypt')
    // No bracketed edge label when steps are absent; nodes still present.
    expect(html).not.toContain('[')
  })
})
