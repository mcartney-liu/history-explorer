// ============================================================
// candidateGeneration.ts — Phase C 候选生成器（PC1）
// ------------------------------------------------------------
// 依据：ADR-0024 v6 Accepted + PHASE_C_IMPLEMENTATION_DESIGN.md v3 §2.1
// 职责：只回答「从当前节点，有哪些合理的下一步？」——生成候选集合，
//       绝不构造/返回决策动作对象（PC1），不参与任何排序决策（PC5）。
// 施工顺序：C-S1 类型契约（本文件）→ C-S1 测试先行（红）→ C-S2 实现（绿）。
// ============================================================

/** 冻结枚举（D14，防 schema 漂移）。 */
export type CandidateSource =
  | 'relationship_neighbor'
  | 'cross_topic_bridge'
  | 'dimension_target'
  | 'package_next'

export interface ExplorationCandidate {
  /** 目标实体 gid（去重键）。 */
  targetRef: string
  /** 展示名。 */
  name: string
  /** 该候选的全部来源（去重后保留，provenance 不丢，D14）。
   *  顺序 = 生成器稳定遍历顺序，不是 ranking evidence（PO v7 钉死）。 */
  sources: CandidateSource[]
  /** 来源说明（trace 用）。 */
  hint?: string
}

/** 候选生成输入（全部可选——调用方有什么给什么，缺的源自然不产候选）。 */
export interface CandidateGenerationContext {
  /** 包内下一站（stations 路线，D11 保留为候选源之一，PC5 无特权）。 */
  packageNext?: { gid: string; name: string } | null
  /** 图邻居（entityCache，RelationshipInsight 已缓存）。 */
  neighbors?: { gid: string; name: string }[]
  /** 跨主题桥（/explore 响应 cross_topic_related）。 */
  bridges?: { gid: string; name: string }[]
  /** 维度目标（dimensionMapping 中缺失维度的实体）。 */
  dimensionTargets?: { gid: string; name: string }[]
  /** 已访问 gid（去重排除）。 */
  explored?: string[]
}

/** 稳定遍历顺序（同时也是 sources[] 合并顺序 = L5 tie-breaker 的 source precedence）。 */
export const CANDIDATE_SOURCE_ORDER: CandidateSource[] = [
  'dimension_target',
  'relationship_neighbor',
  'cross_topic_bridge',
  'package_next',
]

/**
 * PC1：只产候选集合，绝不构造/返回决策动作对象。
 * - 去重：以 targetRef 为键合并多来源（sources[] 保留全部，D14）。
 * - explored 直接排除；当前实体自身排除。
 * - 空候选 → []（调用方回退 stations / Rule 1–5，D11，不崩溃）。
 * - sources[] 顺序 = CANDIDATE_SOURCE_ORDER 稳定顺序，不得当作 ranking evidence。
 */
export function generateCandidates(
  current: { gid: string; name: string },
  ctx: CandidateGenerationContext,
): ExplorationCandidate[] {
  const explored = new Set<string>(ctx.explored ?? [])
  explored.add(current.gid)

  const byGid = new Map<string, ExplorationCandidate>()
  const add = (source: CandidateSource, ref: { gid: string; name: string }) => {
    if (!ref?.gid || explored.has(ref.gid)) return
    const existing = byGid.get(ref.gid)
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source)
    } else {
      byGid.set(ref.gid, { targetRef: ref.gid, name: ref.name, sources: [source] })
    }
  }

  // 四源生成（按 CANDIDATE_SOURCE_ORDER 顺序遍历，保证 sources[] 稳定顺序）
  for (const d of ctx.dimensionTargets ?? []) add('dimension_target', d)
  for (const n of ctx.neighbors ?? []) add('relationship_neighbor', n)
  for (const b of ctx.bridges ?? []) add('cross_topic_bridge', b)
  if (ctx.packageNext?.gid) add('package_next', ctx.packageNext)

  return [...byGid.values()]
}
