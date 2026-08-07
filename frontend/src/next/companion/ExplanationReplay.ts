/**
 * M87.4.4 — Explanation Replay Validation
 *
 * 验证 Explanation Layer 的 Replay 能力。
 *
 * 核心原则：
 *   - Replay ≠ Re-evaluate
 *   - Replay 对象 = Decision（不变）
 *   - Renderer 版本影响的是表达，不是认知
 *   - 同一 Decision + 同一 Projection + 同一确定性 Renderer → 相同 Artifact
 *
 * 流程：
 *   1. replay(DecisionPackage) → Decision（不变）
 *   2. projectDecisionToExplanation(Decision) → ExplanationContext（重新计算）
 *   3. renderer.render(ExplanationContext) → Artifact（新渲染）
 *   4. 对比验证
 */

import type { Decision } from '../../runtime/evaluation/Decision'
import type { DecisionPackage } from '../../runtime/evaluation/Replay'
import { replay } from '../../runtime/evaluation/Replay'
import type { CompanionResponsePayload } from './CompanionPolicy'
import type { ExplanationContext } from './ExplanationProjection'
import { projectDecisionToExplanation } from './ExplanationProjection'
import type {
  ExplanationArtifact,
  ExplanationRenderer,
  RendererConfig,
} from '../companion/ExplanationRenderer'

// ============================================================================
// ExplanationReplayResult
// ============================================================================

export interface ExplanationReplayResult {
  /** 原始 Decision（不变） */
  decision: Decision<CompanionResponsePayload>
  /** 重新计算的 ExplanationContext */
  reComputedContext: ExplanationContext
  /** 使用当前 Renderer 重新渲染的 Artifact */
  reRenderedArtifact: ExplanationArtifact
  /** 原始 Artifact（如果有保存） */
  originalArtifact: ExplanationArtifact | null
  /** Decision 是否与原始完全一致 */
  decisionPreserved: boolean
  /** Context 是否可重新计算（验证纯函数性） */
  contextRecomputable: boolean
  /** Replay 时间戳 */
  replayedAt: number
}

// ============================================================================
// replayExplanation()
// ============================================================================

/**
 * replayExplanation()
 *
 * 回放历史 Explanation，验证 Decision 不变但 Explanation 可重新生成。
 *
 * 步骤：
 *   1. replay(DecisionPackage) → 恢复 Decision
 *   2. projectDecisionToExplanation(Decision) → 重新计算 ExplanationContext
 *   3. renderer.render(ExplanationContext) → 重新渲染 Artifact
 *   4. 对比原始 Artifact（如有）
 *
 * @param decisionPackage — 历史 DecisionPackage
 * @param renderer — 当前 Renderer（可能是新版本）
 * @param rendererConfig — Renderer 配置
 * @param originalArtifact — 原始 Artifact（可选，用于对比）
 * @returns ExplanationReplayResult
 */
export function replayExplanation(
  decisionPackage: DecisionPackage<CompanionResponsePayload>,
  renderer: ExplanationRenderer,
  rendererConfig: RendererConfig,
  originalArtifact?: ExplanationArtifact | null,
): ExplanationReplayResult {
  // Step 1: Replay Decision（不调用 Policy）
  const replayResult = replay(
    decisionPackage,
    'current-policy',      // 当前 Policy 版本（可能与原始不同）
    'current-engine',      // 当前 Engine 版本
  )

  const decision = replayResult.decision

  // Step 2: 重新计算 ExplanationContext（纯函数）
  const reComputedContext = projectDecisionToExplanation(decision)

  // Step 3: 重新渲染 Artifact（可能是新 Renderer）
  // 注意：render 是异步的，但 replayExplanation 本身是同步的（构造结果）
  // 实际渲染在外部 await

  // 构造占位 Artifact——实际渲染由调用方完成
  const reRenderedArtifact: ExplanationArtifact = {
    artifactId: `replay-artifact-${Date.now()}`,
    sourceDecisionId: decision.decisionId,
    rendererIdentity: {
      rendererId: 'replay-placeholder',
      rendererType: 'template',
      rendererVersion: 'pending',
    },
    rendererVersion: 'pending',
    modelProvider: rendererConfig.modelProvider,
    modelVersion: rendererConfig.modelVersion,
    promptVersion: rendererConfig.promptVersion,
    generatedAt: Date.now(),
    content: '',
  }

  // Step 4: 验证
  const decisionPreserved = decision.decisionId === decisionPackage.decision.decisionId
    && JSON.stringify(decision.output) === JSON.stringify(decisionPackage.decision.output)
    && decision.trace.length === decisionPackage.decision.trace.length

  // Context 可重新计算：相同 Decision → 相同 Context
  const expectedContext = projectDecisionToExplanation(decisionPackage.decision)
  const contextRecomputable = JSON.stringify(reComputedContext) === JSON.stringify(expectedContext)

  return {
    decision,
    reComputedContext,
    reRenderedArtifact,
    originalArtifact: originalArtifact ?? null,
    decisionPreserved,
    contextRecomputable,
    replayedAt: Date.now(),
  }
}

// ============================================================================
// replayExplanationAsync()
// ============================================================================

/**
 * replayExplanationAsync()
 *
 * 异步版本——完成实际渲染。
 */
export async function replayExplanationAsync(
  decisionPackage: DecisionPackage<CompanionResponsePayload>,
  renderer: ExplanationRenderer,
  rendererConfig: RendererConfig,
  originalArtifact?: ExplanationArtifact | null,
): Promise<ExplanationReplayResult> {
  const result = replayExplanation(
    decisionPackage,
    renderer,
    rendererConfig,
    originalArtifact,
  )

  // 使用当前 Renderer 重新渲染
  const renderedArtifact = await renderer.render(
    result.reComputedContext,
    rendererConfig,
  )

  // 更新 reRenderedArtifact
  result.reRenderedArtifact = renderedArtifact

  return result
}

// ============================================================================
// 验证辅助
// ============================================================================

/**
 * 验证两个 Artifact 的 sourceDecisionId 是否相同。
 * 用于 Case 2 / Case 3 验证。
 */
export function sameSourceDecision(
  artifactA: ExplanationArtifact,
  artifactB: ExplanationArtifact,
): boolean {
  return artifactA.sourceDecisionId === artifactB.sourceDecisionId
}

/**
 * 验证两个 Artifact 的 content 是否不同。
 * 用于 Case 2 / Case 3 验证——表达可不同。
 */
export function differentContent(
  artifactA: ExplanationArtifact,
  artifactB: ExplanationArtifact,
): boolean {
  return artifactA.content !== artifactB.content
}
