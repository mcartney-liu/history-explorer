// ============================================================
// Transition Function（过渡函数）— 核心能力 v1
// ------------------------------------------------------------
// 课题：docs/product/TRANSITION_FUNCTION_SPEC.md（2026-08-15 PO 立项）
// 定位：回答"用户从 A 到 B 时，应该看到怎样的过渡描述"。所有实体
// 承接场景共用（包内站间衔接 / 入口桥 / 下一步推荐 …）。
//
// v1 三层设计：
//   ① 有中文 evidence claim → 讲 claim 叙述（最有意义，策展人写的事实）
//   ② 无 claim 但有直接关系边 → 关系短句（"唐 早于 宋"，18 种中文标签）
//   ③ 无直接边 → text=null（场景自行降级文案，如"从「A」的探索延续而来"）
// 纯展示层、图 grounded、零编造；claim 英文（其他包）在中文界面降级为
// 关系短句。数据源由调用方自行查询（包数据 relationship_paths / 实体
// 详情 relationships 等），本函数只负责"怎么讲"。
// ============================================================

import { getEvidenceWithSources } from './explorationPackages'
import { relLabel } from './relationshipLabels'

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
  /** 最终过渡文本（claim ?? short；两者皆无 = null → 第三层留白/降级）。 */
  text: string | null
}

const hasCJK = (s: string) => /[\u4e00-\u9fff]/.test(s)

export function describeTransition(
  fromName: string,
  toName: string,
  edge: TransitionEdge | null,
): TransitionResult {
  // 第三层：无直接边 → 不编造，text=null 交给场景降级。
  if (!edge) return { claim: null, short: null, text: null }
  // 第一层：优先中文 claim 叙述（策展人写的事实，最有意义）。
  const zhClaims = getEvidenceWithSources(edge.evidence ?? [])
    .map((e) => e.claim)
    .filter((c) => c && hasCJK(c))
  if (zhClaims.length > 0) {
    return { claim: zhClaims[0], short: null, text: zhClaims[0] }
  }
  // 第二层：关系短句（准确但朴素）。
  const short = `${fromName} ${relLabel(edge.type)} ${toName}`
  return { claim: null, short, text: short }
}
