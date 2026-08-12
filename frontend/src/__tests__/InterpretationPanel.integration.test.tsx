import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup as r2s } from 'react-dom/server'
import type { ReactElement } from 'react'
import { LocaleProvider } from '../data/locale'
import ConnectionsExplainedPanel, {
  ConnectionExplained,
} from '../components/ConnectionsExplainedPanel'
import ExplorationPathsPanel from '../components/ExplorationPathsPanel'
import InterpretationPanel from '../components/InterpretationPanel'
import { toInterpretationViewModels } from '../data/interpretationFormatter'

const render = (el: ReactElement) => r2s(<LocaleProvider>{el}</LocaleProvider>)

// M5-A-6: verify the frozen panel order (WHAT -> WHY -> HOW) for both the Topic
// and Entity views, using the same real ConnectionExplained shape both panels
// consume, and confirm ConnectionsExplainedPanel output is NOT altered by the
// additive InterpretationPanel.
const connections: ConnectionExplained[] = [
  {
    global_id: 'silk_road:han_dynasty',
    depth: 2,
    path: ['roman_empire:rome', 'silk_road:han_dynasty'],
    steps: [
      {
        from_global_id: 'roman_empire:rome',
        to_global_id: 'silk_road:han_dynasty',
        relationship: 'traded_with',
        direction: 'outgoing',
      },
    ],
    score: 0.81,
    score_breakdown: {},
    explanation: 'Connected through overland trade routes.',
  },
]

function Stack() {
  // Mirrors the frozen order shared by App.tsx (Topic) and EntityPage (Entity):
  // ConnectionsExplained -> Interpretation -> ExplorationPaths
  return (
    <div>
      <ConnectionsExplainedPanel connections={connections} />
      <InterpretationPanel
        interpretations={toInterpretationViewModels(connections)}
        onNodeClick={() => {}}
      />
      <ExplorationPathsPanel connections={connections} onNodeClick={() => {}} />
    </div>
  )
}

describe('InterpretationPanel integration (M5-A-6)', () => {
  it('renders panels in the frozen WHAT -> WHY -> HOW order', () => {
    const html = render(<Stack />)
    const what = html.indexOf('可解释关联')
    const why = html.indexOf('关联解读')
    const how = html.indexOf('探索路径')
    expect(what).toBeGreaterThan(-1)
    expect(why).toBeGreaterThan(-1)
    expect(how).toBeGreaterThan(-1)
    expect(what).toBeLessThan(why)
    expect(why).toBeLessThan(how)
  })

  it('does not change ConnectionsExplainedPanel output (isolation)', () => {
    const standalone = render(
      <ConnectionsExplainedPanel connections={connections} />,
    )
    const stacked = render(<Stack />)
    // the standalone ConnectionsExplained markup still appears intact inside the stack
    expect(stacked).toContain(standalone)
  })
})
