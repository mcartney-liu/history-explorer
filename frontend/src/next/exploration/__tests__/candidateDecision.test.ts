// ============================================================
// candidateDecision — Phase C 候选决策编排层测试（C-S6 测试先行）
// ------------------------------------------------------------
// 依据：ADR-0024 v6 Accepted + PHASE_C_IMPLEMENTATION_DESIGN.md v3 §2.4
// 覆盖：流水线产出 / 候选空回退 null / 证据注入（PC2 单引擎）/
//       trace 可审计 / explored 排除
// ============================================================

import { describe, it, expect } from 'vitest'
import { decideNextCandidate, type CandidateDecisionInputs } from '../candidateDecision'
import type { RelationEvidence, ContinuityFeatures } from '../../data/continuityEngine'

const mkEvidence = (rs: number): { evidence: RelationEvidence[]; features: ContinuityFeatures } => ({
  evidence: [
    { evidenceId: `e-${rs}`, kind: rs > 0 ? 'CAUSAL' : 'NONE', strength: rs, provenance: 'relationship_edge', source: 'caused' },
  ],
  features: {
    relationshipStrength: rs,
    explanationQuality: 0.6,
    temporalContinuity: null,
    spatialContinuity: null,
    contextRelevance: null,
  },
})

const base = (over: Partial<CandidateDecisionInputs> = {}): CandidateDecisionInputs => ({
  current: { gid: 'cur', name: '当前' },
  neighbors: [{ gid: 'n-1', name: '邻居' }],
  collectEvidence: (c) => (c.targetRef === 'ev-1' ? mkEvidence(1) : mkEvidence(0)),
  ...over,
})

describe('decideNextCandidate — 流水线', () => {
  it('候选非空 → 产出 Decision（action 字段完整 + trace 可审计）', () => {
    const d = decideNextCandidate(base(), 'test-v1', 12345)
    expect(d).not.toBeNull()
    expect(d!.output.type).toBe('follow_cause') // relationship_neighbor
    expect(d!.output.targetRef).toBe('n-1')
    expect(d!.output.reason).toBeTruthy()
    expect(d!.output.narrativeHook).toBeTruthy()
    expect(d!.output.expectedGrowth.dimension).toBeDefined()
    expect(d!.trace[0].ruleId).toBe('c-candidate-decision')
    expect(d!.trace[0].inputs.targetRef).toBe('n-1')
  })

  it('候选空（无任何源）→ null（调用方回退，D11）', () => {
    expect(decideNextCandidate(base({ neighbors: undefined }), 'test-v1', 1)).toBeNull()
  })

  it('explored 全排除 → 候选空 → null', () => {
    expect(
      decideNextCandidate(base({ explored: ['n-1'] }), 'test-v1', 1),
    ).toBeNull()
  })

  it('collectEvidence 注入 B 引擎（PC2：编排层不写关系判断）', () => {
    // 有证据候选在 L3 胜出（L1-L2 全平）
    const d = decideNextCandidate(
      base({
        neighbors: [{ gid: 'ev-1', name: '强关系' }, { gid: 'weak', name: '弱关系' }],
        collectEvidence: (c) => (c.targetRef === 'ev-1' ? mkEvidence(1) : mkEvidence(0)),
      }),
      'test-v1',
      1,
    )
    expect(d!.output.targetRef).toBe('ev-1')
    expect(d!.trace[0].inputs.winningLayer).toBe(3)
  })

  it('确定性：同输入两次调用 → 同 targetRef（PC8 延续）', () => {
    const a = decideNextCandidate(base(), 'test-v1', 1)
    const b = decideNextCandidate(base(), 'test-v1', 2)
    expect(a!.output.targetRef).toBe(b!.output.targetRef)
  })
})
