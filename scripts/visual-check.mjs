#!/usr/bin/env node
// ============================================================
// M59-021 — Visual QA Tool
// Checks:
//   1. CSS classes used in components exist in stylesheets
//   2. Hardcoded color/spacing values (warnings only)
//   3. Unused CSS classes in stylesheets
// Zero dependencies. Read-only. Does NOT block builds.
// ============================================================

import { readFileSync, readdirSync } from 'fs'
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

// ---- Collect defined classes from stylesheets ----
function collectDefinedClasses(filepath) {
  const classes = new Set()
  try {
    const content = readFileSync(filepath, 'utf-8')
    // Match .class-name or .class-name:state
    const matches = content.matchAll(/\.([a-zA-Z][\w-]*)\s*[{,:]/g)
    for (const m of matches) {
      classes.add(m[1])
    }
  } catch { /* file may not exist */ }
  return classes
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

console.log('\n=== End Visual QA ===')
process.exit(0)
