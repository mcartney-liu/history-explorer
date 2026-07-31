// M74-003 (C3-2) — AI exploration suggestions feature flag contract.
// Default (no env var / not 'true') is OFF.
import { describe, it, expect } from 'vitest'
import { AI_SUGGESTIONS_ENABLED } from './aiFeatureFlag'

describe('AI_SUGGESTIONS_ENABLED (M74-003)', () => {
  it('defaults to false when VITE_AI_SUGGESTIONS_ENABLED is unset', () => {
    // vitest (vite) does not inject the flag unless the operator sets it —
    // the default build is OFF (M73 byte-identical).
    expect(AI_SUGGESTIONS_ENABLED).toBe(false)
  })

  it('is a boolean constant (never truthy-string)', () => {
    expect(typeof AI_SUGGESTIONS_ENABLED).toBe('boolean')
  })
})
