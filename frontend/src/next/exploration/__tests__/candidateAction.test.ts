// ============================================================
// candidateAction — Phase C Action Builder 测试（C-S5 测试先行）
// ------------------------------------------------------------
// 依据：ADR-0024 v6 Accepted + PHASE_C_IMPLEMENTATION_DESIGN.md v3 §2.1.1/2.4
// 覆盖：B2 多 provenance → type 确定性 / D13 confidence 展示映射 /
//       D22 reason 不含来源 / D12 字段不扩张
// ============================================================

import { describe, it, expect } from 'vitest'
import { buildAction, ACTION_TYPE_BY_SOURCE, CONFIDENCE_TO_NUMBER } from '../candidateAction'
import type { RankedCandidate } from '../candidateRanking'
import type { ExplorationCandidate } from '../candidateGeneration'
import type { RelationEvidence, ContinuityFeatures } from '../../data/continuityEngine'

const cand = (gid: string, sources: ExplorationCandidate['sources']): ExplorationCandidate => ({
  targetRef: gid,
  name: gid,
  sources,
})

const ranked = (over: Partial<RankedCandidate> = {}): RankedCandidate => {
  const c = cand('t-1', ['relationship_neighbor'])
  return {
    candidate: c,
    evidence: [{ evidenceId: 'e1', kind: 'CAUSAL', strength: 1, provenance: 'relationship_edge', source: 'caused' }],
    features: {
      relationshipStrength: 1,
      explanationQuality: 0.6,
      temporalContinuity: null,
      spatialContinuity: null,
      contextRelevance: null,
    },
    context: {
      gapPriority: 'NONE',
      dimensionRelevance: null,
      topicRelevance: null,
      pathRelevance: null,
      novelty: null,
      alreadyExploredPenalty: 0,
    },
    winningLayer: 3,
    confidence: 'MEDIUM',
    topReason: '与当前实体存在最可靠的关系',
    ...over,
  }
}

describe('buildAction — B2 多 provenance → type 确定性', () => {
  it('sources=[relationship_neighbor, cross_topic_bridge] → follow_cause（precedence 取先命中）', () => {
    const a = buildAction(ranked({ candidate: cand('x', ['relationship_neighbor', 'cross_topic_bridge']) }))
    expect(a.type).toBe('follow_cause')
  })

  it('sources=[dimension_target, package_next] → open_dimension', () => {
    const a = buildAction(ranked({ candidate: cand('x', ['dimension_target', 'package_next']) }))
    expect(a.type).toBe('open_dimension')
  })

  it('sources=[cross_topic_bridge] → compare_context', () => {
    const a = buildAction(ranked({ candidate: cand('x', ['cross_topic_bridge']) }))
    expect(a.type).toBe('compare_context')
  })

  it('sources=[package_next] → deep_continue', () => {
    const a = buildAction(ranked({ candidate: cand('x', ['package_next']) }))
    expect(a.type).toBe('deep_continue')
  })

  it('同集不同序 → 同 type（sources 顺序不参与决策）', () => {
    const a = buildAction(ranked({ candidate: cand('x', ['relationship_neighbor', 'dimension_target']) }))
    const b = buildAction(ranked({ candidate: cand('x', ['dimension_target', 'relationship_neighbor']) }))
    expect(a.type).toBe(b.type)
  })
})

describe('buildAction — D13 confidence / D22 reason / D12 字段', () => {
  it('confidence 离散档 → number 展示映射', () => {
    expect(buildAction(ranked({ confidence: 'HIGH' })).confidence).toBe(CONFIDENCE_TO_NUMBER.HIGH)
    expect(buildAction(ranked({ confidence: 'MEDIUM' })).confidence).toBe(CONFIDENCE_TO_NUMBER.MEDIUM)
    expect(buildAction(ranked({ confidence: 'LOW' })).confidence).toBe(CONFIDENCE_TO_NUMBER.LOW)
  })

  it('reason = topReason（D22：L5 判定不进入 reason）', () => {
    const a = buildAction(ranked({ topReason: '多个方向旗鼓相当，选择稳定衔接的下一步' }))
    expect(a.reason).toBe('多个方向旗鼓相当，选择稳定衔接的下一步')
    expect(a.reason).not.toContain('dimension')
    expect(a.reason).not.toContain('来源')
  })

  it('有证据 → narrativeHook 引用可靠联系；无证据（NONE）→ 诚实表述', () => {
    const withEv = buildAction(ranked())
    expect(withEv.narrativeHook).toContain('可靠的历史联系')

    const noEv = buildAction(ranked({
      evidence: [{ evidenceId: 'e0', kind: 'NONE', strength: 0, provenance: 'none', source: null }] as RelationEvidence[],
      features: { relationshipStrength: 0, explanationQuality: 0, temporalContinuity: null, spatialContinuity: null, contextRelevance: null } as ContinuityFeatures,
    }))
    expect(noEv.narrativeHook).toContain('去了解')
  })

  it('D12: 返回字段 = 既有 ExplorationAction 接口（不扩张）', () => {
    const a = buildAction(ranked())
    expect(Object.keys(a).sort()).toEqual(
      ['type', 'targetRef', 'reason', 'narrativeHook', 'expectedGrowth', 'confidence'].sort(),
    )
    expect(a.targetRef).toBe('t-1')
    expect(a.expectedGrowth.dimension).toBeDefined()
    expect(a.expectedGrowth.relationType).toBeDefined()
  })
})

describe('ACTION_TYPE_BY_SOURCE / CONFIDENCE_TO_NUMBER — 冻结表完整性', () => {
  it('4 源全部显式映射（无 fallback）', () => {
    expect(Object.keys(ACTION_TYPE_BY_SOURCE).sort()).toEqual([
      'cross_topic_bridge',
      'dimension_target',
      'package_next',
      'relationship_neighbor',
    ])
  })

  it('confidence 三档全部显式映射', () => {
    expect(Object.keys(CONFIDENCE_TO_NUMBER).sort()).toEqual(['HIGH', 'LOW', 'MEDIUM'])
  })
})
