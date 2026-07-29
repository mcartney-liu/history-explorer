// M62 W6 — Canonical icon registry guardrail.
// Asserts the registry is non-trivial, every key renders a real <svg>
// (never null and never an emoji), so the emoji-as-icon ban is enforced
// in CI via vitest, not only by the standalone emoji-scan.mjs script.

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Icon, ICON_NAMES, type IconName } from '../components/ui/Icon'

const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{2300}-\u{23FF}]/u

describe('M62 — canonical icon registry', () => {
  it('registers a non-trivial, locked set of icons', () => {
    expect(ICON_NAMES.length).toBeGreaterThanOrEqual(20)
  })

  it('renders a real <svg> for every registered icon (never null / emoji)', () => {
    for (const name of ICON_NAMES) {
      const html = renderToStaticMarkup(<Icon name={name as IconName} size={20} />)
      expect(html).toContain('<svg')
      expect(html).toContain('<path')
      // No emoji codepoint may appear in any icon's rendered markup.
      expect(html.match(EMOJI_RE)).toBeNull()
    }
  })
})
