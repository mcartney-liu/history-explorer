// M62 W6 — Emoji guard as a vitest test.
// Mirrors scripts/emoji-scan.mjs so the CI gate also runs inside the unit
// suite. Fails if any literal emoji codepoint remains in frontend source
// (outside the explicitly carved-out arrow / dingbat marks).

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'node:url'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../src')

const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{2300}-\u{23FF}]/u
const CARVE_OUT = new Set([
  '\u2190', '\u2192', '\u2194', '\u21D4', '\u21CB', '\u27FA',
  '\u2014', '\u2605', '\u2606', '\u2713', '\u2717', '\u26A0', '\u25CB',
])
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
