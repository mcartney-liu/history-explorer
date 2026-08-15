// ============================================================
// candidateRanking — Phase C 分层排序测试（C-S4 测试先行）
// ------------------------------------------------------------
// 依据：ADR-0024 v6 Accepted + PHASE_C_IMPLEMENTATION_DESIGN.md v3 §2.3
// 覆盖：PC7 分层契约 / PC8 纯函数 / PC3 JCS 隔离 / D21 查表 / D22 /
//       B1 confidence 两维离散映射（含矛盾消除用例）
// ============================================================

import { describe, it, expect, readFileSync as fsReadFileSync } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  rankCandidates,
  RS_TO_LEVEL,
  EQ_TO_LEVEL,
  type RankingContext,
} from '../candidateRanking'
import type { ExplorationCandidate } from '../candidateGeneration'
import type { RelationEvidence, ContinuityFeatures } from '../../data/continuityEngine'

const SRC_FILE = join(__dirname, '../candidateRanking.ts')
const src = readFileSync(SRC_FILE, 'utf-8')

// ---- 测试工具 ----
const cand = (gid: string, sources: ExplorationCandidate['sources'] = ['relationship_neighbor']): ExplorationCandidate => ({
  targetRef: gid,
  name: gid,
  sources,
})

const mkEvidence = (rs: number, eq = 0.6): { evidence: RelationEvidence[]; features: ContinuityFeatures } => ({
  evidence: [
    { evidenceId: `e-${rs}`, kind: rs > 0 ? 'CAUSAL' : 'NONE', strength: rs, provenance: 'relationship_edge', source: 'caused' },
  ],
  features: {
    relationshipStrength: rs,
    explanationQuality: eq,
    temporalContinuity: null,
    spatialContinuity: null,
    contextRelevance: null,
  },
})

const noEvidence = (): { evidence: RelationEvidence[]; features: ContinuityFeatures } => ({
  evidence: [{ evidenceId: 'e-none', kind: 'NONE', strength: 0, provenance: 'none', source: null }],
  features: {
    relationshipStrength: 0,
    explanationQuality: 0,
    temporalContinuity: null,
    spatialContinuity: null,
    contextRelevance: null,
  },
})

const mkCtx = (over: Partial<RankingContext> = {}): RankingContext => ({
  openGaps: [],
  collectEvidence: (c) => (c.targetRef.startsWith('ev') ? mkEvidence(1) : noEvidence()),
  ...over,
})

const top = (out: ReturnType<typeof rankCandidates>) => out[0]

