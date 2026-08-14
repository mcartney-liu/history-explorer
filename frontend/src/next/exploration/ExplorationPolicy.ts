/**
 * M88.2 — ExplorationPolicy
 *
 * Exploration Intelligence 的 Policy 层（第五个 Domain Module）。
 * 接收 ExplorationState → 输出 Decision<ExplorationAction>。
 *
 * 约束（M88.0 / M88.2）：
 *   - ExplorationPolicy 不是 RecommendationPolicy
 *   - 输出认知动作（Knowledge Progression），不是内容选择（Content Selection）
 *   - 复用 Decision<T> / PolicyContext（从 runtime/evaluation 导入）
 *   - 输入只来自 ExplorationState（不访问 MemoryStore / KG / LLM）
 *   - RuleTrace 可审计，Replay 可回放
 *   - 禁止 AI 决定探索方向
 */

import type { Decision, PolicyContext } from '../../runtime/evaluation/Decision'
import type { ExplorationState } from './ExplorationState'
// Cognitive loop (P2, 2026-08-14): the policy now reads the persisted
// user-facing Knowledge Gap so the next step can target what the *user* said
// they still don't get (not just the system-projected missing dimensions).
import type { GapSnapshot } from '../../data/GapLedger'

// ============================================================================
// ExplorationActionType
// ============================================================================

export type ExplorationActionType =
  | 'open_dimension'     // 打开缺失维度（扩展广度）
  | 'follow_cause'       // 追踪因果关系（加深深度）
  | 'deep_continue'      // 深化当前维度（同一主题更深层）
  | 'compare_context'    // 跨语境对比（横向理解）
  | 'reflect'            // 理解收束（帮助形成总结）

// ============================================================================
// ExplorationAction（认知动作，非内容推荐）
// ============================================================================

export interface ExplorationAction {
  /** 动作类型 */
  type: ExplorationActionType
  /** 目标 entityId */
  targetRef: string
  /** 为什么建议这个方向 */
  reason: string
  /** 叙事钩子（吸引用户继续） */
  narrativeHook: string
  /** 预期成长 */
  expectedGrowth: {
    dimension: string
    relationType: string
  }
  /** 置信度 */
  confidence: number
}

// ============================================================================
// ExplorationPolicy
// ============================================================================

/**
 * evaluateExploration()
 *
 * 基于当前探索状态，决定下一步认知动作。
 *
 * 规则优先级（M88.2 第一版——纯规则，非 AI）：
 *   1. missingDimensions > 0 → open_dimension（最优先：补缺口）
 *      - 目标必须是「真实可达实体」（dimensionMapping 里该维度的代表实体），
 *        不是中文维度标签（P-U08 根因：中文标签按钮点击 404，用户感知为推演断掉）。
 *      - 遍历 missingDimensions，跳过已探索 / 无映射实体的维度；全部跳过则落到 Rule 2。
 *   2. missingConnections > 0 → follow_cause
 *   3. understandingStage = 'UNDERSTANDING' → reflect
 *   4. coverageRatio < 1.0 → deep_continue
 *   5. 默认 → deep_continue
 *
 * 去重：如果 targetRef 已在 exploredAnchors 中，跳过当前规则。
 */
