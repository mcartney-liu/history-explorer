// ============================================================
// candidateRanking.ts — Phase C 分层词典序 Ranking（PC7 + PC8 + D21/D22/D23）
// ------------------------------------------------------------
// 依据：ADR-0024 v6 Accepted + PHASE_C_IMPLEMENTATION_DESIGN.md v3 §2.3
// 职责：回答「哪个候选第一」——只产出 RankedCandidate[]，绝不构造决策动作
//       （Ranking ≠ Action Construction，PO v7 钉死）。
// 红线：
//   PC3  本模块绝不消费连续性总分（只消费 ContinuityFeatures，硬句见 ADR §3.3）
//   PC7  分层 L1→L5 词典序，deterministic
//   PC8  纯函数：只读 declared inputs，禁时钟/随机/全局状态/LLM
//   D21  离散化 = 机械查表（RS/EQ 精确枚举，禁阈值判断）
//   D22  source precedence 只在 L5，非业务理由
// 施工顺序：C-S4 类型契约 + 测试先行（红）→ 实现（绿）。
// ============================================================

import type { RelationEvidence, ContinuityFeatures } from '../../data/continuityEngine'
import type { ExplorationCandidate, CandidateSource } from './candidateGeneration'
import {
  deriveCandidateContext,
  type CandidateContextFeatures,
  type DiscreteLevel,
  type GapPriority,
} from './candidateContext'

export interface RankedCandidate {
  candidate: ExplorationCandidate
  /** B 产出：该候选与当前实体的关系证据（可审计）。 */
  evidence: RelationEvidence[]
  /** B 产出：连续性特征（TC/SC=null 不参与）。 */
  features: ContinuityFeatures
  /** C 产出：上下文特征。 */
  context: CandidateContextFeatures
  /** 胜出层（trace 用：1..5）。 */
  winningLayer: 1 | 2 | 3 | 4 | 5
  /** 决策置信度（离散三档，D13；两维：winning layer + decisive/marginal）。 */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  /** 为什么它最值得（供 reason/narrativeHook；D22：L5 结果不进此字段）。 */
  topReason: string
}

/** D21 冻结表：RS 精确枚举（B 实际只产这些值；表外值拒绝）。 */
export const RS_TO_LEVEL: Record<number, DiscreteLevel> = {
  1: 'HIGH', // 冻结边（relationship_edge）
  0.9: 'MEDIUM', // claim high
  0.7: 'MEDIUM', // claim medium
  0.5: 'LOW', // claim low / weak bridge
  0.45: 'LOW', // NONE 诚实表达
  0: 'NONE', // 无证据
}

/** D21 冻结表：EQ 精确枚举。 */
export const EQ_TO_LEVEL: Record<number, DiscreteLevel> = {
  0.85: 'HIGH', // 有 claim 素材
  0.6: 'MEDIUM', // 有边标签
  0.45: 'LOW', // NONE 诚实陈述
  0: 'NONE', // 无素材
}

/** 查询函数注入 B 引擎（保证单引擎复用 + 可测）。 */
export interface EvidenceProvider {
  (c: ExplorationCandidate): { evidence: RelationEvidence[]; features: ContinuityFeatures }
}

export interface RankingContext {
  openGaps: { entityGid: string; priority: GapPriority }[]
  dimensionState?: { missing: string[]; covered: string[] } | null
  currentTopic?: string | null
  history?: string[] | null
  explored?: string[] | null
  /** 候选 → 关系证据的查询函数（注入 B 引擎，PC2 单引擎复用）。 */
  collectEvidence: EvidenceProvider
  /** 候选元数据（维度/主题/重叠，供 context 推导）。 */
  meta?: Record<string, { dimension?: string | null; topic?: string | null; bridged?: boolean; overlap?: number | null }>
}

/** L5 source precedence（与 Action.type 构造 precedence 一致，仅作确定性 tie-break）。 */
export const SOURCE_PRECEDENCE: CandidateSource[] = [
  'dimension_target',
  'relationship_neighbor',
  'cross_topic_bridge',
  'package_next',
]

/**
 * PC7 分层契约：L1 GapPriority → L2 Context → L3 Continuity → L4 Novelty → L5 tie。
 * PC8 纯函数：同输入同输出；禁时钟/随机/全局状态。
 * 返回按排名排序的 RankedCandidate[]（第一名 = [0]）。
 * null 语义（D16）：某层对候选不可判定 → 视为 tie，继续比较下一层。
 */
export function rankCandidates(
  current: { gid: string; name: string },
  candidates: ExplorationCandidate[],
  ctx: RankingContext,
): RankedCandidate[] {
  void current // 契约签名保留（API surface 对齐 ADR）；排序只依赖候选与上下文
  const enriched = candidates.map((candidate) => {
    const { evidence, features } = ctx.collectEvidence(candidate)
    const context = deriveCandidateContext(candidate, ctx, ctx.meta?.[candidate.targetRef])
    return { candidate, evidence, features, context }
  })

  if (enriched.length === 0) return []
  if (enriched.length === 1) {
    // 单候选：无竞争对比，保守 LOW
    const e = enriched[0]
    return [
      {
        ...e,
        winningLayer: 1,
        confidence: 'LOW',
        topReason: '当前仅有一个可探索方向',
      },
    ]
  }

  const sorted = [...enriched].sort((a, b) => {
    // layerCompare 返回正数 = a 优于 b → sort 需负值让 a 在前
    return -layerCompare(a, b).cmp
  })

  // 第一名相对第二名的比较结果（用于 winningLayer / confidence）
  const winner = sorted[0]
  const runner = sorted[1]
  const verdict = layerCompare(winner, runner)

  return sorted.map((e, i) => ({
    ...e,
    winningLayer: i === 0 ? verdict.layer : 1,
    confidence: i === 0 ? confidenceFor(verdict) : 'LOW',
    topReason: i === 0 ? reasonFor(verdict) : '',
  }))
}

