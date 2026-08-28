import { describe, it, expect } from 'vitest'
import { defaultImageSrc } from '../contentApi'

describe('defaultImageSrc — entity_identity 回退', () => {
  it('entity_identity.<global_id> 回退到 /entity-logos/<global_id 冒号转下划线>.png', () => {
    expect(defaultImageSrc('entity_identity.ancient_india:civ-maurya')).toBe(
      '/entity-logos/ancient_india_civ-maurya.png',
    )
  })

  it('global_id 含多个冒号时全部转下划线', () => {
    expect(defaultImageSrc('entity_identity.a:b:c')).toBe('/entity-logos/a_b_c.png')
  })

  it('其他 slot 前缀不受影响（既有行为保留）', () => {
    expect(defaultImageSrc('landing.story')).toBe('/assets/cards/card-story.jpg')
    expect(defaultImageSrc('research_dims.climate')).toBe('/assets/research/climate.webp')
    expect(defaultImageSrc('some.card')).toBe('/assets/cards/card-card.jpg')
  })
})
