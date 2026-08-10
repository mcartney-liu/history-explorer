// M62 W6 / M65 Phase 1 — Three-tier narrative structure guardrail.
// App.tsx must wrap the result view in narrative → interpretation →
// supporting tiers in DOM order, and expose view toggles.
//
// Wave2-#140: M85 replaced the data-tier="*" attributes with ExplorerShell
// slots (narrativeSection / interpretationSection / supportingSection).
// The three-tier contract is unchanged — assertions now anchor on the
// slot names in DOM order.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'node:url'

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/App.tsx')
const src = readFileSync(APP, 'utf8')

describe('M62 — three-tier narrative structure in App.tsx', () => {
  it('wraps the result view in narrative/interpretation/supporting tiers in DOM order', () => {
    expect(src).toContain('narrativeSection={')
    expect(src).toContain('interpretationSection={')
    expect(src).toContain('supportingSection={')
    const ni = src.indexOf('narrativeSection={')
    const ii = src.indexOf('interpretationSection={')
    const si = src.indexOf('supportingSection={')
    expect(ni).toBeLessThan(ii)
    expect(ii).toBeLessThan(si)
  })

  it('exposes view toggle elements for relationship and timeline', () => {
    expect(src).toContain('m62-view-toggle')
    expect(src).toContain('setRelView')
    expect(src).toContain('setTimeView')
  })

  // M65 Phase 1: invariant — ExplorerShell must exist
  // Wave2-#140: M85.11 renamed the shell to ExplorerShell and the companion
  // slot to companionDock; assertions aligned to the shipped structure.
  it('uses slot-based ExplorerShell layout', () => {
    expect(src).toContain('ExplorerShell')
    expect(src).toContain('companionDock={<CompanionShell')
  })
})
