import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import InterpretationPanel from '../components/InterpretationPanel'
import { InterpretationViewModel } from '../data/interpretationFormatter'
import type { UnderstandingViewModel } from '../data/understandingRules'

// M5-A-6: InterpretationPanel is a pure presentational component. As with the
// other panels, we assert on the static markup (no jsdom, no snapshot). Click
// wiring is verified structurally via data-node + aria-label (the click
// surface); the panel never imports navigation.
const vms: InterpretationViewModel[] = [
  {
    global_id: 'silk_road:han_dynasty',
    localName: 'han_dynasty',
    depth: 2,
    score: 0.81,
    explanation: 'Connected through overland trade routes.',
  },
  {
    global_id: 'roman_empire:rome',
    localName: 'rome',
    depth: 1,
    score: 0.9,
    explanation: 'Central hub of the empire.',
  },
]

describe('InterpretationPanel (M5-A-6)', () => {
  it('Case1: renders title, localName, score and explanation', () => {
    const html = renderToStaticMarkup(
      <InterpretationPanel interpretations={vms} />,
    )
    expect(html).toContain('Why these connections are worth exploring')
    expect(html).toContain('han_dynasty')
    expect(html).toContain('score 0.81')
    expect(html).toContain('Connected through overland trade routes.')
  })

  it('Case2: renders nothing for empty / absent interpretations (no empty shell)', () => {
    expect(renderToStaticMarkup(<InterpretationPanel interpretations={[]} />)).toBe('')
    expect(renderToStaticMarkup(<InterpretationPanel />)).toBe('')
  })

  it('Case3: preserves input order across multiple items', () => {
    const html = renderToStaticMarkup(
      <InterpretationPanel interpretations={vms} />,
    )
    expect(html.indexOf('han_dynasty')).toBeLessThan(html.indexOf('rome'))
  })

  it('Case4: clickable nodes carry data-node and aria-label when onNodeClick is provided', () => {
    const html = renderToStaticMarkup(
      <InterpretationPanel interpretations={vms} onNodeClick={() => {}} />,
    )
    expect(html).toContain('data-node="silk_road:han_dynasty"')
    expect(html).toContain('aria-label="Open han_dynasty"')
    expect(html).toContain('<button')
  })

  it('Case5: renders non-interactive names (no button) when onNodeClick is absent', () => {
    const html = renderToStaticMarkup(
      <InterpretationPanel interpretations={vms} />,
    )
    expect(html).not.toContain('<button')
    expect(html).not.toContain('data-node')
    // static name still shown
    expect(html).toContain('han_dynasty')
  })

  // --- M5-D: Historical Meaning layer (additive) -------------------------
  const understandings: UnderstandingViewModel[] = [
    {
      relationType: 'conquered',
      direction: 'forward',
      actor: 'Rome',
      target: 'Greece',
      targetType: 'polity',
      meaning: 'Rome conquered Greece, imposing its order and reshaping it.',
      perspective: 'as conqueror',
    },
  ]

  it('M5-D Case6: renders Historical Meaning block AND preserves existing interpretations (additive)', () => {
    const html = renderToStaticMarkup(
      <InterpretationPanel interpretations={vms} understandings={understandings} onNodeClick={() => {}} />,
    )
    // New Historical Meaning layer present
    expect(html).toContain('Historical Meaning')
    expect(html).toContain('Rome conquered Greece')
    expect(html).toContain('as conqueror')
    // Existing interpretation layer still rendered (additive, not replacing)
    expect(html).toContain('data-node="silk_road:han_dynasty"')
    expect(html).toContain('han_dynasty')
    expect(html).toContain('Connected through overland trade routes.')
  })

  it('M5-D Case7: empty understandings array renders nothing (no empty shell)', () => {
    expect(renderToStaticMarkup(<InterpretationPanel understandings={[]} />)).toBe('')
  })

  it('M5-D Case8: old behavior preserved when understandings absent', () => {
    // Re-run the original Case1 assertion shape to guard against regression.
    const html = renderToStaticMarkup(
      <InterpretationPanel interpretations={vms} />,
    )
    expect(html).toContain('Why these connections are worth exploring')
    expect(html).toContain('han_dynasty')
    expect(html).not.toContain('Historical Meaning')
  })
})
