// M62 W6 — Grounding badge guardrail.
// The badge must render the correct variant classes + labels, and the
// verified / unverified color pairs defined in App.css must meet WCAG AA
// (>= 4.5:1) so the indicator is legible regardless of theme.

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'node:url'
import GroundingBadge from '../components/ui/GroundingBadge'

function luminance(hex: string): number {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16) / 255
  const g = parseInt(m.slice(2, 4), 16) / 255
  const b = parseInt(m.slice(4, 6), 16) / 255
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contrast(a: string, b: string): number {
  const L1 = luminance(a)
  const L2 = luminance(b)
  const hi = Math.max(L1, L2)
  const lo = Math.min(L1, L2)
  return (hi + 0.05) / (lo + 0.05)
}

const CSS = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../src/App.css'),
  'utf8',
)

function readRule(cls: string): { bg?: string; fg?: string } {
  const re = new RegExp('\\.' + cls + '\\{([^}]*)\\}')
  const m = CSS.match(re)
  if (!m) return {}
  const bg = m[1].match(/background:[^;]*?(#[0-9A-Fa-f]{6})/)
  const fg = m[1].match(/color:[^;]*?(#[0-9A-Fa-f]{6})/)
  return { bg: bg ? bg[1] : undefined, fg: fg ? fg[1] : undefined }
}

describe('M62 — grounding badge', () => {
  it('renders a verified pill with the check icon and 已溯源 label', () => {
    const html = renderToStaticMarkup(<GroundingBadge state="verified" />)
    expect(html).toContain('grounding-badge--verified')
    expect(html).toContain('已溯源')
    expect(html).toContain('<svg')
  })

  it('renders an unverified pill with 未溯源 label', () => {
    const html = renderToStaticMarkup(<GroundingBadge state="unverified" />)
    expect(html).toContain('grounding-badge--unverified')
    expect(html).toContain('未溯源')
  })

  it('meets WCAG AA contrast (>= 4.5:1) for both states', () => {
    const v = readRule('grounding-badge--verified')
    const u = readRule('grounding-badge--unverified')
    expect(v.bg && v.fg).toBeTruthy()
    expect(u.bg && u.fg).toBeTruthy()
    expect(contrast(v.bg as string, v.fg as string)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(u.bg as string, u.fg as string)).toBeGreaterThanOrEqual(4.5)
  })
})
