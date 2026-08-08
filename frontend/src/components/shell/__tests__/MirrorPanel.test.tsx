import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MirrorPanel } from '../MirrorPanel'
import { GrowthGraphStore } from '../../../next/memory/GrowthGraphStore'
import type { GrowthSnapshot, GrowthNodeType } from '../../../next/memory/GrowthGraphStore'
import type { Decision } from '../../../runtime/evaluation/Decision'
import type { ProjectionDelta, MemoryPersistencePayload } from '../../../next/memory/MemoryPolicy'

// OD-09: Mirror pillar panel (VS-03 TP-19/22). Tests guard the READ-ONLY
// contract and the five B4 §5.4 violations:
//   1. no "you should look at X" (no recommendations)
//   2. no other-user / popularity / click-rate data
//   3. output never feeds ExplorationPolicy (render-only component)
//   4. no verdicts / learner labels / grading
//   5. session-scoped honesty (no implied long-term memory)

interface SeedNode {
  type: GrowthNodeType
  stage: GrowthSnapshot['stage']
  coverage: number
}

/** Seed the GrowthGraph through the public applyDecision API (M86.2.3). */
function makeStore(nodes: SeedNode[]): GrowthGraphStore {
  const store = new GrowthGraphStore('graph-test', 'unit-test')
  for (const n of nodes) {
    const delta: ProjectionDelta = {
      deltaId: `delta-${Math.random()}`,
      sessionRef: 'session-test',
      timestamp: Date.now(),
      cause: 'user_progress',
      stageChanged: { previous: 'FACT', current: n.stage },
    }
    const decision: Decision<MemoryPersistencePayload> = {
      decisionId: `dec-${Math.random()}`,
      evaluatorId: 'memory-policy',
      evaluatorVersion: '1.0',
      inputRef: delta.deltaId,
      output: {
        shouldPersist: true,
        growthEventType: n.type === 'milestone' ? 'milestone' : n.type === 'reactivation' ? 'reactivation' : 'delta',
        reason: n.type,
      },
      trace: [],
      createdAt: Date.now(),
    }
    const snapshot: GrowthSnapshot = {
      stage: n.stage,
      coverageRatio: n.coverage,
      missingLinkCount: 0,
      dimensionCount: 3,
    }
    store.applyDecision(decision, delta, snapshot)
  }
  return store
}

describe('MirrorPanel (OD-09)', () => {
  it('renders nothing when no graph store is provided', () => {
    const html = renderToStaticMarkup(<MirrorPanel graphStore={null} />)
    expect(html).toBe('')
  })

  it('renders nothing when the graph is empty', () => {
    const store = makeStore([])
    const html = renderToStaticMarkup(<MirrorPanel graphStore={store} />)
    expect(html).toBe('')
  })

  it('shows the read-only projection badge and lock marker', () => {
    const store = makeStore([
      { type: 'exploration_start', stage: 'FACT', coverage: 0.1 },
      { type: 'delta', stage: 'CONNECTION', coverage: 0.4 },
    ])
    const html = renderToStaticMarkup(<MirrorPanel graphStore={store} />)
    expect(html).toContain('认知镜像')
    expect(html).toContain('只读投影')
    // lock icon path is present (rect + shackle path)
    expect(html).toContain('M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5')
  })

  it('reflects only the user own trajectory — no recommendations, no external data', () => {
    const store = makeStore([
      { type: 'exploration_start', stage: 'FACT', coverage: 0.1 },
      { type: 'milestone', stage: 'UNDERSTANDING', coverage: 0.7 },
    ])
    const html = renderToStaticMarkup(<MirrorPanel graphStore={store} />)
    // Violation #1: no "you should look at X"
    expect(html).not.toMatch(/下一步|你应该|推荐|去看/)
    // Violation #2: no popularity / other users / click rates
    expect(html).not.toMatch(/热门|流行|他人|点击率|大家都在/)
    // Violation #5: session-scoped honesty
    expect(html).toContain('本次会话轨迹')
  })

  it('renders the growth gauge with coverage percentage', () => {
    const store = makeStore([
      { type: 'exploration_start', stage: 'FACT', coverage: 0.1 },
      { type: 'milestone', stage: 'UNDERSTANDING', coverage: 0.75 },
    ])
    const html = renderToStaticMarkup(<MirrorPanel graphStore={store} />)
    expect(html).toContain('覆盖度 75%')
    expect(html).toContain('aria-valuenow="75"')
  })

  it('renders milestones and session trajectory timeline', () => {
    const store = makeStore([
      { type: 'exploration_start', stage: 'FACT', coverage: 0.1 },
      { type: 'delta', stage: 'CONNECTION', coverage: 0.4 },
      { type: 'milestone', stage: 'UNDERSTANDING', coverage: 0.8 },
    ])
    const html = renderToStaticMarkup(<MirrorPanel graphStore={store} />)
    expect(html).toContain('里程碑')
    expect(html).toContain('本次会话轨迹')
    expect(html).toContain('理解形成')
  })

  it('renders session stats without implying long-term memory', () => {
    const store = makeStore([
      { type: 'exploration_start', stage: 'FACT', coverage: 0.1 },
      { type: 'delta', stage: 'CONNECTION', coverage: 0.5 },
    ])
    const html = renderToStaticMarkup(<MirrorPanel graphStore={store} />)
    expect(html).toMatch(/\d+ 认知节点/)
    expect(html).toMatch(/\d+ 连接/)
    // Violation #5: no "我记得你/欢迎回来/你的历史" framing
    expect(html).not.toMatch(/我记得|欢迎回来|上次会话|你的历史/)
  })
})
