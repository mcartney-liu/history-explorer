// M62 W6 — Entity label & icon mapping guardrail.
// The 8 canonical entity types must map to Chinese labels and to icon
// names that exist in the canonical registry (so a rename of IconName
// cannot silently break the entity-type icons).

import { describe, it, expect } from 'vitest'
import {
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_ICONS,
  getEntityLabel,
  getEntityIcon,
} from '../data/entity/entityLabels'
import { ICON_NAMES } from '../components/ui/Icon'

const CANON = [
  'Person',
  'Civilization',
  'Event',
  'Location',
  'Time Period',
  'Technology',
  'Religion',
  'Idea',
]

describe('M62 — entity label & icon mapping', () => {
  it('maps all 8 canonical entity types to Chinese labels', () => {
    for (const t of CANON) {
      expect(ENTITY_TYPE_LABELS[t]).toBeTruthy()
      expect(ENTITY_TYPE_LABELS[t]).toMatch(/[\u4e00-\u9fff]/)
    }
  })

  it('maps every entity type to a registered icon name', () => {
    for (const t of CANON) {
      expect(ICON_NAMES).toContain(ENTITY_TYPE_ICONS[t] as never)
    }
  })

  it('falls back gracefully for unknown types', () => {
    expect(getEntityLabel('Nope')).toBe('Nope')
    expect(getEntityIcon('Nope')).toBe('globe')
  })
})
