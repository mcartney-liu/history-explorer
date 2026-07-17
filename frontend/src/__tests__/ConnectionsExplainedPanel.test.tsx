import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ConnectionsExplainedPanel, {
  ConnectionExplained,
} from '../components/ConnectionsExplainedPanel'

describe('ConnectionsExplainedPanel (M3.5-004)', () => {
  it('renders nothing when connections are absent (additive, non-breaking)', () => {
    const html = renderToStaticMarkup(<ConnectionsExplainedPanel />)
    expect(html).toBe('')
  })

  it('renders the heading and resolved local names from global_id', () => {
    const connections: ConnectionExplained[] = [
      {
        global_id: 'silk_road:han_dynasty',
        depth: 2,
        path: [],
        steps: [],
        score: 0.81,
        score_breakdown: {},
        explanation: 'Connected through overland trade routes.',
      },
    ]
    const html = renderToStaticMarkup(
      <ConnectionsExplainedPanel connections={connections} />,
    )
    expect(html).toContain('Explainable Connections')
    expect(html).toContain('han_dynasty') // local name after ':'
    expect(html).toContain('depth 2')
    expect(html).toContain('score 0.81')
    expect(html).toContain('Connected through overland trade routes.')
  })

  it('is defensive: missing explanation falls back to global_id', () => {
    const connections: ConnectionExplained[] = [
      {
        global_id: 'roman_empire:rome',
        depth: 1,
        path: [],
        steps: [],
        score: 0.5,
        score_breakdown: {},
        explanation: '',
      },
    ]
    const html = renderToStaticMarkup(
      <ConnectionsExplainedPanel connections={connections} />,
    )
    expect(html).toContain('roman_empire:rome')
  })
})
