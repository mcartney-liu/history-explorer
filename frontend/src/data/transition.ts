// ============================================================
// Transition Function（过渡函数）— 核心能力 v1 + v2 多跳路径桥
// ------------------------------------------------------------
// 课题：docs/product/TRANSITION_FUNCTION_SPEC.md（2026-08-15 PO 立项）
// 定位：回答"用户从 A 到 B 时，应该看到怎样的过渡描述"。所有实体
// 承接场景共用（包内站间衔接 / 入口桥 / 下一步推荐 …）。
//
// v1 三层 + v2 路径层：
//   ① 有中文 evidence claim → 讲 claim 叙述（最有意义，策展人写的事实）
//   ② 无 claim 但有直接关系边 → 关系短句（"唐 早于 宋"，18 种中文标签）
//   ③ 无直接边但有共同邻居 C → 多跳路径桥："A 与 B 通过 C 相关联"
//      （A—C、B—C 均为真实边，图 grounded，零编造；v2 新增）
//   ④ 无直接边且无共同邻居 → text=null（场景自行降级，如"从「A」的探索延续而来"）
// 纯展示层、图 grounded、零编造；claim 英文（其他包）在中文界面降级为
// 关系短句。数据源由调用方自行查询（包数据 relationship_paths / 实体
// 详情 relationships / 实体邻居缓存 entityCache），本函数只负责"怎么讲"。
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
  /** 最终过渡文本（claim ?? short ?? 路径桥；皆无 = null → 第四层降级）。 */
  text: string | null
  /** v3 证据分级（P09 真值层）：claim 层取学术共识分级、短句层 strong、
   *  路径桥层 weak；无过渡时为 null。 */
  confidence: TransitionConfidence | null
}

export type TransitionConfidence = 'strong' | 'moderate' | 'weak'

const hasCJK = (s: string) => /[\u4e00-\u9fff]/.test(s)

// evidence claim 的学术共识分级 → 展示分级（P09 真值层）。
const CLAIM_CONF: Record<string, TransitionConfidence> = {
  high: 'strong',
  medium: 'moderate',
  low: 'weak',
}

export function describeTransition(
  fromName: string,
  toName: string,
  edge: TransitionEdge | null,
  /** v2 多跳路径桥：A 与 B 的共同邻居（无直接边时使用；可为空）。 */
  commonNeighbor?: { gid: string; name: string } | null,
): TransitionResult {
  // 第三/四层：无直接边。有共同邻居 → 多跳路径桥（间接关联，weak）；
  // 否则不编造，交给场景降级。
  if (!edge) {
    if (commonNeighbor) {
      return {
        claim: null,
        short: null,
        text: `${fromName} 与 ${toName} 通过 ${commonNeighbor.name} 相关联`,
        confidence: 'weak',
      }
    }
    return { claim: null, short: null, text: null, confidence: null }
  }
  // 第一层：优先中文 claim 叙述（策展人写的事实，最有意义；分级随 claim）。
  const zhClaims = getEvidenceWithSources(edge.evidence ?? [])
    .map((e) => e.claim)
    .filter((c) => c && hasCJK(c))
  if (zhClaims.length > 0) {
    const claimConf = getEvidenceWithSources(edge.evidence ?? [])[0]?.confidence
    return {
      claim: zhClaims[0],
      short: null,
      text: zhClaims[0],
      confidence: CLAIM_CONF[claimConf ?? ''] ?? 'moderate',
    }
  }
  // 第二层：关系短句（冻结 18 关系边 = 图事实，strong）。
  const short = `${fromName} ${relLabel(edge.type)} ${toName}`
  return { claim: null, short, text: short, confidence: 'strong' }
}
