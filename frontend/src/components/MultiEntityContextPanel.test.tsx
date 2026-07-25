import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import MultiEntityContextPanel, {
  MultiEntityContextView,
  applyToggleSelection,
} from './MultiEntityContextPanel'

const CANDIDATES = ['egypt:person:1', 'egypt:place:2', 'egypt:event:3']

describe('MultiEntityContextView (M13)', () => {
  it('renders the heading and every candidate as an unchecked box', () => {
    const html = renderToStaticMarkup(
      <MultiEntityContextView
        candidateGids={CANDIDATES}
        selectedGids={[]}
        maxSelectable={8}
        onToggle={() => {}}
      />,
    )
    expect(html).toContain('AI 多实体联合解读')
    expect(html).toContain('已选 0/8')
    for (const gid of CANDIDATES) {
      expect(html).toContain(gid)
    }
  })

  it('marks selected candidates as checked and shows the count', () => {
    const html = renderToStaticMarkup(
      <MultiEntityContextView
        candidateGids={CANDIDATES}
        selectedGids={['egypt:person:1', 'egypt:event:3']}
        maxSelectable={8}
        onToggle={() => {}}
      />,
    )
    expect(html).toContain('已选 2/8')
    // The inner AIExplanationPanel renders an idle panel scoped to 2 entities.
    expect(html).toContain('基于当前探索上下文（2 个实体）')
  })

  it('disables unchecked boxes once the selection cap is reached (MAX_N is UI-only)', () => {
    const html = renderToStaticMarkup(
      <MultiEntityContextView
        candidateGids={CANDIDATES}
        selectedGids={['egypt:person:1', 'egypt:place:2']}
        maxSelectable={2}
        onToggle={() => {}}
      />,
    )
    // The unselected candidate (egypt:event:3) must be disabled at the cap.
    expect(html).toContain('disabled')
  })
})

describe('applyToggleSelection (M13 selection cap)', () => {
  it('adds a new gid when below the cap', () => {
    expect(applyToggleSelection(['a:1'], 'b:2', 8)).toEqual(['a:1', 'b:2'])
  })
  it('removes an already-selected gid', () => {
    expect(applyToggleSelection(['a:1', 'b:2'], 'a:1', 8)).toEqual(['b:2'])
  })
  it('does NOT exceed the cap when adding', () => {
    expect(applyToggleSelection(['a:1', 'b:2'], 'c:3', 2)).toEqual(['a:1', 'b:2'])
  })
})

describe('MultiEntityContextPanel container (M13)', () => {
  it('renders the initial idle state with no selection and a real candidate pool', () => {
    const html = renderToStaticMarkup(
      <MultiEntityContextPanel candidateGids={CANDIDATES} onCitationClick={() => {}} />,
    )
    expect(html).toContain('AI 多实体联合解读')
    expect(html).toContain('已选 0/8')
    // Local selection state — no global store, no context provider.
    expect(html).toContain('egypt:person:1')
  })
})