// ---- PC7 分层契约 ----
describe('rankCandidates — PC7 分层契约', () => {
  it('L1: GapPriority 优先（CRITICAL-gap > LOW-gap）', () => {
    const ctx = mkCtx({
      openGaps: [
        { entityGid: 'gap-crit', priority: 'CRITICAL' },
        { entityGid: 'gap-low', priority: 'LOW' },
      ],
    })
    const out = rankCandidates({ gid: 'cur', name: 'cur' }, [cand('gap-low'), cand('gap-crit')], ctx)
    expect(top(out).candidate.targetRef).toBe('gap-crit')
    expect(top(out).winningLayer).toBe(1)
    expect(top(out).confidence).toBe('HIGH')
  })

  it('D7: NONE-evidence + CRITICAL-gap > evidence + LOW-gap（L1 分出）', () => {
    const ctx = mkCtx({
      openGaps: [
        { entityGid: 'none-crit', priority: 'CRITICAL' },
        { entityGid: 'ev-low', priority: 'LOW' },
      ],
    })
    const out = rankCandidates({ gid: 'cur', name: 'cur' }, [cand('ev-low'), cand('none-crit')], ctx)
    expect(top(out).candidate.targetRef).toBe('none-crit')
    expect(top(out).winningLayer).toBe(1)
  })

  it('D7: NONE-evidence + LOW-gap < evidence + MEDIUM-gap（L1 分出）', () => {
    const ctx = mkCtx({
      openGaps: [
        { entityGid: 'none-low', priority: 'LOW' },
        { entityGid: 'ev-med', priority: 'MEDIUM' },
      ],
    })
    const out = rankCandidates({ gid: 'cur', name: 'cur' }, [cand('none-low'), cand('ev-med')], ctx)
    expect(top(out).candidate.targetRef).toBe('ev-med')
  })

  it('无证据候选 L4 永不超有证据候选（L1-L3 全平 → L3 RS 分出）', () => {
    // 两个候选 gap 都 NONE、无 context 数据（全 null = tie）、history 无
    const ctx = mkCtx({})
    const out = rankCandidates(
      { gid: 'cur', name: 'cur' },
      [cand('none'), cand('ev-strong')],
      ctx,
    )
    expect(top(out).candidate.targetRef).toBe('ev-strong')
    expect(top(out).winningLayer).toBe(3)
  })

  it('L2 null 层 = tie：dimension 全 null → topic 分出', () => {
    const ctx = mkCtx({
      currentTopic: 'roman',
      collectEvidence: (c) => (c.targetRef.startsWith('ev') ? mkEvidence(1) : noEvidence()),
      meta: {
        same: { topic: 'roman' },
        other: { topic: 'other' },
      },
    })
    const out = rankCandidates({ gid: 'cur', name: 'cur' }, [cand('other'), cand('same')], ctx)
    expect(top(out).candidate.targetRef).toBe('same')
    expect(top(out).winningLayer).toBe(2)
  })

  it('L5 tie-breaker: L1-L4 全平 → source precedence 分出', () => {
    // 两个候选：都无 gap、无 context（null=tie）、RS 同档
    const ctx = mkCtx({
      collectEvidence: () => mkEvidence(1),
    })
    const out = rankCandidates(
      { gid: 'cur', name: 'cur' },
      [cand('a', ['package_next']), cand('b', ['dimension_target'])],
      ctx,
    )
    expect(top(out).candidate.targetRef).toBe('b') // dimension_target > package_next
    expect(top(out).winningLayer).toBe(5)
    expect(top(out).confidence).toBe('LOW')
  })

  it('D22: L5 胜出时 topReason 不含来源描述', () => {
    const ctx = mkCtx({ collectEvidence: () => mkEvidence(1) })
    const out = rankCandidates(
      { gid: 'cur', name: 'cur' },
      [cand('a', ['package_next']), cand('b', ['dimension_target'])],
      ctx,
    )
    expect(top(out).topReason).not.toContain('dimension')
    expect(top(out).topReason).not.toContain('来源')
    expect(top(out).topReason).not.toContain('source')
  })
})

