// ============================================================
// candidateDecision.ts — Phase C 候选决策编排层（C-S6）
// ------------------------------------------------------------
// 依据：ADR-0024 v6 Accepted + PHASE_C_IMPLEMENTATION_DESIGN.md v3 §2.4
// 职责：把「候选生成 → 上下文特征 → 分层排序 → Action 构造」编排成
//       一条流水线，产出 Decision<ExplorationAction>。
// 边界：
//   - Rule 0（显式用户意图）由调用方（App）拦截，本模块只在
//     无显式意图时被调用（C3 职责边界）。
//   - 候选空 → 返回 null（调用方回退 Rule 1–5 / 剧本下一站，D11）。
//   - 本模块不含关系判断（PC2：collectEvidence 由调用方注入 B 引擎）。
// ============================================================

import type { Decision } from '../../runtime/evaluation/Decision'
import type { ExplorationAction } from './ExplorationPolicy'
import { generateCandidates } from './candidateGeneration'
import { rankCandidates, type EvidenceProvider, type RankingContext } from './candidateRanking'
import { buildAction } from './candidateAction'
import type { GapPriority } from './candidateContext'

export interface CandidateDecisionInputs {
  current: { gid: string; name: string }
  packageNext?: { gid: string; name: string } | null
  neighbors?: { gid: string; name: string }[]
  bridges?: { gid: string; name: string }[]
  dimensionTargets?: { gid: string; name: string }[]
  explored?: string[]
  openGaps?: { entityGid: string; priority: GapPriority }[]
  dimensionState?: { missing: string[]; covered: string[] } | null
  currentTopic?: string | null
  history?: string[] | null
  meta?: RankingContext['meta']
  collectEvidence: EvidenceProvider
}

let decisionCounter = 0

/**
 * C 候选决策流水线。候选空 → null（回退链交给调用方）。
 * 产出 Decision 的 trace.ruleId = 'c-candidate-decision'（可审计）。
 */
export function decideNextCandidate(
  inputs: CandidateDecisionInputs,
  version = 'candidate-v1',
  timestamp = Date.now(),
): Decision<ExplorationAction> | null {
  const candidates = generateCandidates(inputs.current, {
    packageNext: inputs.packageNext,
    neighbors: inputs.neighbors,
    bridges: inputs.bridges,
    dimensionTargets: inputs.dimensionTargets,
    explored: inputs.explored,
  })
  if (candidates.length === 0) return null

  const ctx: RankingContext = {
    openGaps: inputs.openGaps ?? [],
    dimensionState: inputs.dimensionState,
    currentTopic: inputs.currentTopic,
    history: inputs.history,
    explored: inputs.explored,
    collectEvidence: inputs.collectEvidence,
    meta: inputs.meta,
  }
  const ranked = rankCandidates(inputs.current, candidates, ctx)
  if (ranked.length === 0) return null

  const top = ranked[0]
  const action = buildAction(top)

  decisionCounter++
  return {
    decisionId: `candidate-decision-${timestamp}-${decisionCounter}`,
    evaluatorId: 'phase-c-candidate-decision',
    evaluatorVersion: version,
    inputRef: `candidate-input-${timestamp}`,
    output: action,
    trace: [
      {
        ruleId: 'c-candidate-decision',
        inputs: {
          candidateCount: candidates.length,
          targetRef: action.targetRef,
          winningLayer: top.winningLayer,
          confidence: top.confidence,
          sources: top.candidate.sources,
        },
        decision: true,
      },
    ],
    createdAt: timestamp,
  }
}
