// ============================================================
// ContinuityEngine — Phase B 探索连续性引擎（类型契约 + 关系分类映射）
// ------------------------------------------------------------
// 依据：ADR-0023 v3.1（§9 C1–C9）+ docs/product/PHASE_B_IMPLEMENTATION_DESIGN.md v2
// 职责边界（红线，C1/C2/C3）：
//   - 本文件只做「证据收集 + 特征合成」，不产生"下一步"、不排序候选、
//     不选定唯一解释、JCS 不进入任何导航决策。
//   - B 解释层（continuityExplanation.ts）与 C 决策层（未来 Phase C）各自消费证据。
// 本文件 = S0 类型契约 + RELATION_KIND_MAP（C8 穷举），函数实现见 S2。
// ============================================================

import { getEvidenceWithSources } from './explorationPackages'

// ── 展示分级（与 transition.ts 共享语义；P09 真值层）──
export type TransitionConfidence = 'strong' | 'moderate' | 'weak'

// ── RelationKind：8 类 + UNCLASSIFIED（PO 钉死的四态判别见下方注释）──
export type RelationKind =
  | 'DIRECT_HISTORICAL' // 可解释为直接历史关系，但无更具体语义分类（非兜底桶）
  | 'CAUSAL'            // 因果（caused / resulted_in / influenced / influenced_by …）
  | 'TEMPORAL_INHERIT'  // 时间继承（before / after / inherited / succeeded / contemporary_with …）
  | 'GEOGRAPHIC'        // 地理共属（located_at / born_in / died_in / spread …）
  | 'SHARED_ENTITY'     // 共同实体/共同活动（participated_in / traded_with / spoke …）
  | 'THEMATIC'          // 主题相关（practiced / wrote / reinterprets / disputes …）
  | 'WEAK_BRIDGE'       // 弱桥：无直接边但有共同邻居
  | 'NONE'              // 无可靠关系（合法状态，非 Bug）
  | 'UNCLASSIFIED'      // 有明确关系证据，但当前分类体系无法可靠表达其语义（≠ NONE）

// 四态判别（PO 第二轮钉死）：
//   有关系 + 可分类           → 对应 RelationKind
//   有关系 + 无法可靠分类     → UNCLASSIFIED（"存在我目前不能准确解释的关系证据"）
//   无直接边但有共同桥接     → WEAK_BRIDGE
//   无足够可靠关系           → NONE

// ── 证据来源层级（与 kind 严格分离，PO 钉死）──
//   kind        = 它是什么关系（语义）
//   provenance  = 这个判断来自哪里（数据源类别）
//   source      = 具体哪条数据证明（稳定 id）
export type EvidenceProvenance =
  | 'relationship_edge' // 来自冻结关系边
  | 'claim'             // 来自 evidence claim
  | 'shared_neighbor'   // 来自共同邻居
  | 'none'              // 仅 NONE 使用

// ── RelationEvidence：类型系统判别联合（C4 升级版，PO 钉死）──

export interface EvidenceBase {
  /** 稳定、内容派生的证据身份（PO 钉死）：
   *  由 kind + provenance + source + from + to 稳定 hash 派生；
   *  不是数组 index、不是 random UUID、不承担任何 ranking 意义。 */
  evidenceId: string
  kind: RelationKind
  /** 单证据内部描述值 0..1，MUST NOT 用于跨 kind 全局排序
   *  （除非调用方明确定义上下文规则）。 */
  strength: number
  /** 该证据在自身 kind 内部的证据强度（可选，如 claim 学术共识分级）。 */
  confidence?: TransitionConfidence
}

/** 正向证据：有具体数据可审计（C4 要求 provenance/source 非空）。 */
export interface PositiveRelationEvidence extends EvidenceBase {
  kind: Exclude<RelationKind, 'NONE' | 'UNCLASSIFIED'>
  provenance: Exclude<EvidenceProvenance, 'none'>
  source: string // relationship-id / claim-id / entity-id
}

/** 弱桥 / 未分类：有证据但 source 指向邻居实体或无法归类的边。 */
export interface IndirectRelationEvidence extends EvidenceBase {
  kind: 'WEAK_BRIDGE' | 'UNCLASSIFIED'
  provenance: 'shared_neighbor' | 'relationship_edge'
  source: string // 邻居 gid 或关系边 id
}

/** NONE：合法特殊状态，provenance='none'、source=null（类型系统特判，非测试漏洞）。 */
export interface NoneRelationEvidence extends EvidenceBase {
  kind: 'NONE'
  provenance: 'none'
  source: null
}

