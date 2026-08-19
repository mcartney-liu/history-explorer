// M62 W6 / M65 Phase 1 — Three-tier narrative structure guardrail.
// App.tsx must wrap the result view in narrative → interpretation →
// supporting tiers in DOM order, and expose view toggles.
//
// Wave2-#140: M85 replaced the data-tier="*" attributes with ExplorerShell
// slots (narrativeSection / interpretationSection / supportingSection).
// 2026-08-11: M90 rework dropped those slot names — ExplorerShell now takes
// globalBar / contextRail / companionDock and the content itself lives in
// ModeCanvas. The guardrail anchors on the current slot contract
// (presence + DOM order).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'node:url'

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/App.tsx')
const src = readFileSync(APP, 'utf8')

describe('M62 — three-tier narrative structure in App.tsx', () => {
  it('wraps ExplorerShell slots in a stable DOM order (M90 contract)', () => {
    // M90 rework dropped modeBar; current slot contract is
    // globalBar → contextRail → companionDock (+ <ModeCanvas child).
    expect(src).toContain('globalBar={')
    expect(src).toContain('contextRail={')
    expect(src).toContain('companionDock={')
    expect(src).toContain('<ModeCanvas')
    const gb = src.indexOf('globalBar={')
    const cr = src.indexOf('contextRail={')
    const cd = src.indexOf('companionDock={')
    const mc = src.indexOf('<ModeCanvas')
    expect(gb).toBeGreaterThanOrEqual(0)
    expect(gb).toBeLessThan(cr)
    expect(cr).toBeLessThan(cd)
    expect(cd).toBeLessThan(mc)  // ModeCanvas 是子元素，出现在所有 slot prop 之后
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
