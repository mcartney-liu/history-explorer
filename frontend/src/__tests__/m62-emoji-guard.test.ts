// M62 W6 — Emoji guard as a vitest test (+ M62.5 Batch 01 symbol dingbat guard).
// Mirrors scripts/emoji-scan.mjs so the CI gate also runs inside the unit
// suite. Fails if any literal emoji codepoint remains in frontend source
// (outside the explicitly carved-out arrow marks).
// M62.5 Batch 01: ★☆✓✗○⚠ are no longer carved out — banned as functional
// icons under P0-1. A separate symbol guard catches them even in string
// literals (where the emoji regex strips strings to avoid doc false positives).

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'node:url'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../src')

const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}]/u
// ★☆✓✗○⚠ are intentionally NOT carved out — they are now banned under P0-1.
// The symbol dingbat guard (below) explicitly catches them everywhere,
// including string literals.
const CARVE_OUT = new Set([
  '\u2190', '\u2192', '\u2194', '\u21D4', '\u21CB', '\u27FA',
  '\u2014', // em-dash
])
// Symbol dingbat pattern — catches ★☆✓✗○⚠ in ALL positions (including
// string literals) after comment stripping only. Unlike the emoji regex,
// this does NOT strip string/template literals, ensuring functional icon
// usage inside JSX text and quoted strings is also detected.
const SYMBOL_DINGBAT_RE = /[\u{2605}\u{2606}\u{2713}\u{2717}\u{25CB}\u{26A0}]/u

const exts = new Set(['.ts', '.tsx', '.jsx', '.js'])

function walk(dir: string, cb: (file: string) => void) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, cb)
    else cb(p)
  }
}

describe('M62 — emoji guard (frontend source)', () => {
  const violations: string[] = []
  walk(SRC, (file) => {
    if (!exts.has(file.slice(file.lastIndexOf('.')))) return
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((raw, i) => {
      const code = raw
        .replace(/\/\/.*$/, '')
        .replace(/"[^"]*"/g, '')
        .replace(/'[^']*'/g, '')
        .replace(/`[^`]*`/g, '')
      const m = code.match(EMOJI_RE)
      if (m && !CARVE_OUT.has(m[0])) violations.push(`${file}:${i + 1}`)
    })
  })

  it('contains no emoji codepoints outside the carve-out set', () => {
    expect(violations).toEqual([])
  })
})

describe('M62.5 — symbol dingbat guard (star/check/warning/circle/cross)', () => {
  const violations: string[] = []
  walk(SRC, (file) => {
    if (!exts.has(file.slice(file.lastIndexOf('.')))) return
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((raw, i) => {
      // Strip only line comments — string literals and JSX text are scanned
      // to catch functional icon usage in any position.
      const code = raw.replace(/\/\/.*$/, '')
      const m = code.match(SYMBOL_DINGBAT_RE)
      if (m) violations.push(`${file}:${i + 1}`)
    })
  })

  it('contains no banned symbol dingbats (star/check/warning/circle/cross) as functional icons', () => {
    expect(violations).toEqual([])
  })
})