export function evaluateExploration(
  state: ExplorationState,
  policyContext: PolicyContext,
  gapState?: GapSnapshot | null,
): Decision<ExplorationAction> {
  // ── Rule 0: 用户标记的开放缺口（认知闭环，最高优先） ──
  // 若用户在某主题下显式标记「还想搞清楚」的维度（理解工作区写入
  // gapState.openGaps），下一步优先对准它——让闭环「读」侧成环
  // （Knowledge Gap → Next Exploration）。无 openGaps 时整段跳过，
  // Rule 1–5 行为完全不变（守 §5 只增不改红线）。
  const openGaps: string[] =
    gapState && Array.isArray(gapState.openGaps)
      ? (gapState.openGaps as string[])
      : []
  for (const gapDim of openGaps) {
    const targetRef = resolveDimensionTarget(gapDim, state)
    if (!targetRef) continue
    if (isAlreadyExplored(targetRef, state.exploredAnchors)) continue
    return makeDecision(policyContext, {
      type: 'open_dimension',
      targetRef,
      reason: `你标记了还想搞清楚「${gapDim}」维度`,
      narrativeHook: `你说过想搞懂「${gapDim}」，先从它相关的实体入手？`,
      expectedGrowth: { dimension: gapDim, relationType: 'enables' },
      confidence: 0.95,
    }, [{
      ruleId: 'exploration-gap-priority',
      inputs: { openGap: gapDim, targetRef },
      decision: true,
    }])
  }

  // ── Rule 1: 打开缺失维度（最优先） ──
  // 遍历缺失维度，找第一个「有映射实体 且 未探索」的维度作为 open_dimension 目标；
  // 全部不可达则放弃 Rule 1，落到后续规则（绝不产出中文标签这种 404 目标）。
  for (const dim of state.missingDimensions) {
    const targetRef = resolveDimensionTarget(dim, state)
    if (!targetRef) continue
    if (isAlreadyExplored(targetRef, state.exploredAnchors)) continue

    return makeDecision(policyContext, {
      type: 'open_dimension',
      targetRef,
      reason: `已覆盖 ${state.coveredDimensions.join('、') || '暂无'}，缺少「${dim}」维度`,
      narrativeHook: buildDimensionHook(dim, state.currentTopic),
      expectedGrowth: { dimension: dim, relationType: 'enables' },
      confidence: calculateConfidence(state.coverageRatio, 0.5),
    }, [{
      ruleId: 'exploration-open-dimension',
      inputs: {
        missingDimension: dim,
        missingCount: state.missingDimensions.length,
        coverageRatio: state.coverageRatio,
        targetRef,
      },
      decision: true,
    }])
  }

  // ── Rule 2: 追踪因果关系 ──
  if (state.missingConnections.length > 0) {
    const conn = state.missingConnections[0]
    const targetRef = conn.toRef

    if (!isAlreadyExplored(targetRef, state.exploredAnchors)) {
      return makeDecision(policyContext, {
        type: 'follow_cause',
        targetRef,
        reason: `${conn.fromRef} 与 ${conn.toRef} 之间存在尚未探索的「${conn.expectedRelationType}」关系`,
        narrativeHook: `你已经理解了 ${conn.fromRef}，但你知道它如何影响 ${conn.toRef} 吗？`,
        expectedGrowth: {
          dimension: 'causality',
          relationType: conn.expectedRelationType,
        },
        confidence: 0.85,
      }, [{
        ruleId: 'exploration-follow-cause',
        inputs: {
          fromRef: conn.fromRef,
          toRef: conn.toRef,
          expectedRelationType: conn.expectedRelationType,
        },
        decision: true,
      }])
    }
  }

  // ── Rule 3: 理解收束 ──
  if (state.understandingStage === 'UNDERSTANDING') {
    return makeDecision(policyContext, {
      type: 'reflect',
      targetRef: state.currentAnchorRef,
      reason: `已覆盖 ${state.coveredDimensions.length} 个维度，达到理解阶段`,
      narrativeHook: `你已经从 ${state.coveredDimensions.join('、')} 等维度理解了「${state.currentTopic}」，试着总结一下？`,
      expectedGrowth: { dimension: 'synthesis', relationType: 'summarizes' },
      confidence: 0.9,
    }, [{
      ruleId: 'exploration-reflect',
      inputs: {
        stage: 'UNDERSTANDING',
        coveredCount: state.coveredDimensions.length,
      },
      decision: true,
    }])
  }

  // ── Rule 4: 深化当前维度 ──
  if (state.coverageRatio < 1.0) {
    const targetRef = state.currentAnchorRef

    if (!isAlreadyExplored(targetRef, state.exploredAnchors)) {
      return makeDecision(policyContext, {
        type: 'deep_continue',
        targetRef,
        reason: `当前覆盖 ${Math.round(state.coverageRatio * 100)}%，继续深化「${state.currentTopic}」`,
        narrativeHook: `「${state.currentTopic}」还有很多值得深入的地方`,
        expectedGrowth: { dimension: state.coveredDimensions[0] ?? 'depth', relationType: 'deepens' },
        confidence: calculateConfidence(state.coverageRatio, 0.3),
      }, [{
        ruleId: 'exploration-deep-continue',
        inputs: { coverageRatio: state.coverageRatio },
        decision: true,
      }])
    }
  }

  // ── Rule 5: 默认 ──
  return makeDecision(policyContext, {
    type: 'deep_continue',
    targetRef: state.currentAnchorRef,
    reason: '继续当前探索方向',
    narrativeHook: '继续你的探索之旅',
    expectedGrowth: { dimension: 'continuation', relationType: 'continues' },
    confidence: 0.5,
  }, [{
    ruleId: 'exploration-default',
    inputs: { coverageRatio: state.coverageRatio },
    decision: true,
  }])
}

