// M62 W6 — Three-tier narrative structure guardrail.
// App.tsx must wrap the result view in narrative → interpretation →
// supporting tiers in DOM order, and expose inline folding toggles for
// the relationship and timeline views. CI catches accidental reordering
// or removal of the tiers.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'node:url'

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/App.tsx')
const src = readFileSync(APP, 'utf8')

describe('M62 — three-tier narrative structure in App.tsx', () => {
  it('wraps the result view in narrative/interpretation/supporting tiers in DOM order', () => {
    expect(src).toContain('data-tier="narrative"')
    expect(src).toContain('data-tier="interpretation"')
    expect(src).toContain('data-tier="supporting"')
    const ni = src.indexOf('data-tier="narrative"')
    const ii = src.indexOf('data-tier="interpretation"')
    const si = src.indexOf('data-tier="supporting"')
    expect(ni).toBeLessThan(ii)
    expect(ii).toBeLessThan(si)
  })

  it('exposes inline folding toggles for relationship and timeline views', () => {
    expect(src).toContain('m62-view-toggle')
    expect(src).toContain('setRelView')
    expect(src).toContain('setTimeView')
  })
})
