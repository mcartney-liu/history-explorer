import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ExplorationTrail from '../components/ExplorationTrail'
import { NavNode } from '../components/navigation'

const noop = () => {}

describe('ExplorationTrail (M5-B-2)', () => {
  it('renders nothing for an empty or single-stop journey (additive)', () => {
    expect(
      renderToStaticMarkup(<ExplorationTrail history={[]} cursor={-1} onStepClick={noop} />),
    ).toBe('')
    const single: NavNode[] = [{ type: 'topic', topic: 'roman_empire', title: 'Roman Empire' }]
    expect(
      renderToStaticMarkup(<ExplorationTrail history={single} cursor={0} onStepClick={noop} />),
    ).toBe('')
  })

  it('renders the FULL visited history in order, each step clickable', () => {
    const history: NavNode[] = [
      { type: 'topic', topic: 'roman_empire', title: 'Roman Empire' },
      { type: 'entity', id: 'roman_empire:augustus', name: 'Augustus' },
      { type: 'entity', id: 'silk_road:han_dynasty', name: 'Han Dynasty' },
    ]
    const html = renderToStaticMarkup(
      <ExplorationTrail history={history} cursor={2} onStepClick={noop} />,
    )
    expect(html).toContain('Your Exploration Trail')
    expect(html).toContain('Roman Empire')
    expect(html).toContain('Augustus')
    expect(html).toContain('Han Dynasty')
    // Kinds shown for topic vs entity.
    expect(html).toContain('Topic')
    expect(html).toContain('Entity')
  })

  it('marks the current position (aria-current + is-current)', () => {
    const history: NavNode[] = [
      { type: 'topic', topic: 'roman_empire', title: 'Roman Empire' },
      { type: 'entity', id: 'roman_empire:augustus', name: 'Augustus' },
    ]
    const html = renderToStaticMarkup(
      <ExplorationTrail history={history} cursor={0} onStepClick={noop} />,
    )
    expect(html).toContain('is-current')
    expect(html).toContain('aria-current="step"')
    // The current node's label is exposed for return; the non-current invites return.
    expect(html).toContain('Current: Roman Empire')
    expect(html).toContain('Return to Augustus')
  })

  it('shows the full journey even beyond the cursor (unlike Breadcrumb)', () => {
    // Cursor is at index 0 but the history has forward entries: the trail still
    // shows all of them (Breadcrumb would truncate at the cursor).
    const history: NavNode[] = [
      { type: 'topic', topic: 'roman_empire', title: 'Roman Empire' },
      { type: 'entity', id: 'roman_empire:augustus', name: 'Augustus' },
      { type: 'entity', id: 'silk_road:han_dynasty', name: 'Han Dynasty' },
    ]
    const html = renderToStaticMarkup(
      <ExplorationTrail history={history} cursor={0} onStepClick={noop} />,
    )
    expect(html).toContain('Augustus')
    expect(html).toContain('Han Dynasty')
  })
})
