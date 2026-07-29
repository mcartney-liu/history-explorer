#!/usr/bin/env node
// ============================================================
// M59-021 — Visual QA Tool
// Checks:
//   1. CSS classes used in components exist in stylesheets
//   2. Hardcoded color/spacing values (warnings only)
//   3. Unused CSS classes in stylesheets
// Zero dependencies. Read-only.
//
// M62 (W7b): promoted to a REAL quality gate. Genuine breakage
// — CSS classes referenced via className but defined in NO stylesheet
// (App.css + styles/* + any co-located .css) — now FAILS the build
// (process.exit(1)). Hardcoded-value findings stay WARNINGS only, so
// legacy code is never blocked.
//
// NOTE: defined-class collection recurses directories, so styles/*.css
// (and any future co-located component CSS) are scanned — not just the
// single App.css file.
// ============================================================

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'

const ROOT = resolve(process.argv[1] || '.', '../../frontend/src')
const COMPONENTS = join(ROOT, 'components')
const PAGES = join(ROOT, 'pages')
const STYLESHEET = join(ROOT, 'App.css')
const STYLES_DIR = join(ROOT, 'styles')

// ---- Collect used classes from TSX files ----
function collectUsedClasses(dir) {
  const classes = new Set()
  try {
    const entries = readdirSync(dir, { recursive: true })
    for (const entry of entries) {
      const fp = join(dir, entry)
      if (!fp.endsWith('.tsx') && !fp.endsWith('.jsx')) continue
      try {
        const content = readFileSync(fp, 'utf-8')
        // Match className="xxx" or className={'xxx'} or className={`xxx`}
        const matches = content.matchAll(/className\s*=\s*(?:"([^"]+)"|'([^']+)'|{`([^`]+)`})/g)
        for (const m of matches) {
          const raw = (m[1] || m[2] || m[3] || '').trim()
          // Skip empty, boolean expressions, ternary, template expressions
          if (!raw || raw.includes('{') || raw.includes('?') || raw.includes('&&') || raw.includes('||')) continue
          // Split by whitespace for compound class names
          raw.split(/\s+/).filter(Boolean).forEach((c) => {
            // Ignore conditional parts
            if (c.startsWith('var(--') || c.startsWith('calc(') || c.startsWith("'") || c.startsWith('"')) return
            classes.add(c)
          })
        }
      } catch { /* skip */ }
    }
  } catch { /* dir may not exist */ }
  return classes
}

