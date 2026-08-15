// ============================================================
// candidateContext — Phase C 上下文特征派生测试（C-S3 测试先行）
// ------------------------------------------------------------
// 依据：ADR-0024 v6 Accepted + PHASE_C_IMPLEMENTATION_DESIGN.md v3 §2.2
// 覆盖：D20 显式关联推导 / PC4 null 语义 / 冻结映射表逐条验证
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  deriveGapPriority,
  deriveCandidateContext,
  type GapPriority,
} from '../candidateContext'
import type { ExplorationCandidate } from '../candidateGeneration'

const cand = (targetRef: string, name = targetRef): ExplorationCandidate => ({
  targetRef,
  name,
  sources: ['relationship_neighbor'],
})

describe('deriveGapPriority — D20 显式关联契约', () => {
  const gaps = [
    { entityGid: 'g-1', priority: 'CRITICAL' as GapPriority },
    { entityGid: 'g-2', priority: 'HIGH' as GapPriority },
  ]

  it('候选命中 openGap 显式目标 → 返回对应 priority', () => {
    expect(deriveGapPriority(cand('g-1'), gaps)).toBe('CRITICAL')
    expect(deriveGapPriority(cand('g-2'), gaps)).toBe('HIGH')
  })

  it('候选不在 openGaps → NONE（即使名字语义"像"相关）', () => {
    expect(deriveGapPriority(cand('roman-empire'), gaps)).toBe('NONE')
  })

  it('候选同时命中多个 gap → 取 max', () => {
    const both = [
      { entityGid: 'x', priority: 'MEDIUM' as GapPriority },
      { entityGid: 'x', priority: 'HIGH' as GapPriority },
    ]
    expect(deriveGapPriority(cand('x'), both)).toBe('HIGH')
  })

  it('空 openGaps → NONE（无缺口记录即不优先，产品语义例外）', () => {
    expect(deriveGapPriority(cand('g-1'), [])).toBe('NONE')
  })
})

describe('deriveCandidateContext — PC4 null 语义', () => {
  const base = { openGaps: [] }

  it('无 dimensionState / meta.dimension → dimensionRelevance=null（非 0）', () => {
    expect(deriveCandidateContext(cand('x'), base).dimensionRelevance).toBeNull()
  })

  it('无 currentTopic / meta.topic → topicRelevance=null', () => {
    expect(deriveCandidateContext(cand('x'), base).topicRelevance).toBeNull()
  })

  it('无 history → pathRelevance=null', () => {
    expect(deriveCandidateContext(cand('x'), base).pathRelevance).toBeNull()
  })

  it('无 meta.overlap → novelty=null', () => {
    expect(deriveCandidateContext(cand('x'), base).novelty).toBeNull()
  })

  it('空 openGaps → gapPriority=NONE（非 null，产品语义）', () => {
    expect(deriveCandidateContext(cand('x'), base).gapPriority).toBe('NONE')
  })

  it('alreadyExploredPenalty 缺 explored → 0', () => {
    expect(deriveCandidateContext(cand('x'), base).alreadyExploredPenalty).toBe(0)
  })
})

describe('deriveCandidateContext — 冻结映射表', () => {
  it('dimensionRelevance: meta.dimension 命中 missing → HIGH；covered → LOW', () => {
    const ctx = {
      openGaps: [],
      dimensionState: { missing: ['politics'], covered: ['economy'] },
    }
    expect(deriveCandidateContext(cand('x'), ctx, { dimension: 'politics' }).dimensionRelevance).toBe('HIGH')
    expect(deriveCandidateContext(cand('y'), ctx, { dimension: 'economy' }).dimensionRelevance).toBe('LOW')
    expect(deriveCandidateContext(cand('z'), ctx, { dimension: 'unknown' }).dimensionRelevance).toBe('NONE')
  })

  it('topicRelevance: 同主题 → HIGH；bridged → MEDIUM；不同且未桥 → NONE', () => {
    const ctx = { openGaps: [], currentTopic: 'roman' }
    expect(deriveCandidateContext(cand('a'), ctx, { topic: 'roman' }).topicRelevance).toBe('HIGH')
    expect(deriveCandidateContext(cand('b'), ctx, { topic: 'other', bridged: true }).topicRelevance).toBe('MEDIUM')
    expect(deriveCandidateContext(cand('c'), ctx, { topic: 'other' }).topicRelevance).toBe('NONE')
  })

  it('pathRelevance: 最近 3 步 → HIGH；更早 → MEDIUM；不在 → NONE', () => {
    const ctx = { openGaps: [], history: ['h-1', 'h-2', 'x', 'h-4', 'h-5'] }
    expect(deriveCandidateContext(cand('x'), ctx).pathRelevance).toBe('HIGH') // index 2 ≥ len-3
    expect(deriveCandidateContext(cand('h-1'), ctx).pathRelevance).toBe('MEDIUM')
    expect(deriveCandidateContext(cand('z'), ctx).pathRelevance).toBe('NONE')
  })

  it('novelty: overlap 0 → HIGH；1 → MEDIUM；2 → LOW；≥3 → NONE', () => {
    const ctx = { openGaps: [] }
    expect(deriveCandidateContext(cand('n0'), ctx, { overlap: 0 }).novelty).toBe('HIGH')
    expect(deriveCandidateContext(cand('n1'), ctx, { overlap: 1 }).novelty).toBe('MEDIUM')
    expect(deriveCandidateContext(cand('n2'), ctx, { overlap: 2 }).novelty).toBe('LOW')
    expect(deriveCandidateContext(cand('n3'), ctx, { overlap: 3 }).novelty).toBe('NONE')
  })

  it('alreadyExploredPenalty: 在 explored → 1；不在 → 0', () => {
    const ctx = { openGaps: [], explored: ['e-1'] }
    expect(deriveCandidateContext(cand('e-1'), ctx).alreadyExploredPenalty).toBe(1)
    expect(deriveCandidateContext(cand('other'), ctx).alreadyExploredPenalty).toBe(0)
  })
})
