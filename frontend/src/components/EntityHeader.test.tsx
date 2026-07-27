import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import EntityHeader from './EntityHeader'

// M34-A1: EntityHeader is the extracted entity-page header. It must render the
// same markup EntityPage inlined before so the entity view's DOM contract holds.
describe('EntityHeader (M34-A1)', () => {
  it('renders the "Entity" label and the type badge', () => {
    const html = renderToStaticMarkup(<EntityHeader type="Person" />)
    expect(html).toContain('Entity')
    expect(html).toContain('Person')
    expect(html).toContain('class="result-section entity-page-head"')
    expect(html).toContain('class="re-type"')
  })

  it('reflects whatever entity type it is given', () => {
    const html = renderToStaticMarkup(<EntityHeader type="Civilization" />)
    expect(html).toContain('Civilization')
  })
})
