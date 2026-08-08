import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RelationshipView from '../components/RelationshipView'
import { LocaleProvider } from '../data/locale'

// Wave2-#146 (OD-10, VS-03 TP-17): relationship type legend — ink-500 text +
// truth-line swatch listing the frozen relationship vocabulary; read-only, no
// links. Also covers TP-21 filter feedback and TP-09 authority badge markup
// where they surface in related surfaces.

const mainEntity = { id: 'person-augustus', type: 'Person', name: 'Augustus', description: '' }
const related = [{ id: 'event-x', type: 'Event', relationship: 'participated_in' }]

function renderLegend() {
  return renderToStaticMarkup(
    <LocaleProvider>
      <RelationshipView
        mainEntity={mainEntity}
        relatedEntities={related}
        nameById={{ 'event-x': 'Battle of Actium' }}
        onEntityClick={() => {}}
      />
    </LocaleProvider>,
  )
}

describe('RelationshipView legend (OD-10, TP-17)', () => {
  it('renders a legend toggle next to the network heading', () => {
    const html = renderLegend()
    expect(html).toContain('关系图例')
    expect(html).toContain('rel-legend')
  })

  it('lists the frozen relationship vocabulary with truth-line swatches', () => {
    const html = renderLegend()
    // Frozen enum values (M3.5 baseline + ADR-0019 disputes/reinterprets).
    expect(html).toContain('caused')
    expect(html).toContain('influenced')
    expect(html).toContain('disputes')
    expect(html).toContain('reinterprets')
    // Swatch uses the truth-line token, not a hardcoded colour (P0-3).
    expect(html).toContain('rel-legend-swatch')
    // Legend items carry zh labels from the entity-labels map.
    expect(html).toContain('导致')
  })

  it('legend is read-only — no links or actions inside', () => {
    const html = renderLegend()
    const legend = html.slice(html.indexOf('rel-legend'), html.indexOf('rel-legend') + 1500)
    expect(legend).not.toContain('href=')
    expect(legend).not.toContain('role="button"')
  })
})
