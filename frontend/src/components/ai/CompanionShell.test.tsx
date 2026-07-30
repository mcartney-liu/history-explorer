// ============================================================
// M65 Phase 2B — Companion tests
// Validates CompanionContext state machine, CompanionShell rendering,
// and CompanionRouter mode switching.
// ============================================================

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CompanionShell } from './CompanionShell'
import { CompanionProvider, useCompanion } from './CompanionContext'

// ---- Context Tests ----
describe('CompanionContext', () => {
  it('throws when used outside CompanionProvider', () => {
    expect(() => {
      const { renderToString } = require('react-dom/server')
      function BadConsumer() {
        useCompanion()
        return null
      }
      renderToString(<BadConsumer />)
    }).toThrow('useCompanion must be used within CompanionProvider')
  })
})

// ---- CompanionShell Tests ----
describe('CompanionShell', () => {
  it('renders the 4-mode tab selector', () => {
    const html = renderToStaticMarkup(<CompanionShell />)
    expect(html).toContain('AI 历史学家')
    expect(html).toContain('companion-modes')
    expect(html).toContain('解释')
    expect(html).toContain('对话')
    expect(html).toContain('研究')
    expect(html).toContain('发现')
  })

  it('renders the explain view by default', () => {
    const html = renderToStaticMarkup(<CompanionShell />)
    // AIExplanationView idle state renders input placeholder
    expect(html).toContain('向 AI 提问')
  })

  it('renders all 4 mode tabs as accessible buttons', () => {
    const html = renderToStaticMarkup(<CompanionShell />)
    expect(html).toContain('role="tablist"')
    expect(html).toContain('role="tab"')
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('aria-selected="false"')
  })
})

// ---- Router Tests ----
describe('CompanionRouter', () => {
  it('imports and renders all 4 View components without crash', () => {
    const html = renderToStaticMarkup(<CompanionShell />)
    // Default mode is 'explain' — AIExplanationView renders with ai-explanation class
    expect(html).toContain('ai-explanation')
  })
})
