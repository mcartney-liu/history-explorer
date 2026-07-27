// M35 — narrative grounding test.
//
// Every key in NARRATIVE must correspond to a REAL node in data/examples:
//   - topic keys (no ':')     -> data/examples/<key>_example.json must exist
//   - entity global_ids       -> the global_id string must appear inside
//                                 data/examples/<topic>_example.json
// This guards against hallucinated / AI-fabricated narrative targets.

import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { NARRATIVE, getNarrative, hasNarrative, resolveNarrativeKey } from './narrative'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// frontend/src/data -> repo root/data/examples
const EXAMPLES_DIR = path.resolve(__dirname, '../../../data/examples')

function readExample(topic: string): string {
  const file = path.join(EXAMPLES_DIR, `${topic}_example.json`)
  if (!fs.existsSync(file)) {
    throw new Error(`grounding fixture missing: ${file}`)
  }
  return fs.readFileSync(file, 'utf8')
}

function isKeyGrounded(key: string): boolean {
  if (key.includes(':')) {
    const [topic] = key.split(':')
    const body = readExample(topic)
    return body.includes(key)
  }
  // topic key
  return fs.existsSync(path.join(EXAMPLES_DIR, `${key}_example.json`))
}

describe('narrative grounding', () => {
  it('data/examples directory is reachable', () => {
    expect(fs.existsSync(EXAMPLES_DIR)).toBe(true)
  })

  it('every narrative key maps to a real node in data/examples', () => {
    const keys = Object.keys(NARRATIVE)
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect(isKeyGrounded(key), `key not grounded: ${key}`).toBe(true)
    }
  })

  it('Demo Chain keys are all grounded', () => {
    const demo = ['silk_road', 'ancient_india:religion-buddhism', 'roman_empire:civ-roman']
    for (const key of demo) {
      expect(hasNarrative(key)).toBe(true)
      expect(isKeyGrounded(key), `demo key not grounded: ${key}`).toBe(true)
    }
  })
})

describe('narrative accessors', () => {
  it('getNarrative returns the block for a known key', () => {
    const block = getNarrative('silk_road')
    expect(block).toBeDefined()
    expect(typeof block?.story).toBe('string')
    expect(typeof block?.whyImportant).toBe('string')
  })

  it('getNarrative returns undefined for an unknown key', () => {
    expect(getNarrative('does-not-exist')).toBeUndefined()
  })

  it('hasNarrative reflects membership', () => {
    expect(hasNarrative('roman_empire:civ-roman')).toBe(true)
    expect(hasNarrative('nope')).toBe(false)
  })

  it('every block has at least one of story / whyImportant', () => {
    for (const [key, block] of Object.entries(NARRATIVE)) {
      expect(
        Boolean(block.story) || Boolean(block.whyImportant),
        `empty block for ${key}`,
      ).toBe(true)
    }
  })
})

// M35.1 — resolveNarrativeKey normalization (U2 fix + Search entry support).
describe('resolveNarrativeKey', () => {
  // Case 1: topic + id -> `${topic}:${id}` (canonical entity key).
  it('Case1: builds `${topic}:${id}` from topic + id', () => {
    expect(resolveNarrativeKey({ topic: 'ancient_india', id: 'religion-buddhism' })).toBe(
      'ancient_india:religion-buddhism',
    )
  })

  // Case 2: global_id takes priority over topic + id when both are present.
  it('Case2: global_id wins over topic + id', () => {
    expect(
      resolveNarrativeKey({
        global_id: 'roman_empire:civ-roman',
        topic: 'ancient_india',
        id: 'religion-buddhism',
      }),
    ).toBe('roman_empire:civ-roman')
  })

  // Case 3: topic-only -> the topic slug (topic key).
  it('Case3: topic-only returns the topic slug', () => {
    expect(resolveNarrativeKey({ topic: 'silk_road' })).toBe('silk_road')
  })

  // Case 4: Search Buddhism entry produces the entity global_id the
  // narrative panels expect (mirrors the App.tsx Search result item shape).
  it('Case4: Search Buddhism result resolves to ancient_india:religion-buddhism', () => {
    const searchItem = {
      result_type: 'Entity' as const,
      id: 'religion-buddhism',
      name: 'Buddhism',
      type: 'religion',
      topic: 'ancient_india',
    }
    expect(resolveNarrativeKey(searchItem)).toBe('ancient_india:religion-buddhism')
  })

  // Case 5: unknown / incomplete input is a safe empty fallback so
  // StorySection / WhyImportantPanel render null (no crash, no lookup miss).
  it('Case5: empty input and id-only input fall back to empty string', () => {
    expect(resolveNarrativeKey({})).toBe('')
    expect(resolveNarrativeKey({ id: 'orphan-local-id' })).toBe('')
  })
})
