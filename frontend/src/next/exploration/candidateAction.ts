// ============================================================
// candidateAction.ts — Phase C Action Builder（Ranking ≠ Action Construction）
// ------------------------------------------------------------
// 依据：ADR-0024 v6 Accepted + PHASE_C_IMPLEMENTATION_DESIGN.md v3 §2.1.1/2.4
// 职责：把第一名 RankedCandidate 确定性映射成 ExplorationAction。
// 红线：
//   B2（Blocking #2）多 provenance → Action.type 由 source precedence 确定性构造，
//     但【只用于构造，绝不进入 L1–L4 Ranking】（PC5 延续）
//   D13  confidence = 离散决策级别（HIGH/MEDIUM/LOW → 既有 number 字段的展示映射）
//   D22  topReason 不含来源描述（L5 判定由 rankCandidates 保证）
//   D12  Action 字段不扩张（复用既有 ExplorationAction 接口）
// 施工顺序：C-S5 测试先行（红）→ 实现（绿）。
// ============================================================

import type { ExplorationAction, ExplorationActionType } from './ExplorationPolicy'
import type { RankedCandidate } from './candidateRanking'
import type { CandidateSource } from './candidateGeneration'

/**
 * B2：多 provenance → Action.type 确定性规则（source precedence 构造，PC5 延续：
 * 该 precedence 只用于 Action 构造，绝不参与 L1–L4 排序）。
 */
export const ACTION_TYPE_BY_SOURCE: Record<CandidateSource, ExplorationActionType> = {
  dimension_target: 'open_dimension',
  relationship_neighbor: 'follow_cause',
  cross_topic_bridge: 'compare_context',
  package_next: 'deep_continue',
}

/** D13：离散决策档 → 既有 number 字段的展示映射（决策本身是离散的，此表仅适配接口）。 */
export const CONFIDENCE_TO_NUMBER: Record<'HIGH' | 'MEDIUM' | 'LOW', number> = {
  HIGH: 0.9,
  MEDIUM: 0.6,
  LOW: 0.35,
}

/**
 * 第一名 → ExplorationAction（确定性）。
 * - type：source precedence 逐项判定（dimension → relationship → cross_topic → package）
 * - reason：ranked.topReason（D22：L5 结果不进入 reason）
 * - narrativeHook：B 层解释素材优先（evidence 非空时），否则通用文案
 * - expectedGrowth：dimension = 候选命中维度（meta）或 'context'；relationType = 证据 kind
 * - confidence：离散档 → number 展示映射（D13，绝不等同于关系证据置信度）
 */
export function buildAction(ranked: RankedCandidate): ExplorationAction {
  const { candidate, topReason, confidence } = ranked

  // B2：确定性 type（多来源时按 precedence 取第一个命中项）
  let type: ExplorationActionType = 'deep_continue'
  for (const s of ['dimension_target', 'relationship_neighbor', 'cross_topic_bridge'] as const) {
    if (candidate.sources.includes(s)) {
      type = ACTION_TYPE_BY_SOURCE[s]
      break
    }
  }

  // narrativeHook：有证据 → 引用 B 层素材语义（"可解释的下一步"）；无证据 → 诚实表述
  const hasEvidence = ranked.evidence.length > 0 && ranked.evidence[0].kind !== 'NONE'
  const hook = hasEvidence
    ? `去了解「${candidate.name}」——它与当前实体有可靠的历史联系`
    : `去了解「${candidate.name}」——${topReason}`

  return {
    type,
    targetRef: candidate.targetRef,
    reason: topReason,
    narrativeHook: hook,
    expectedGrowth: {
      dimension: 'context',
      relationType: hasEvidence ? ranked.evidence[0].kind.toLowerCase() : 'exploration',
    },
    confidence: CONFIDENCE_TO_NUMBER[confidence],
  }
}
