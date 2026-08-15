// ============================================================
// ContinuityExplanation — Phase B 的 B 解释层（引擎外，PO 钉死的边界）
// ------------------------------------------------------------
// 依据：ADR-0023 v3.1 §9（C2/C6）+ PHASE_B_IMPLEMENTATION_DESIGN.md v2
//
// 职责边界（红线）：
//   - 本文件是「B 解释选择层」，消费 ContinuityEngine 产出的 RelationEvidence[]，
//     生成解释素材、选出展示用解释、表达"无关系"诚实陈述。
//   - 本文件【不属于】ContinuityEngine——引擎只负责"当前知识能证明什么"，
//     B 层负责"怎么讲给用户听"。
//   - C2：buildExplanationCandidates 返回【素材数组】（不选定唯一解释）；
//     从素材里挑哪条讲 = selectBestExplanation（B 选择器，仍在 B 层）。
//   - C6：NONE 绝不静默、绝不编造、绝不暴露内部实现（探索包/作者排序）；
//     只给知识事实层陈述。
// ============================================================

import { relLabel } from './relationshipLabels'
import type {
  RelationEvidence,
  TransitionConfidence,
} from './continuityEngine'

/** 单条解释素材（C2：候选，非最终选择）。 */
export interface TransitionExplanation {
  /** 溯源到证据（evidenceId）。 */
  evidenceId: string
  /** 人话叙述素材（claim / 关系短句 / 桥模板）。 */
  fact: string
  /** 素材可理解度分级（展示用）。 */
  confidence: TransitionConfidence
}

/** 诚实陈述（C6 知识事实层）。 */
export interface HonestStatement {
  /** 只给知识事实："当前知识中，没有找到「A」与「B」之间足够可靠的直接联系。"
   *  v2 契约：Phase B 不加"这是一次探索方向的切换"（那是 C 的边界）。 */
  text: string
}

/** 证据 → 解释素材集合（C2：返回数组，不选定唯一解释）。
 *  素材来源全部图 grounded、零编造：
 *    - claim 证据（claimTextById 提供文本时）→ 直接采用中文 claim 文本
 *    - relationship_edge 证据 → 关系短句（"A 早于 B"，18 类冻结标签）
 *    - WEAK_BRIDGE 证据 → 桥模板（"A 与 B 经由共同关联实体"）
 *    - UNCLASSIFIED → 保守事实句（不解释语义，只承认存在关系）
 *    - NONE → 不产解释素材（由 expressHonestNone 处理）
 *  claimTextById：调用方把已从数据源解析的 claim id → 中文文本传入（B 层
 *  不承担数据查询职责，与引擎一致）；缺文本的 claim 证据退化为边证据素材。 */
export function buildExplanationCandidates(
  evidence: RelationEvidence[],
  fromName: string,
  toName: string,
  claimTextById?: Record<string, string>,
): TransitionExplanation[] {
  const out: TransitionExplanation[] = []
  for (const e of evidence) {
    if (e.kind === 'NONE') continue
    // claim 证据：素材 = claim 文本（若有）
    if (e.provenance === 'claim' && typeof e.source === 'string') {
      const claimText = claimTextById?.[e.source]
      if (claimText) {
        out.push({
          evidenceId: e.evidenceId,
          fact: claimText,
          confidence: e.confidence ?? 'moderate',
        })
      }
      continue
    }
    if (e.kind === 'WEAK_BRIDGE') {
      // 桥素材：source 是邻居 gid；fromName/toName 由调用方传入
      out.push({
        evidenceId: e.evidenceId,
        fact: `${fromName} 与 ${toName} 相关联（经由共同关联实体）`,
        confidence: 'weak',
      })
      continue
    }
    if (e.kind === 'UNCLASSIFIED') {
      out.push({
        evidenceId: e.evidenceId,
        fact: `${fromName} 与 ${toName} 之间存在已记录的关系`,
        confidence: 'weak',
      })
      continue
    }
    // 正向边证据：关系短句
    if (e.provenance === 'relationship_edge' && typeof e.source === 'string') {
      out.push({
        evidenceId: e.evidenceId,
        fact: `${fromName} ${relLabel(e.source)} ${toName}`,
        confidence: e.confidence ?? 'strong',
      })
    }
  }
  return out
}

/** B 解释选择器：从素材中选一条给用户（C2：选择逻辑在 B 层，不在引擎）。
 *  规则：confidence 高者优先；同 confidence 保持输入顺序（默认次序仅作展示
 *  tie-breaker，不构成跨 kind 证据裁决）。 */
export function selectBestExplanation(
  candidates: TransitionExplanation[],
): TransitionExplanation | null {
  if (candidates.length === 0) return null
  const rank: Record<TransitionConfidence, number> = { strong: 3, moderate: 2, weak: 1 }
  let best = candidates[0]
  for (const c of candidates) {
    if (rank[c.confidence] > rank[best.confidence]) best = c
  }
  return best
}

/** C6 核心：NONE → 诚实陈述（知识事实层，不暴露内部实现）。
 *  文本固定为知识事实句；不含"探索包/作者/顺序/方向切换"等内部语义。 */
export function expressHonestNone(fromName: string, toName: string): HonestStatement {
  return {
    text: `当前知识中，没有找到「${fromName}」与「${toName}」之间足够可靠的直接联系。`,
  }
}
