import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider } from '../data/locale'
import GraphViewPanel from './GraphViewPanel'

const r2s = renderToStaticMarkup
const render = (el: Parameters<typeof r2s>[0]) => r2s(<LocaleProvider>{el}</LocaleProvider>)

// M34-A2: the SVG renderer is asserted via renderToStaticMarkup (no DOM),
// matching the repo's environment:'node' test style.
const main = { id: 'person-augustus', name: 'Augustus', type: 'Person' }

const related = [
  {
    id: 'event-roman-empire-established',
    type: 'Event',
    relationship: 'participated_in',
    name: 'Roman Empire Established',
  },
  { id: 'loc-rome', type: 'Location', relationship: 'located_in', name: 'Rome' },
]

describe('GraphViewPanel (M34-A2)', () => {
  it('renders an SVG graph titled and captioned', () => {
    const html = render(
      <GraphViewPanel mainEntity={main} relatedEntities={related} />,
    )
    expect(html).toContain('知识图谱')
    expect(html).toContain('<svg')
    expect(html).toContain('aria-label="Augustus 的知识图谱"')
    // Caption reports the direct-connection count.
    expect(html).toContain('2 个直接关联')
  })

  it('draws the main entity and its neighbours as nodes', () => {
    const html = render(
      <GraphViewPanel mainEntity={main} relatedEntities={related} />,
    )
    expect(html).toContain('Augustus')
    expect(html).toContain('Roman Empire Establ') // shortened label prefix
    expect(html).toContain('Rome')
    // One <line> per edge (2 neighbours → 2 edges).
    expect((html.match(/<line/g) || []).length).toBe(2)
  })

  it('marks neighbour nodes clickable when onEntityClick is provided', () => {
    const html = render(
      <GraphViewPanel
        mainEntity={main}
        relatedEntities={related}
        onEntityClick={() => {}}
      />,
    )
    expect(html).toContain('role="button"')
    expect(html).toContain('打开 Roman Empire Established')
    expect(html).toContain('打开 Rome')
  })

  it('does not mark nodes clickable without an onEntityClick handler', () => {
    const html = render(
      <GraphViewPanel mainEntity={main} relatedEntities={related} />,
    )
    expect(html).not.toContain('role="button"')
  })

  it('resolves neighbour names via nameById when the neighbour omits a name', () => {
    const html = render(
      <GraphViewPanel
        mainEntity={main}
        relatedEntities={[
          { id: 'loc-rome', type: 'Location', relationship: 'located_in' },
        ]}
        nameById={{ 'loc-rome': 'Rome' }}
      />,
    )
    expect(html).toContain('Rome')
  })

  it('shows an empty-connections caption for a lone main entity', () => {
    const html = render(
      <GraphViewPanel mainEntity={main} relatedEntities={[]} />,
    )
    expect(html).toContain('目前没有直接关联可绘制')
    // Still renders the main node.
    expect(html).toContain('Augustus')
  })

  it('returns nothing when there is no main entity', () => {
    const html = render(
      // @ts-expect-error deliberately invalid main entity for the guard test
      <GraphViewPanel mainEntity={{}} relatedEntities={related} />,
    )
    expect(html).toBe('')
  })
})