// ============================================================================
// 辅助函数
// ============================================================================

let decisionCounter = 0

function makeDecision(
  context: PolicyContext,
  payload: ExplorationAction,
  trace: Decision<ExplorationAction>['trace'],
): Decision<ExplorationAction> {
  decisionCounter++
  return {
    decisionId: `explore-decision-${Date.now()}-${decisionCounter}`,
    evaluatorId: 'exploration-policy-default-v1',
    evaluatorVersion: context.policyVersion,
    inputRef: `explore-input-${Date.now()}`,
    output: payload,
    trace,
    createdAt: context.timestamp,
  }
}

/** 检查 targetRef 是否已探索 */
function isAlreadyExplored(targetRef: string, exploredAnchors: string[]): boolean {
  return exploredAnchors.includes(targetRef)
}

/** 计算置信度（基于 coverageRatio 和基准值） */
function calculateConfidence(coverageRatio: number, baseline: number): number {
  // coverageRatio 越低，open_dimension 置信度越高（越确定需要补缺口）
  if (baseline > 0.4) {
    return Math.min(0.95, baseline + (1 - coverageRatio) * 0.3)
  }
  return Math.max(0.3, baseline + coverageRatio * 0.3)
}

/**
 * 将维度名解析为可达的实体 id（P-U08）：
 * 优先取 dimensionMapping[dim] 里的代表实体（真实 global_id，可点击可达）；
 * 该维度无映射实体时返回 null（表示该维度没有可探索目标，Rule 1 跳过它）。
 * 绝不回退到中文维度标签——那会产出 404 目标（旧版根因）。
 */
function resolveDimensionTarget(dimension: string, state: ExplorationState): string | null {
  const mapped = state.dimensionMapping[dimension]
  if (mapped && mapped.length > 0 && mapped[0]) return mapped[0]
  return null
}

/** 构建维度叙事钩子 */
function buildDimensionHook(dimension: string, topic: string): string {
  const hooks: Record<string, string> = {
    economy: `「${topic}」的军事和政治已经清晰了，但经济基础呢？`,
    politics: `「${topic}」的军事力量背后，政治制度如何运作？`,
    culture: `「${topic}」不只是战争和政治——文化如何塑造文明？`,
    military: `「${topic}」的军事扩张是如何实现的？`,
    society: `「${topic}」的社会结构如何支撑帝国？`,
    religion: `「${topic}」的信仰体系如何影响决策？`,
    technology: `「${topic}」的技术创新如何改变格局？`,
  }
  return hooks[dimension] ?? `你还缺少「${dimension}」维度的理解，继续探索？`
}