export type RelationEvidence =
  | PositiveRelationEvidence
  | IndirectRelationEvidence
  | NoneRelationEvidence

// ── ContinuityFeatures：核心输出（Feature Contract，PO 钉死 null 语义）──

export interface ContinuityFeatures {
  /** 是否有被证明的关系、强度如何（来自 RelationEvidence[] 汇总，仅作描述性聚合）。 */
  relationshipStrength: number
  /** 是否有可理解的人话解释（来自 B 解释层候选质量；NONE 的诚实陈述也计质量）。 */
  explanationQuality: number
  /** 时间连贯度（from/to 时间元数据；数据缺失 = null，不是 0）。 */
  temporalContinuity: number | null
  /** 空间/数据集连贯度（from/to 空间元数据；数据缺失 = null，不是 0）。 */
  spatialContinuity: number | null
  /** 与用户当前理解/探索缺口的相关度。Phase B 退化保留维，恒 null（C 施工时填）。 */
  contextRelevance: number | null
}

// ============================================================
// C8 — Relation Classification Exhaustiveness
// 映射对象 = 后端权威 20 类（backend/app/validation.py RELATIONSHIP_TYPES，
// 与数据实际全集完全一致）∪ 前端 REL_LABELS 独有 9 键（数据死键，防御未来引入）
// = 29 键全显式映射。禁止 default / 隐式 fallback / DIRECT_HISTORICAL 兜底。
// TS 层用 Record<FrozenRelationType, RelationKind> 穷举字面量联合，编译期强制补全。
// ============================================================

/** 冻结关系类型全集：后端权威 20 类 + 前端标签层 9 个备用键（29 键）。 */
export type FrozenRelationType =
  // 后端权威 20 类（validation.py RELATIONSHIP_TYPES）
  | 'caused' | 'influenced' | 'participated_in' | 'located_at' | 'related_to'
  | 'before' | 'after' | 'contemporary_with' | 'part_of' | 'ruled'
  | 'traded_with' | 'invented' | 'discovered' | 'practiced' | 'spoke'
  | 'inherited' | 'conquered' | 'spread' | 'disputes' | 'reinterprets'
  // 前端 REL_LABELS 独有备用键（数据中当前未使用，防御未来引入）
  | 'resulted_in' | 'influenced_by' | 'founded' | 'succeeded' | 'located_in'
  | 'born_in' | 'died_in' | 'wrote' | 'spread_to'

/** C8：29 键全显式映射（含逐条判定依据注释）。 */
export const RELATION_KIND_MAP: Record<FrozenRelationType, RelationKind> = {
  // ── CAUSAL（明确因果动词 / 影响=弱因果）──
  caused: 'CAUSAL',
  resulted_in: 'CAUSAL',
  influenced: 'CAUSAL',
  influenced_by: 'CAUSAL',
  // ── TEMPORAL_INHERIT（时间先后 / 传承 / 同时代）──
  before: 'TEMPORAL_INHERIT',
  after: 'TEMPORAL_INHERIT',
  inherited: 'TEMPORAL_INHERIT',
  succeeded: 'TEMPORAL_INHERIT',
  contemporary_with: 'TEMPORAL_INHERIT',
  // ── GEOGRAPHIC（地理共属 / 扩散）──
  located_at: 'GEOGRAPHIC',
  located_in: 'GEOGRAPHIC',
  born_in: 'GEOGRAPHIC',
  died_in: 'GEOGRAPHIC',
  spread: 'GEOGRAPHIC',
  spread_to: 'GEOGRAPHIC',
  // ── SHARED_ENTITY（共同活动 / 双边关系 / 发言场域）──
  participated_in: 'SHARED_ENTITY',
  traded_with: 'SHARED_ENTITY',
  spoke: 'SHARED_ENTITY',
  // ── THEMATIC（思想 / 作品 / 学术争议）──
  practiced: 'THEMATIC',
  wrote: 'THEMATIC',
  reinterprets: 'THEMATIC',
  disputes: 'THEMATIC',
  // ── DIRECT_HISTORICAL（直接历史关系，逐条显式映射，非兜底）──
  related_to: 'DIRECT_HISTORICAL',
  ruled: 'DIRECT_HISTORICAL',
  founded: 'DIRECT_HISTORICAL',
  part_of: 'DIRECT_HISTORICAL',
  invented: 'DIRECT_HISTORICAL',
  discovered: 'DIRECT_HISTORICAL',
  conquered: 'DIRECT_HISTORICAL',
}

