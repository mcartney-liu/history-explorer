#!/usr/bin/env node
// M62 (W7) — Structure gate.
// Asserts:
//   (1) App.tsx result block wraps panels in narrative / interpretation /
//       supporting tiers (data-tier attributes).
//   (2) The freeze SCOPE_ALLOWLIST permits the M62 icon registry
//       (components/ui/) and the W6 guardrail tests (__tests__/).
// Exits 1 on any missing assertion.

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fails = []

const app = readFileSync(resolve(ROOT, 'frontend/src/App.tsx'), 'utf8')
for (const tier of ['narrative', 'interpretation', 'supporting']) {
  if (!app.includes(`data-tier="${tier}"`)) {
    fails.push(`App.tsx missing data-tier="${tier}"`)
  }
}

const freeze = readFileSync(resolve(ROOT, 'scripts/freeze-check.mjs'), 'utf8')
for (const allowed of ['frontend/src/components/ui/', 'frontend/src/__tests__/']) {
  if (!freeze.includes(`"${allowed}"`)) {
    fails.push(`freeze-check.mjs SCOPE_ALLOWLIST missing "${allowed}"`)
  }
}

if (fails.length > 0) {
  console.log('\n[STRUCTURE GATE] FAILED:')
  fails.forEach((f) => console.log('  - ' + f))
  process.exit(1)
}
console.log('[STRUCTURE GATE] PASSED — tiers present and allowlist correct.')
process.exit(0)
