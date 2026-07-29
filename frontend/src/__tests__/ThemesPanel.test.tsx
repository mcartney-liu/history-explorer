import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider } from '../data/locale'
import ThemesPanel from '../components/ThemesPanel'
import { EntityRelationship } from '../components/EntityPage'

const render = (el: import('react').ReactElement) =>
  renderToStaticMarkup(<LocaleProvider>{el}</LocaleProvider>)

function rel(
  type: string,
  other: { id: string; name: string; type: string; global_id?: string; topic?: string },
): EntityRelationship {
  return {
    type,
    source: 'roman_empire:rome',
    target: other.id,
    direction: 'outgoing',
    other,
  }
}

describe('ThemesPanel (M3.5-004)', () => {
  it('renders nothing when relationships are absent (additive, non-breaking)', () => {
    const html = render(<ThemesPanel />)
    expect(html).toBe('')
  })

  it('groups relationships by type into human themes and cross-topic clickable chips', () => {
    const relationships: EntityRelationship[] = [
      rel('conquered', {
        id: 'civ-greek',
        name: 'Hellenistic World',
        type: 'Civilization',
        global_id: 'hellenistic_world:civ-greek',
        topic: 'hellenistic_world',
      }),
      rel('traded_with', {
        id: 'silk_road',
        name: 'Silk Road',
        type: 'Location',
        global_id: 'silk_road:silk_road',
        topic: 'silk_road',
      }),
      rel('inherited', {
        id: 'civ-egypt',
        name: 'Ancient Egypt',
        type: 'Civilization',
        global_id: 'egypt:civ-egypt',
        topic: 'egypt',
      }),
    ]
    const html = render(<ThemesPanel relationships={relationships} />)
    // Heading + mapped theme names.
    expect(html).toContain('主题')
    expect(html).toContain('Imperial Conquest')
    expect(html).toContain('Trade &amp; Exchange')
    expect(html).toContain('Cultural Inheritance')
    // Member chips show names.
    expect(html).toContain('Hellenistic World')
    expect(html).toContain('Silk Road')
    expect(html).toContain('Ancient Egypt')
    // Chips are cross-topic clickable (aria-label uses the resolved name).
    expect(html).toContain('aria-label="探索 Hellenistic World"')
    // ENTITY_TYPES thread (Civilization) surfaced from other.type.
    expect(html).toContain('文明')
  })

  it('is defensive: unknown relationship types are title-cased; missing global_id falls back to local id', () => {
    const relationships: EntityRelationship[] = [
      rel('participated_in', {
        id: 'person-augustus',
        name: 'Augustus',
        type: 'Person',
      }),
    ]
    const html = render(<ThemesPanel relationships={relationships} />)
    expect(html).toContain('Participated In')
    // No global_id -> chip still renders with local id fallback (aria-label).
    expect(html).toContain('aria-label="探索 Augustus"')
  })
})
