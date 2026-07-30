#!/usr/bin/env node
// M62 (W7) — Emoji guard.
// Fails (exit 1) if any literal emoji codepoint remains in frontend source.
// Carve-out symbols (intentional, non-emoji, single-color, legacy marks)
// are explicitly excluded: arrows <- -> <-> and the em-dash —. P0-1 bans
// emoji/symbol characters as functional icons, so dingbats (★☆✓✗⚠○) are
// intentionally NOT carved out — they must render as registry SVG icons.

import { readFileSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '../../frontend/src')

// Emoji codepoint blocks (excludes the arrow block 2190-21FF which we carve out).
// 25A0-25FF (Geometric Shapes: ○◯▢) added so dingbat status marks are caught.
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}]/u

const CARVE_OUT = new Set([
  '\u2190', '\u2192', '\u2194', '\u21D4', '\u21CB', '\u27FA', // arrows / ⇔
  '\u2014', // em-dash
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

// ---- symbol dingbat guard (M62.5 Batch 01) ----
// P0-1 bans ★☆✓✗○⚠ as functional icons. Unlike the emoji-re check above
// (which strips string literals to avoid doc-string false positives), this
// check scans ALL source positions EXCEPT line comments, catching cases
// where a symbol dingbat is embedded in a JSX text node or string literal.
// Historical text in data/ files is NOT scanned (data/ is outside frontend/src).
const SYMBOL_DINGBAT_RE = /[\u{2605}\u{2606}\u{2713}\u{2717}\u{25CB}\u{26A0}]/u

let symbolViolations = []
walk(ROOT, (file) => {
  if (!exts.has(file.slice(file.lastIndexOf('.')))) return
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((raw, i) => {
    // Strip only line comments — keep string/JSX text and template literals visible
    const code = raw.replace(/\/\/.*$/, '')
    const m = code.match(SYMBOL_DINGBAT_RE)
    if (m) {
      symbolViolations.push(`${file}:${i + 1}`)
    }
  })
})

if (symbolViolations.length > 0) {
  console.log(`\n[SYMBOL GUARD] FAILED — ${symbolViolations.length} line(s) contain banned symbol dingbat (★☆✓✗○⚠):`)
  symbolViolations.slice(0, 30).forEach((v) => console.log('  - ' + v))
  process.exit(1)
}
console.log('[SYMBOL GUARD] PASSED — no banned symbol dingbats in frontend source.')

if (violations.length > 0) {
  console.log(`\n[EMOJI GUARD] FAILED — ${violations.length} line(s) contain emoji:`)
  violations.slice(0, 30).forEach((v) => console.log('  - ' + v))
  process.exit(1)
}
console.log('[EMOJI GUARD] PASSED — no emoji in frontend source.')
process.exit(0)