// ── JCS：可选派生诊断值（C3，DEFAULT 权重为诊断聚合启发式，非事实权重）──
// 注释写死：weights are diagnostic heuristics and MUST NOT be interpreted as
// cross-domain truth or consumed as navigation policy.

export const DEFAULT_DIAGNOSTIC_WEIGHTS = {
  relationshipStrength: 0.3,
  explanationQuality: 0.25,
  temporalContinuity: 0.25,
  spatialContinuity: 0.2,
  // contextRelevance 在 Phase B 为 null，不参与聚合
} as const

// ── 引擎公开 API（C1 红线：白名单只有这两个函数 + 类型）──

export interface ContinuityNode {
  gid: string
  name: string
}

export interface ContinuityContext {
  /** 调用方查得的直接关系边（无则 null）。 */
  edge?: { type: string; evidence?: string[] } | null
  /** 共同邻居桥（无直接边但有共同邻居时）。 */
  commonNeighbor?: { gid: string; name: string } | null
}

// ── 内部工具：稳定内容派生 hash（evidenceId，PO 钉死：非 index/random、非 ranking）──
// 不引入 crypto 依赖（浏览器兼容）；djb2 足够稳定（同一输入永远同一输出）。
function stableHash(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0
  }
  // 8 位十六进制，够用且稳定
  return h.toString(16).padStart(8, '0')
}

function buildEvidenceId(
  kind: RelationKind,
  provenance: string,
  source: string | null,
  fromGid: string,
  toGid: string,
): string {
  return stableHash(`${kind}|${provenance}|${source ?? ''}|${fromGid}|${toGid}`)
}

/** claim 学术共识分级 → 单证据内部强度（仅在 claim 类内部可比）。 */
const CLAIM_STRENGTH: Record<string, number> = { high: 0.9, medium: 0.7, low: 0.5 }

/** Q1：收集全部可检出的关系证据（不预选、不裁决、不折叠）。C5：B/C 共用入口。
 *  输出顺序稳定，但【不表达优先级】——调用方不得依赖数组第一项为最高优先级。
 *
 *  多证据规则（C7 Non-Collapse）：
 *    - 有直接边 → 产出 1 条 relationship_edge 证据（kind 按 RELATION_KIND_MAP 显式映射）
 *    - 边同时带 claim id 且可解析 → 额外产出 claim 证据（同 kind，provenance='claim'）
 *    - 无直接边但有共同邻居 → 1 条 WEAK_BRIDGE 证据
 *    - 皆无 → 1 条 NONE 证据（合法状态，非 Bug）
 *  证据并列存在、不折叠；引擎不裁决"哪条更强"（跨 kind 排序须由调用方定义上下文规则）。 */
export function collectRelationEvidence(
  from: ContinuityNode,
  to: ContinuityNode,
  context?: ContinuityContext,
): RelationEvidence[] {
  const edge = context?.edge ?? null
  const commonNeighbor = context?.commonNeighbor ?? null

  // 直接关系边 → 正向证据（冻结边 = 图事实，strength=1）
  if (edge) {
    const mapped = RELATION_KIND_MAP[edge.type as FrozenRelationType]
    const kind: RelationKind = mapped ?? 'UNCLASSIFIED' // 映射表外类型 = 有证据但不可可靠分类（≠ NONE）
    const out: RelationEvidence[] = []
    if (kind === 'UNCLASSIFIED') {
      out.push({
        evidenceId: buildEvidenceId('UNCLASSIFIED', 'relationship_edge', edge.type, from.gid, to.gid),
        kind: 'UNCLASSIFIED',
        strength: 1,
        provenance: 'relationship_edge',
        source: edge.type,
      })
    } else {
      const positiveKind = kind as Exclude<RelationKind, 'NONE' | 'UNCLASSIFIED'>
      out.push({
        evidenceId: buildEvidenceId(positiveKind, 'relationship_edge', edge.type, from.gid, to.gid),
        kind: positiveKind,
        strength: 1,
        provenance: 'relationship_edge',
        source: edge.type,
      })
    }
    // 边带 claim 支持 → 额外产出 claim 证据（同 kind，provenance='claim'，不折叠）
    if (edge.evidence && edge.evidence.length > 0) {
      for (const claimId of edge.evidence) {
        const claim = getEvidenceWithSources([claimId])[0]
        if (claim?.claim && kind !== 'UNCLASSIFIED') {
          const positiveKind = kind as Exclude<RelationKind, 'NONE' | 'UNCLASSIFIED'>
          const claimConf = claim.confidence ?? 'medium'
          out.push({
            evidenceId: buildEvidenceId(positiveKind, 'claim', claimId, from.gid, to.gid),
            kind: positiveKind,
            strength: CLAIM_STRENGTH[claimConf] ?? 0.7,
            confidence: claimConf === 'high' ? 'strong' : claimConf === 'medium' ? 'moderate' : 'weak',
            provenance: 'claim',
            source: claimId,
          })
        }
      }
    }
    return out
  }

  // 无直接边但有共同邻居 → 弱桥（间接关联，图 grounded 零编造）
  if (commonNeighbor) {
    return [
      {
        evidenceId: buildEvidenceId('WEAK_BRIDGE', 'shared_neighbor', commonNeighbor.gid, from.gid, to.gid),
        kind: 'WEAK_BRIDGE',
        strength: 0.5,
        provenance: 'shared_neighbor',
        source: commonNeighbor.gid,
      },
    ]
  }

  // 皆无 → NONE（合法状态：provenance='none'、source=null，类型系统特判）
  return [
    {
      evidenceId: buildEvidenceId('NONE', 'none', null, from.gid, to.gid),
      kind: 'NONE',
      strength: 0,
      provenance: 'none',
      source: null,
    },
  ]
}