// ---- B1 confidence 两维离散映射 ----
describe('rankCandidates — B1 confidence 两维离散（D13）', () => {
  it('L1 胜出 → HIGH', () => {
    const ctx = mkCtx({
      openGaps: [{ entityGid: 'x', priority: 'HIGH' }],
    })
    const out = rankCandidates({ gid: 'cur', name: 'cur' }, [cand('x'), cand('y')], ctx)
    expect(top(out).confidence).toBe('HIGH')
  })

  it('L3 decisive（RS 严格分档）→ MEDIUM', () => {
    const ctx = mkCtx({
      collectEvidence: (c) => (c.targetRef === 'a' ? mkEvidence(1) : mkEvidence(0.5)),
    })
    const out = rankCandidates({ gid: 'cur', name: 'cur' }, [cand('a'), cand('b')], ctx)
    expect(top(out).candidate.targetRef).toBe('a')
    expect(top(out).winningLayer).toBe(3)
    expect(top(out).confidence).toBe('MEDIUM')
  })

  it('L3 marginal（RS 同档、EQ 分出）→ LOW', () => {
    const ctx = mkCtx({
      collectEvidence: (c) =>
        c.targetRef === 'a' ? mkEvidence(1, 0.85) : mkEvidence(1, 0.45),
    })
    const out = rankCandidates({ gid: 'cur', name: 'cur' }, [cand('a'), cand('b')], ctx)
    expect(top(out).candidate.targetRef).toBe('a')
    expect(top(out).winningLayer).toBe(3)
    expect(top(out).confidence).toBe('LOW')
  })

  it('same RelationEvidence.confidence + different separation → different Action.confidence', () => {
    // 两个场景证据置信度相同（都 strong/RS=1），但 separation 不同：
    // decisive（RS 1 vs 0.5）→ MEDIUM；marginal（RS 1 vs 1，EQ 分出）→ LOW
    const ctxDecisive = mkCtx({
      collectEvidence: (c) => (c.targetRef === 'a' ? mkEvidence(1) : mkEvidence(0.5)),
    })
    const ctxMarginal = mkCtx({
      collectEvidence: (c) =>
        c.targetRef === 'a' ? mkEvidence(1, 0.85) : mkEvidence(1, 0.45),
    })
    const outA = rankCandidates({ gid: 'cur', name: 'cur' }, [cand('a'), cand('b')], ctxDecisive)
    const outB = rankCandidates({ gid: 'cur', name: 'cur' }, [cand('a'), cand('b')], ctxMarginal)
    expect(top(outA).confidence).toBe('MEDIUM')
    expect(top(outB).confidence).toBe('LOW')
    expect(top(outA).confidence).not.toBe(top(outB).confidence)
  })
})

// ---- D21 机械查表 ----
describe('RS_TO_LEVEL / EQ_TO_LEVEL — D21 冻结枚举', () => {
  it('RS 枚举完整覆盖 B 引擎实际值', () => {
    expect(RS_TO_LEVEL[1]).toBe('HIGH')
    expect(RS_TO_LEVEL[0.9]).toBe('MEDIUM')
    expect(RS_TO_LEVEL[0.7]).toBe('MEDIUM')
    expect(RS_TO_LEVEL[0.5]).toBe('LOW')
    expect(RS_TO_LEVEL[0.45]).toBe('LOW')
    expect(RS_TO_LEVEL[0]).toBe('NONE')
  })

  it('EQ 枚举完整覆盖', () => {
    expect(EQ_TO_LEVEL[0.85]).toBe('HIGH')
    expect(EQ_TO_LEVEL[0.6]).toBe('MEDIUM')
    expect(EQ_TO_LEVEL[0.45]).toBe('LOW')
    expect(EQ_TO_LEVEL[0]).toBe('NONE')
  })

  it('映射表外值 → undefined（拒绝，防 Agent 自造阈值）', () => {
    expect(RS_TO_LEVEL[0.8]).toBeUndefined()
    expect(EQ_TO_LEVEL[0.7]).toBeUndefined()
  })
})

// ---- PC3 / PC8 源码断言 ----
describe('rankCandidates — PC3/PC8 源码断言', () => {
  it('PC3: 模块无 JCS 引用', () => {
    expect(src).not.toContain('deriveJourneyContinuityScore')
    expect(src).not.toContain('JCS')
  })

  it('PC8: 模块无 Date.now / Math.random / globalThis 引用', () => {
    expect(src).not.toContain('Date.now')
    expect(src).not.toContain('Math.random')
    expect(src).not.toContain('globalThis')
    expect(src).not.toContain('performance.now')
  })

  it('PC8: 同输入两次运行 → 同第一名（determinism）', () => {
    const ctx = mkCtx({
      openGaps: [{ entityGid: 'x', priority: 'HIGH' }],
    })
    const a = rankCandidates({ gid: 'cur', name: 'cur' }, [cand('x'), cand('y')], ctx)
    const b = rankCandidates({ gid: 'cur', name: 'cur' }, [cand('x'), cand('y')], ctx)
    expect(top(a).candidate.targetRef).toBe(top(b).candidate.targetRef)
    expect(top(a).winningLayer).toBe(top(b).winningLayer)
    expect(top(a).confidence).toBe(top(b).confidence)
  })
})
