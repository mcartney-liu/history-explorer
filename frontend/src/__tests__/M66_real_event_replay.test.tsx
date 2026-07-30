// @vitest-environment jsdom
// M66-C — Real event replay (schema replay of SYNTHETIC data)
//
// Proves the FULL chain closes with events shaped EXACTLY like the
// production recorder writes them (real history-explorer.events.v1 schema),
// but built from SYNTHETIC entity IDs with NO real user identity:
//   localStorage events (history-explorer.events.v1)
//     → getEvents()
//     → analyzeProductUsage()
//     → ExplorationContextIntelligence (narrow projection)
//     → ExplorationInsightPanel (UI consumer)
//
// This is a schema replay of synthetic events — NOT captured user data.
// It complements (does not replace) the M54/M57 synthetic scenario-logic
// regressions.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { getEvents, type UserBehaviorEvent } from '../data/UserBehaviorEvent'
import { analyzeProductUsage } from '../data/ProductUsageAnalysis'
import { CompanionProvider } from '../components/ai/CompanionContext'
import { ExplorationInsightPanel } from '../components/ai/ExplorationInsightPanel'
import type { ExplorationContextIntelligence } from '../components/ai/CompanionContext'

const STORAGE_KEY = 'history-explorer.events.v1'

const fixturePath = resolve(process.cwd(), 'src/__tests__/fixtures/real-session-events.json')
const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as UserBehaviorEvent[]

const FORBIDDEN = ['建议', '推荐', '你应该', '系统认为你', '用户评分', '画像']

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

beforeEach(() => {
  localStorage.clear()
  container = null
  root = null
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  container?.remove()
  container = null
  root = null
})

function narrowProjection(di: NonNullable<ReturnType<typeof analyzeProductUsage>['decisionInsight']>): ExplorationContextIntelligence {
  const km = di.evidence.keyMetrics
  return {
    explorationDepth: typeof km.maxDepth === 'number' ? km.maxDepth : 0,
    explorationPattern: String(km.dominantPattern ?? 'unknown'),
    knowledgeCoverage: typeof km.entityCoverage === 'number' ? km.entityCoverage : 0,
    knowledgeConnectionAvailable: km.relationshipDataAvailable === 'yes',
    explorationActivityCount: typeof km.totalEvents === 'number' ? km.totalEvents : 0,
    evidenceCompleteness: typeof di.confidence === 'number' ? di.confidence : 0,
    evidenceQuality: typeof di.evidenceQuality === 'number' ? di.evidenceQuality : 0,
    explorationSignals: Array.isArray(di.counterSignals) ? di.counterSignals : [],
  }
}

describe('M66 real event replay chain', () => {
  it('replays a synthetic session end-to-end (event → analysis → insight → UI)', () => {
    // 1. Synthetic events shaped exactly like production records land in localStorage.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fixture))

    // 2. getEvents reads them back.
    const events = getEvents()
    expect(events.length).toBe(fixture.length)

    // 3. analyzeProductUsage produces a decision insight.
    const analysis = analyzeProductUsage(events)
    const di = analysis.decisionInsight
    expect(di).toBeTruthy()
    const km = di.evidence.keyMetrics
    expect(typeof km.maxDepth).toBe('number')
    expect(km.totalEvents).toBe(fixture.length)
    expect(km.entityCoverage).toBeGreaterThanOrEqual(0)

    // 4. Narrow projection into the UI-safe intelligence shape (mirrors App.tsx C1).
    const intel = narrowProjection(di)

    // 5. UI consumes it — closed loop verified (no @testing-library, plain DOM).
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => {
      root!.render(
        <CompanionProvider workspace={{ intelligence: intel }}>
          <ExplorationInsightPanel />
        </CompanionProvider>,
      )
    })

    const body = container.textContent ?? ''
    expect(body).toContain('探索空间连接状态')
    expect(body).toContain(`${fixture.length} 次本地事件`)
    FORBIDDEN.forEach((w) => expect(body).not.toContain(w))
  })
})