/** 证据 → 特征向量（核心输出，非决策分数）。CR/TC/SC 数据缺失必须为 null（Feature Contract）。
 *  explanationQuality 为 Phase B 代理值（基于证据自带可解释素材估算；B 解释层可后续细化），
 *  NONE 的诚实陈述也计入表达质量——"无关系可解释"与"有关系可解释"都算可理解。 */
export function composeFeatures(evidence: RelationEvidence[]): ContinuityFeatures {
  if (!evidence || evidence.length === 0) {
    return {
      relationshipStrength: 0,
      explanationQuality: 0,
      temporalContinuity: null,
      spatialContinuity: null,
      contextRelevance: null,
    }
  }
  const hasPositive = evidence.some((e) => e.kind !== 'NONE')
  const hasClaim = evidence.some((e) => e.provenance === 'claim')
  const hasEdge = evidence.some((e) => e.provenance === 'relationship_edge')
  const isNone = evidence.length === 1 && evidence[0].kind === 'NONE'
  // relationshipStrength：有证据取最大强度（描述性聚合，非跨 kind 裁决）
  const relationshipStrength = hasPositive
    ? Math.max(...evidence.map((e) => e.strength))
    : 0
  // explanationQuality：claim 素材最可讲 → 0.85；有边标签 → 0.6；NONE 诚实陈述 → 0.45
  const explanationQuality = hasClaim ? 0.85 : hasEdge ? 0.6 : isNone ? 0.45 : 0
  return {
    relationshipStrength,
    explanationQuality,
    temporalContinuity: null, // Phase B 无时间元数据输入 → null（不是 0）
    spatialContinuity: null, // Phase B 无空间元数据输入 → null（不是 0）
    contextRelevance: null, // Phase B 退化保留维，恒 null（C 施工时填）
  }
}

/** D4/D8：可选派生诊断值。C3：JCS 不得进入任何 ExplorationAction / 排序 / 阈值。
 *  仅聚合非 null 维并按剩余权重归一化；权重为诊断启发式，非事实权重、非导航策略。 */
export function deriveJourneyContinuityScore(
  features: ContinuityFeatures,
  weights: Partial<typeof DEFAULT_DIAGNOSTIC_WEIGHTS> = DEFAULT_DIAGNOSTIC_WEIGHTS,
): number | null {
  const entries: Array<[string, number]> = []
  const w = { ...DEFAULT_DIAGNOSTIC_WEIGHTS, ...weights }
  if (features.relationshipStrength != null) entries.push(['relationshipStrength', features.relationshipStrength])
  if (features.explanationQuality != null) entries.push(['explanationQuality', features.explanationQuality])
  if (features.temporalContinuity != null) entries.push(['temporalContinuity', features.temporalContinuity])
  if (features.spatialContinuity != null) entries.push(['spatialContinuity', features.spatialContinuity])
  if (entries.length === 0) return null
  const totalW = entries.reduce((s, [k]) => s + (w[k as keyof typeof w] ?? 0), 0)
  if (totalW === 0) return null
  const score = entries.reduce((s, [k, v]) => s + v * (w[k as keyof typeof w] ?? 0), 0) / totalW
  return Math.max(0, Math.min(1, score))
}
