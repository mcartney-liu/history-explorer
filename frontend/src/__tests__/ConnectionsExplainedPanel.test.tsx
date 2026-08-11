import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider } from '../data/locale'
import ConnectionsExplainedPanel, {
  ConnectionExplained,
} from '../components/ConnectionsExplainedPanel'

const r2s = renderToStaticMarkup
const render = (el: Parameters<typeof r2s>[0]) => r2s(<LocaleProvider>{el}</LocaleProvider>)

describe('ConnectionsExplainedPanel (M3.5-004)', () => {
  it('renders nothing when connections are absent (additive, non-breaking)', () => {
    const html = render(<ConnectionsExplainedPanel />)
    expect(html).toBe('')
  })

  it('renders the heading and resolved local names from global_id', () => {
    const connections: ConnectionExplained[] = [
      {
        global_id: 'silk_road:han_dynasty',
        depth: 2,
        path: ['silk_road:han_dynasty', 'silk_road:rome'],
        steps: [
          { from_global_id: 'silk_road:han_dynasty', to_global_id: 'silk_road:rome', relationship: 'trade_route', direction: 'outgoing' },
        ],
        score: 0.81,
        score_breakdown: {},
        explanation: 'Connected through overland trade routes.',
      },
    ]
    const html = render(
      <ConnectionsExplainedPanel connections={connections} />,
    )
    expect(html).toContain('可解释关联')
    // Chain view renders pills with resolved display names (via getEntityDisplayName)
    expect(html).toContain('rel-pill')
    expect(html).toContain('rel-chain-row')
  })

  it('is defensive: missing explanation and path renders empty note', () => {
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
    const html = render(
      <ConnectionsExplainedPanel connections={connections} />,
    )
    // Empty path + empty explanation → chain view renders empty rel-chain-note
    expect(html).toContain('rel-chain-note')
    expect(html).toContain('可解释关联')
  })
})