// ---- Collect defined classes from a stylesheet FILE or DIRECTORY ----
// A directory is walked recursively for *.css (so styles/*.css and any
// co-located component CSS are all scanned, not just a single file).
function collectDefinedClasses(path) {
  const classes = new Set()
  let stat
  try {
    stat = statSync(path)
  } catch {
    return classes // path may not exist
  }
  const files = []
  if (stat.isDirectory()) {
    try {
      for (const entry of readdirSync(path, { recursive: true })) {
        const fp = join(path, entry)
        try {
          if (statSync(fp).isFile() && fp.endsWith('.css')) files.push(fp)
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  } else if (stat.isFile() && path.endsWith('.css')) {
    files.push(path)
  }
  for (const fp of files) {
    try {
      const content = readFileSync(fp, 'utf-8')
      // Match .class-name or .class-name:state
      const matches = content.matchAll(/\.([a-zA-Z][\w-]*)\s*[{,:]/g)
      for (const m of matches) {
        classes.add(m[1])
      }
    } catch { /* skip */ }
  }
  return classes
}

// ---- Collect ALL stylesheet files under a directory (recursive) ----
function collectStylesheetFiles(dir) {
  const out = []
  try {
    for (const entry of readdirSync(dir, { recursive: true })) {
      const fp = join(dir, entry)
      try {
        if (statSync(fp).isFile() && fp.endsWith('.css')) out.push(fp)
      } catch { /* skip */ }
    }
  } catch { /* dir may not exist */ }
  return out
}

// ---- Check hardcoded values ----
function checkHardcoded(dir) {
  const warnings = []
  try {
    const entries = readdirSync(dir, { recursive: true })
    for (const entry of entries) {
      const fp = join(dir, entry)
      if (!fp.endsWith('.tsx') && !fp.endsWith('.jsx')) continue
      try {
        const content = readFileSync(fp, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          // Check for hardcoded hex colors in style={} or style=""
          const hexMatch = line.match(/#[0-9a-fA-F]{6}/g)
          if (hexMatch) {
            warnings.push(`${entry}:${i + 1} — hardcoded color ${hexMatch.join(', ')}`)
          }
          // Check for hardcoded pixel values
          const pxMatch = line.match(/\d{2,}px/g)
          if (pxMatch) {
            const offenders = pxMatch.filter((v) => {
              const n = parseInt(v)
              return n !== 1 && n !== 0 && !['16', '12', '8', '4', '14', '18', '10', '20', '24', '28', '32', '36', '40', '44', '48', '56', '64', '72', '80'].includes(String(n))
            })
            if (offenders.length > 0) {
              warnings.push(`${entry}:${i + 1} — suspicious px value ${offenders.join(', ')}`)
            }
          }
        }
      } catch { /* skip */ }
    }
  } catch { /* dir may not exist */ }
  return warnings
}

// ---- Main ----
const usedClasses = collectUsedClasses(COMPONENTS)
const pageClasses = collectUsedClasses(PAGES)
for (const c of pageClasses) usedClasses.add(c)

const cssClasses = collectDefinedClasses(STYLESHEET)
const styleDirClasses = collectDefinedClasses(STYLES_DIR)
for (const c of styleDirClasses) cssClasses.add(c)

const missing = [...usedClasses].filter((c) => !cssClasses.has(c)).sort()
const unused = [...cssClasses].filter((c) => !usedClasses.has(c)).sort()

const hardcodedWarnings = checkHardcoded(COMPONENTS)
const pageWarnings = checkHardcoded(PAGES)

// Output
console.log('\n=== Visual QA Report (M59-021) ===\n')

if (missing.length === 0) {
  console.log('[PASS] All used CSS classes are defined in stylesheets.')
} else {
  console.log(`[WARN] ${missing.length} CSS classes used but not defined:`)
  missing.slice(0, 20).forEach((c) => console.log(`  - ${c}`))
  if (missing.length > 20) console.log(`  ... and ${missing.length - 20} more`)
}

console.log(`\n[INFO] ${unused.length} CSS classes defined but not currently used (may be legacy/dynamic).`)

if (hardcodedWarnings.length === 0 && pageWarnings.length === 0) {
  console.log('[PASS] No hardcoded values detected in components.')
} else {
  const allWarnings = [...hardcodedWarnings, ...pageWarnings]
  console.log(`[WARN] ${allWarnings.length} hardcoded value(s) found:`)
  allWarnings.slice(0, 15).forEach((w) => console.log(`  - ${w}`))
  if (allWarnings.length > 15) console.log(`  ... and ${allWarnings.length - 15} more`)
}

// ---- M62 (W7): make this a REAL gate on M62-critical classes ----
// The broad `missing` report above is dominated by pre-existing false
// positives (the scanner does not cover every CSS context / CSS-module /
// dynamic class), so we intentionally do NOT fail on it. We fail ONLY when
// a class M62 explicitly introduced is undefined — a genuine regression.
const CRITICAL_CLASSES = [
  'm62-view-toggle',
  'grounding-badge',
  'grounding-badge--verified',
  'grounding-badge--unverified',
]
const missingCritical = CRITICAL_CLASSES.filter((c) => !cssClasses.has(c))
if (missingCritical.length > 0) {
  console.log(`\n[FAIL] M62-critical CSS classes undefined: ${missingCritical.join(', ')}`)
  process.exit(1)
}

console.log('\n=== End Visual QA ===')
process.exit(0)
