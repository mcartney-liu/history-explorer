// ============================================================
// Transition Function — Legacy Adapter（C9，PO 钉死）
// ------------------------------------------------------------
// 课题：docs/product/TRANSITION_FUNCTION_SPEC.md（2026-08-15 PO 立项）
// 定位（v3，Phase B 施工 S6）：本文件【只做旧 API → 新引擎的适配层】，
// 不允许拥有任何业务判断（C9 Legacy Adapter Non-Duplication）：
//   1. 不读取 relationship labels（relLabel）
//   2. 不访问 neighbors（getEntityNeighbors）
//   3. 不实现关系优先级
//   4. 不实现 claim 选择
//   5. 不包含旧 4 层 if-else 判断
//   6. 只调用 ContinuityEngine + B 解释层，并转换返回结构
// 真正的能力在：frontend/src/data/continuityEngine.ts（证据收集 + 特征）
//              + frontend/src/data/continuityExplanation.ts（B 解释层）
// 旧调用方（已迁移：ConnectionCard / EntityPage）不再走本文件；
// 本文件保留仅为兼容历史引用，避免一次性全量迁移的风险（PO 十四节）。
// ============================================================

import { collectRelationEvidence } from './continuityEngine'
import {
  buildExplanationCandidates,
  selectBestExplanation,
  expressHonestNone,
} from './continuityExplanation'

/** 调用方提供的关系边（不同数据源各自查询后归一化传入）。 */
export interface TransitionEdge {
  type: string
  /** evidence claim ids（如 ec-xxx）；无则退化为关系短句。 */
  evidence?: string[]
}

export interface TransitionResult {
  /** 第一层：中文 claim 叙述（有则 text 采用它）。 */
  claim: string | null
  /** 第二层：关系短句（如"唐 早于 宋"）。 */
  short: string | null
  /** 最终过渡文本（解释素材或诚实陈述；皆无 → null → 场景降级）。 */
  text: string | null
  /** 证据分级（P09 真值层）：素材 confidence；无过渡时为 null。 */
  confidence: TransitionConfidence | null
}

export type TransitionConfidence = 'strong' | 'moderate' | 'weak'

/** Legacy Adapter（C9）：只转换结构，零业务判断。
 *  语义：collectRelationEvidence → buildExplanationCandidates →
 *  selectBestExplanation（B 选择器）；NONE → expressHonestNone。
 *  返回旧 { claim, short, text, confidence } 结构保持调用方兼容。 */
export function describeTransition(
  fromName: string,
  toName: string,
  edge: TransitionEdge | null,
  /** v2 多跳路径桥：A 与 B 的共同邻居（无直接边时使用；可为空）。 */
  commonNeighbor?: { gid: string; name: string } | null,
): TransitionResult {
  const evidence = collectRelationEvidence(
    { gid: fromName, name: fromName },
    { gid: toName, name: toName },
    { edge: edge ? { type: edge.type, evidence: edge.evidence } : null, commonNeighbor },
  )
  const candidates = buildExplanationCandidates(evidence, fromName, toName)
  const selected = selectBestExplanation(candidates)
  const honest = evidence.some((e) => e.kind === 'NONE')
    ? expressHonestNone(fromName, toName)
    : null

  if (selected) {
    // 兼容旧结构：有 claim 素材视为 claim 层；否则视为短句层
    const isClaim = selected.confidence === 'moderate' || selected.confidence === 'strong'
      ? evidence.some((e) => e.provenance === 'claim' && e.evidenceId === selected.evidenceId)
      : false
    return {
      claim: isClaim ? selected.fact : null,
      short: isClaim ? null : selected.fact,
      text: selected.fact,
      confidence: selected.confidence,
    }
  }
  if (honest) {
    return {
      claim: null,
      short: null,
      text: honest.text,
      confidence: 'weak',
    }
  }
  return { claim: null, short: null, text: null, confidence: null }
}
