// ============================================================
// candidateContext.ts — Phase C 上下文特征派生（PC4 + D20）
// ------------------------------------------------------------
// 依据：ADR-0024 v6 Accepted + PHASE_C_IMPLEMENTATION_DESIGN.md v3 §2.2
// 职责：把真实上下文（openGaps / dimensionState / currentTopic / history / explored）
//       机械映射成离散特征。只做查表映射，绝不重判关系（D21 延续）。
// 施工顺序：C-S3 类型契约 + 测试先行（红）→ 实现（绿）。
// ============================================================

import type { ExplorationCandidate } from './candidateGeneration'

/** 缺口优先级离散等级（D17，PO v4 离散化）。 */
export type GapPriority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

/** 离散等级（L2/L3 通用）。 */
export type DiscreteLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'

export interface CandidateContextFeatures {
  /** 候选命中用户缺口（D17 五档）。无 gap 记录 → NONE（产品语义例外，D20）。 */
  gapPriority: GapPriority
  /** 候选覆盖缺失维度程度。无维度信息 → null（PC4：缺失=null= tie，非 0）。 */
  dimensionRelevance: DiscreteLevel | null
  /** 候选与当前主题相关度。无主题 → null。 */
  topicRelevance: DiscreteLevel | null
  /** 候选与当前探索路径延续度。无 history → null。 */
  pathRelevance: DiscreteLevel | null
  /** 新颖度（与已探索方向重叠的反向）。无 explored → null。 */
  novelty: DiscreteLevel | null
  /** 是否已在 exploredAnchors（0/1 惩罚项）。 */
  alreadyExploredPenalty: number
}

/**
 * D20（Blocking #1）：GapPriority 必须由候选与 openGaps 的【显式关联】确定性推导。
 * - 候选 targetRef 必须是某 openGap 的显式目标实体 → 才算命中；
 * - 候选 → 0..N gaps → 取 max；
 * - 禁止语义相似度推断 / 自由启发式；
 * - 无 gap 记录 → NONE（产品语义例外：无缺口记录即不优先；不得扩展 L2–L4）。
 */
export function deriveGapPriority(
  candidate: ExplorationCandidate,
  openGaps: { entityGid: string; priority: GapPriority }[],
): GapPriority {
  // D20：仅显式目标实体命中；0..N gaps 取 max；无命中 → NONE（不推断、不启发式）
  let max: GapPriority = 'NONE'
  for (const gap of openGaps) {
    if (gap.entityGid === candidate.targetRef && GAP_ORDER[gap.priority] > GAP_ORDER[max]) {
      max = gap.priority
    }
  }
  return max
}

const GAP_ORDER: Record<GapPriority, number> = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
}

/** 候选元数据（调用方生成时注入，决策层只做机械映射、不查数据）。
 *  第一版简化：dimension/topic/overlap 由调用方从来源信息填充；
 *  - dimension_target 来源 → dimension = 该缺失维度
 *  - cross_topic_bridge 来源 → topic = 桥接主题、bridged = true
 *  - overlap = 候选与已探索实体中"同一方向"的重叠数（0..N） */
export interface CandidateMeta {
  /** 候选所属维度（如 'politics'）。无 → null。 */
  dimension?: string | null
  /** 候选所属主题。无 → null。 */
  topic?: string | null
  /** 是否跨主题桥接（cross_topic_bridge 来源）。 */
  bridged?: boolean
  /** 与已探索方向的重叠实体数。无 → null。 */
  overlap?: number | null
}

/**
 * PC4：特征缺失 → null（不是 0、不编默认值），与 D16 全局 null 语义一致。
 * 维度映射（冻结）：
 * - dimensionRelevance：meta.dimension 命中 missing → HIGH；命中 covered → LOW；无 → null
 * - topicRelevance：meta.topic == currentTopic → HIGH；bridged → MEDIUM；不同且未桥 → NONE；无 → null
 * - pathRelevance：targetRef 在最近 3 步 → HIGH；更早路径 → MEDIUM；不在 → NONE；无 history → null
 * - novelty：overlap 0 → HIGH；1 → MEDIUM；2 → LOW；≥3 → NONE；无 → null
 */
export function deriveCandidateContext(
  candidate: ExplorationCandidate,
  ctx: {
    openGaps: { entityGid: string; priority: GapPriority }[]
    dimensionState?: { missing: string[]; covered: string[] } | null
    currentTopic?: string | null
    history?: string[] | null
    explored?: string[] | null
  },
  meta?: CandidateMeta,
): CandidateContextFeatures {
  // D20：L1 显式关联推导（产品语义例外：无 gap 记录 → NONE）
  const gapPriority = deriveGapPriority(candidate, ctx.openGaps)

  // 维度：meta.dimension 命中 missing → HIGH / covered → LOW / 其它 → NONE；无 meta → null
  let dimensionRelevance: DiscreteLevel | null = null
  if (meta?.dimension) {
    if (ctx.dimensionState?.missing.includes(meta.dimension)) dimensionRelevance = 'HIGH'
    else if (ctx.dimensionState?.covered.includes(meta.dimension)) dimensionRelevance = 'LOW'
    else dimensionRelevance = 'NONE'
  }

  // 主题：meta.topic == currentTopic → HIGH；bridged → MEDIUM；不同且未桥 → NONE；无 meta.topic → null
  let topicRelevance: DiscreteLevel | null = null
  if (meta?.topic) {
    if (ctx.currentTopic && meta.topic === ctx.currentTopic) topicRelevance = 'HIGH'
    else if (meta.bridged) topicRelevance = 'MEDIUM'
    else topicRelevance = 'NONE'
  }

  // 路径：targetRef 在最近 3 步 → HIGH；更早 → MEDIUM；不在 → NONE；无 history → null
  let pathRelevance: DiscreteLevel | null = null
  if (ctx.history && ctx.history.length > 0) {
    const idx = ctx.history.indexOf(candidate.targetRef)
    if (idx === -1) pathRelevance = 'NONE'
    else if (idx >= ctx.history.length - 3) pathRelevance = 'HIGH'
    else pathRelevance = 'MEDIUM'
  }

  // 新颖度：overlap 0 → HIGH；1 → MEDIUM；2 → LOW；≥3 → NONE；无 meta.overlap → null
  let novelty: DiscreteLevel | null = null
  if (meta?.overlap !== undefined && meta.overlap !== null) {
    if (meta.overlap <= 0) novelty = 'HIGH'
    else if (meta.overlap === 1) novelty = 'MEDIUM'
    else if (meta.overlap === 2) novelty = 'LOW'
    else novelty = 'NONE'
  }

  // 惩罚项：在 explored → 1 / 不在 → 0（缺数据即 0，无歧义）
  const alreadyExploredPenalty = ctx.explored?.includes(candidate.targetRef) ? 1 : 0

  return {
    gapPriority,
    dimensionRelevance,
    topicRelevance,
    pathRelevance,
    novelty,
    alreadyExploredPenalty,
  }
}
