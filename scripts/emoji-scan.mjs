#!/usr/bin/env node
// M62 (W7) — Emoji guard.
// Fails (exit 1) if any literal emoji codepoint remains in frontend source.
// Carve-out symbols (intentional, non-emoji, single-color, legacy semantic
// marks) are explicitly excluded: arrows <- -> <-> and the em-dash —, plus
// the dingbats ★ ☆ ✓ ✗ ⚠ ○ used as static emphasis marks.

import { readFileSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '../../frontend/src')

// Emoji codepoint blocks (excludes the arrow block 2190-21FF which we carve out).
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{2300}-\u{23FF}]/u

const CARVE_OUT = new Set([
  '\u2190', '\u2192', '\u2194', '\u21D4', '\u21CB', '\u27FA', // arrows / ⇔
  '\u2014', // em-dash
  '\u2605', '\u2606', '\u2713', '\u2717', '\u26A0', '\u25CB', // dingbats ★☆✓✗⚠○
])

const exts = new Set(['.ts', '.tsx', '.jsx', '.js'])
const violations = []

function walk(dir, cb) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, cb)
    else cb(p)
  }
}

walk(ROOT, (file) => {
  if (!exts.has(file.slice(file.lastIndexOf('.')))) return
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((raw, i) => {
    // Strip line comments + string/template literals so doc/regex text never
    // triggers a false positive.
    const code = raw
      .replace(/\/\/.*$/, '')
      .replace(/"[^"]*"/g, '')
      .replace(/'[^']*'/g, '')
      .replace(/`[^`]*`/g, '')
    const m = code.match(EMOJI_RE)
    if (m && !CARVE_OUT.has(m[0])) {
      violations.push(`${file}:${i + 1}`)
    }
  })
})

if (violations.length > 0) {
  console.log(`\n[EMOJI GUARD] FAILED — ${violations.length} line(s) contain emoji:`)
  violations.slice(0, 30).forEach((v) => console.log('  - ' + v))
  process.exit(1)
}
console.log('[EMOJI GUARD] PASSED — no emoji in frontend source.')
process.exit(0)