// ---------- 内部实现（纯函数，PC8） ----------

const LEVEL_ORDER: Record<DiscreteLevel, number> = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 }
const GAP_ORDER: Record<GapPriority, number> = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }

/** null 语义：null → tie（返回 0），不按 0 比较。 */
const cmpDiscrete = (a: DiscreteLevel | null, b: DiscreteLevel | null): number => {
  if (a === null && b === null) return 0
  if (a === null) return 0 // 未知 = tie（D16），不当作低分
  if (b === null) return 0
  return LEVEL_ORDER[a] - LEVEL_ORDER[b]
}

const cmpNum = (a: number, b: number): number => (a > b ? 1 : a < b ? -1 : 0)

/** 查表（D21：精确枚举，表外值 → NONE 最低档，拒绝自由阈值）。 */
const rsLevel = (rs: number): number => LEVEL_ORDER[RS_TO_LEVEL[rs] ?? 'NONE']
const eqLevel = (eq: number): number => LEVEL_ORDER[EQ_TO_LEVEL[eq] ?? 'NONE']

const sourceRank = (c: ExplorationCandidate): number =>
  Math.min(...c.sources.map((s) => SOURCE_PRECEDENCE.indexOf(s)))

interface LayerVerdict {
  cmp: number
  layer: 1 | 2 | 3 | 4 | 5
  /** 胜出层主比较项（decisive 判定用）。 */
  main: 'gap' | 'dimension' | 'topic' | 'path' | 'rs' | 'eq' | 'novelty' | 'source'
}

/** L1–L5 词典序比较（返回第一名相对第二名的判定）。 */
function layerCompare(a: RankedInput, b: RankedInput): LayerVerdict {
  // L1 GapPriority（无 null：无 gap 记录 = NONE，产品语义例外）
  const l1 = cmpNum(GAP_ORDER[a.context.gapPriority], GAP_ORDER[b.context.gapPriority])
  if (l1 !== 0) return { cmp: l1, layer: 1, main: 'gap' }

  // L2 Context 子层（dimension → topic → path；null=tie 进下一子层）
  const l2d = cmpDiscrete(a.context.dimensionRelevance, b.context.dimensionRelevance)
  if (l2d !== 0) return { cmp: l2d, layer: 2, main: 'dimension' }
  const l2t = cmpDiscrete(a.context.topicRelevance, b.context.topicRelevance)
  if (l2t !== 0) return { cmp: l2t, layer: 2, main: 'topic' }
  const l2p = cmpDiscrete(a.context.pathRelevance, b.context.pathRelevance)
  if (l2p !== 0) return { cmp: l2p, layer: 2, main: 'path' }

  // L3 Continuity（RS → EQ；机械查表 D21）
  const l3r = cmpNum(rsLevel(a.features.relationshipStrength), rsLevel(b.features.relationshipStrength))
  if (l3r !== 0) return { cmp: l3r, layer: 3, main: 'rs' }
  const l3e = cmpNum(eqLevel(a.features.explanationQuality), eqLevel(b.features.explanationQuality))
  if (l3e !== 0) return { cmp: l3e, layer: 3, main: 'eq' }

  // L4 Novelty（null=tie）
  const l4 = cmpDiscrete(a.context.novelty, b.context.novelty)
  if (l4 !== 0) return { cmp: l4, layer: 4, main: 'novelty' }

  // L5 Deterministic tie-breaker（source precedence → stable targetRef）
  const sA = sourceRank(a.candidate)
  const sB = sourceRank(b.candidate)
  // precedence 数值小 = 更优（dimension_target=0 最优）→ a 优当 sA < sB → 返回正数
  if (sA !== sB) return { cmp: sB - sA, layer: 5, main: 'source' }
  return {
    cmp: a.candidate.targetRef < b.candidate.targetRef ? 1 : -1,
    layer: 5,
    main: 'source',
  }
}

/** B1：两维离散 confidence（winning layer + decisive/marginal，D13）。 */
function confidenceFor(v: LayerVerdict): 'HIGH' | 'MEDIUM' | 'LOW' {
  const decisive = v.main === 'gap' || v.main === 'dimension' || v.main === 'rs'
  switch (v.layer) {
    case 1:
      return 'HIGH' // L1 胜出恒为 decisive（gap 同档即进 L2）
    case 2:
      return decisive ? 'HIGH' : 'MEDIUM'
    case 3:
      return decisive ? 'MEDIUM' : 'LOW'
    case 4:
    case 5:
      return 'LOW'
  }
}

/** D22：topReason 不含来源描述（L5 用通用文案）。 */
function reasonFor(v: LayerVerdict): string {
  switch (v.layer) {
    case 1:
      return '命中你标记的探索缺口'
    case 2:
      return '与当前探索上下文最匹配'
    case 3:
      return '与当前实体存在最可靠的关系'
    case 4:
      return '提供全新的探索方向'
    default:
      return '多个方向旗鼓相当，选择稳定衔接的下一步'
  }
}

interface RankedInput {
  candidate: ExplorationCandidate
  evidence: RelationEvidence[]
  features: ContinuityFeatures
  context: CandidateContextFeatures
}
