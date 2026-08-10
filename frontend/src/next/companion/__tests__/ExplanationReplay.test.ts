/**
 * M87.4.4 — Explanation Replay Validation Tests
 *
 * 验证 Explanation Layer 的 Replay 能力。
 *
 * 三个验证 Case：
 *   Case 1: Decision Replay — Decision 不变
 *   Case 2: Renderer Replay — 同一 Decision + 不同 Renderer → 不同 Artifact（sourceDecisionId 相同）
 *   Case 3: 历史解释重建 — 旧 Decision + 新 Renderer → 新 Artifact（认知不变，表达升级）
 *
 * 边界验证：
 *   - Replay 不调用 Policy
 *   - ExplanationContext 可重新计算（纯函数）
 *   - 同一 Decision + 同一 Renderer → 相同 content
 *   - Artifact 可追溯回 Decision
 */

import { describe, it, expect } from 'vitest'
import type { Decision } from '../../../runtime/evaluation/Decision'
import type { DecisionPackage } from '../../../runtime/evaluation/Replay'
import { createDecisionPackage } from '../../../runtime/evaluation/Replay'
import type { CompanionResponsePayload } from '../CompanionPolicy'
import { evaluateCompanion } from '../CompanionPolicy'
import type { PolicyContext } from '../../../runtime/evaluation/Decision'
import type { ExplanationContext, UnderstandingProjection } from '../ExplanationProjection'
import { projectDecisionToExplanation } from '../ExplanationProjection'
import type { MemoryProjection } from '../memory/MemoryProjection'
import type { ExplanationRenderer, ExplanationArtifact, RendererConfig } from '../ExplanationRenderer'
import {
  NoopRenderer,
  DEFAULT_NOOP_CONFIG,
} from '../ExplanationRenderer'
import {
  replayExplanation,
  replayExplanationAsync,
  sameSourceDecision,
  differentContent,
} from '../ExplanationReplay'

// ============================================================================
// Test Helpers
// ============================================================================

const defaultPolicyContext: PolicyContext = {
  timestamp: Date.now(),
  policyVersion: '1.0',
  engineProtocolVersion: '1.0',
}

function makeUnderstandingProjection(overrides?: Partial<UnderstandingProjection>): UnderstandingProjection {
  return {
    topicRef: 'roman-expansion',
    knownObjects: [{ anchorRef: 'entity:rome' }, { anchorRef: 'entity:gaul' }],
    discoveredRelations: [
      {
        relationRef: 'relation:conquest',
        fromObjectRef: 'entity:rome',
        toObjectRef: 'entity:gaul',
        relationType: 'causes',
      },
    ],
    coverageState: {
      requiredDimensions: ['military', 'economy', 'culture'],
      coveredDimensions: ['military'],
      coverageRatio: 0.33,
    },
    stage: 'CONNECTION',
    missingLinks: [],
    basedOn: {
      anchorChainLength: 2,
      relationChainLength: 1,
      computedAt: Date.now(),
      templateRef: 'template-roman',
      templateVersion: '1.0',
      projectionVersion: '1.0',
    },
    ...overrides,
  }
}

function makeMemoryProjection(overrides?: Partial<MemoryProjection>): MemoryProjection {
  return {
    unit: {
      unitId: 'unit-1',
      topicRef: 'roman-expansion',
      userQuestion: '罗马如何扩张？',
      status: 'active',
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now(),
    },
    currentStage: 'CONNECTION',
    currentCoverageRatio: 0.33,
    missingLinkCount: 2,
    dimensionCount: 3,
    stageTimeline: [],
    activeBranches: [],
    milestones: [],
    totalNodes: 5,
    totalEdges: 3,
    daysSinceStart: 1,
    ...overrides,
  }
}

/** 生成一个真实 Decision（通过 evaluateCompanion） */
function makeRealDecision(intent: string): Decision<CompanionResponsePayload> {
  return evaluateCompanion(
    {
      conversation: {
        sessionRef: 'session-1',
        currentTopic: 'roman-expansion',
        userIntent: intent,
        lastDecisionRef: null,
        activeExplorationRef: 'exploration-1',
        currentWorkspaceState: null,
      },
      understandingProjection: makeUnderstandingProjection(),
      memoryProjection: makeMemoryProjection(),
      availableKnowledgeSpace: ['entity:rome', 'entity:gaul', 'entity:carthage'],
    },
    defaultPolicyContext,
  )
}

/** 自定义 Renderer（模拟不同版本） */
class VersionedRenderer implements ExplanationRenderer {
  private version: string

  constructor(version: string) {
    this.version = version
  }

  async render(context: ExplanationContext, config: RendererConfig): Promise<ExplanationArtifact> {
    return {
      artifactId: `v${this.version}-${Date.now()}`,
      sourceDecisionId: context.sourceDecisionId,
      rendererIdentity: {
        rendererId: 'test-renderer',
        rendererType: 'template',
        rendererVersion: this.version,
      },
      rendererVersion: this.version,
      modelProvider: config.modelProvider,
      modelVersion: config.modelVersion,
      promptVersion: config.promptVersion,
      generatedAt: Date.now(),
      content: `[Renderer v${this.version}] ${context.subject}: ${context.narrativeGoal}`,
    }
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('Explanation Replay (M87.4.4)', () => {
  // ── Case 1: Decision Replay ──
  describe('Case 1: Decision Replay', () => {
    it('Decision Replay 返回原 Decision（decisionId 相同）', () => {
      const decision = makeRealDecision('explain')
      const pkg = createDecisionPackage(decision, 'input-ref', '1.0', '1.0')

      const result = replayExplanation(pkg, new NoopRenderer(), DEFAULT_NOOP_CONFIG)

      expect(result.decisionPreserved).toBe(true)
      expect(result.decision.decisionId).toBe(decision.decisionId)
    })

    it('Decision Replay 返回原 output', () => {
      const decision = makeRealDecision('explain')
      const pkg = createDecisionPackage(decision, 'input-ref', '1.0', '1.0')

      const result = replayExplanation(pkg, new NoopRenderer(), DEFAULT_NOOP_CONFIG)

      expect(result.decision.output.actionType).toBe('explain')
      expect(result.decision.output.targetRef).toBe('roman-expansion')
    })

    it('Decision Replay 返回原 trace', () => {
      const decision = makeRealDecision('explain')
      const pkg = createDecisionPackage(decision, 'input-ref', '1.0', '1.0')

      const result = replayExplanation(pkg, new NoopRenderer(), DEFAULT_NOOP_CONFIG)

      expect(result.decision.trace.length).toBe(decision.trace.length)
      expect(result.decision.trace[0].ruleId).toBe(decision.trace[0].ruleId)
    })

    it('Policy Version 不匹配仍可读取历史 Decision', () => {
      const decision = makeRealDecision('explain')
      // 用旧版本创建 Package
      const pkg = createDecisionPackage(decision, 'input-ref', '0.9.0', '0.9.0')

      const result = replayExplanation(pkg, new NoopRenderer(), DEFAULT_NOOP_CONFIG)

      // 即使 Policy 版本不匹配，Decision 仍然可读
      expect(result.decisionPreserved).toBe(true)
      expect(result.decision.decisionId).toBe(decision.decisionId)
    })

    it('Replay 不调用 Policy（只消费 DecisionPackage）', () => {
      const decision = makeRealDecision('explain')
      const pkg = createDecisionPackage(decision, 'input-ref', '1.0', '1.0')

      // replayExplanation 内部只调用 replay()，不调用 evaluateCompanion
      const result = replayExplanation(pkg, new NoopRenderer(), DEFAULT_NOOP_CONFIG)

      expect(result.decisionPreserved).toBe(true)
      // 如果调用了 Policy，decision 会不同（不同的 decisionId）
      expect(result.decision.decisionId).toBe(decision.decisionId)
    })
  })

  // ── Case 2: Renderer Replay ──
  describe('Case 2: Renderer Replay', () => {
    it('同一 Decision + 不同 Renderer → 不同 Artifact（sourceDecisionId 相同）', async () => {
      const decision = makeRealDecision('explain')
      const pkg = createDecisionPackage(decision, 'input-ref', '1.0', '1.0')

      const rendererV1 = new VersionedRenderer('template-v1.0')
      const rendererV2 = new VersionedRenderer('template-v2.0')

      const result1 = await replayExplanationAsync(pkg, rendererV1, DEFAULT_NOOP_CONFIG)
      const result2 = await replayExplanationAsync(pkg, rendererV2, DEFAULT_NOOP_CONFIG)

      // sourceDecisionId 相同
      expect(result1.reRenderedArtifact.sourceDecisionId)
        .toBe(result2.reRenderedArtifact.sourceDecisionId)

      // content 不同
      expect(result1.reRenderedArtifact.content)
        .not.toBe(result2.reRenderedArtifact.content)

      // rendererVersion 不同
      expect(result1.reRenderedArtifact.rendererVersion)
        .not.toBe(result2.reRenderedArtifact.rendererVersion)
    })

    it('两个不同 Renderer 的 Artifact 都追溯到同一个 Decision', async () => {
      const decision = makeRealDecision('explain')
      const pkg = createDecisionPackage(decision, 'input-ref', '1.0', '1.0')

      const result1 = await replayExplanationAsync(pkg, new VersionedRenderer('v1.0'), DEFAULT_NOOP_CONFIG)
      const result2 = await replayExplanationAsync(pkg, new VersionedRenderer('v2.0'), DEFAULT_NOOP_CONFIG)

      expect(sameSourceDecision(result1.reRenderedArtifact, result2.reRenderedArtifact)).toBe(true)
      expect(differentContent(result1.reRenderedArtifact, result2.reRenderedArtifact)).toBe(true)
    })
  })

  // ── Case 3: 历史解释重建 ──
  describe('Case 3: Historical Explanation Reconstruction', () => {
    it('模拟 2026 Decision + Renderer-v1 → 2027 新 Renderer → 新 Artifact（认知不变）', async () => {
      const decision = makeRealDecision('explain')
      const pkg = createDecisionPackage(decision, 'input-ref', '1.0', '1.0')

      // 2026: 原始渲染
      const result2026 = await replayExplanationAsync(pkg, new VersionedRenderer('template-v1.0'), DEFAULT_NOOP_CONFIG)

      // 2027: 新 Renderer 重新渲染
      const result2027 = await replayExplanationAsync(pkg, new VersionedRenderer('template-v3.0'), DEFAULT_NOOP_CONFIG)

      // 认知状态相同
      expect(result2026.decisionPreserved).toBe(true)
      expect(result2027.decisionPreserved).toBe(true)
      expect(result2026.decision.decisionId).toBe(result2027.decision.decisionId)

      // sourceDecisionId 相同
      expect(result2026.reRenderedArtifact.sourceDecisionId)
        .toBe(result2027.reRenderedArtifact.sourceDecisionId)

      // content 不同（表达升级）
      expect(result2026.reRenderedArtifact.content)
        .not.toBe(result2027.reRenderedArtifact.content)
    })

    it('原始 Artifact 可保存并在 Replay 时对比', async () => {
      const decision = makeRealDecision('explain')
      const pkg = createDecisionPackage(decision, 'input-ref', '1.0', '1.0')

      // 保存原始 Artifact
      const originalResult = await replayExplanationAsync(
        pkg, new VersionedRenderer('template-v1.0'), DEFAULT_NOOP_CONFIG,
      )
      const savedArtifact = originalResult.reRenderedArtifact

      // 未来重新渲染
      const futureResult = await replayExplanationAsync(
        pkg, new VersionedRenderer('template-v2.0'), DEFAULT_NOOP_CONFIG, savedArtifact,
      )

      // 原始 Artifact 被保留
      expect(futureResult.originalArtifact).not.toBeNull()
      expect(futureResult.originalArtifact!.artifactId).toBe(savedArtifact.artifactId)

      // 原始 Artifact 与新 Artifact 的 sourceDecisionId 相同
      expect(futureResult.originalArtifact!.sourceDecisionId)
        .toBe(futureResult.reRenderedArtifact.sourceDecisionId)
    })
  })

  // ── 边界验证 ──
  describe('Boundary Validations', () => {
    it('ExplanationContext 可重新计算（纯函数，确定性）', () => {
      const decision = makeRealDecision('explain')
      const pkg = createDecisionPackage(decision, 'input-ref', '1.0', '1.0')

      const result = replayExplanation(pkg, new NoopRenderer(), DEFAULT_NOOP_CONFIG)

      expect(result.contextRecomputable).toBe(true)
    })

    it('同一 Decision + 同一确定性 Renderer → 相同 Artifact content', async () => {
      const decision = makeRealDecision('explain')
      const pkg = createDecisionPackage(decision, 'input-ref', '1.0', '1.0')

      const r1 = new NoopRenderer()
      const r2 = new NoopRenderer()

      const result1 = await replayExplanationAsync(pkg, r1, DEFAULT_NOOP_CONFIG)
      const result2 = await replayExplanationAsync(pkg, r2, DEFAULT_NOOP_CONFIG)

      expect(result1.reRenderedArtifact.content)
        .toBe(result2.reRenderedArtifact.content)
    })

    it('Artifact 可追溯回 Decision（sourceDecisionId 链路完整）', async () => {
      const decision = makeRealDecision('explain')
      const pkg = createDecisionPackage(decision, 'input-ref', '1.0', '1.0')

      const result = await replayExplanationAsync(pkg, new NoopRenderer(), DEFAULT_NOOP_CONFIG)

      expect(result.reRenderedArtifact.sourceDecisionId).toBe(decision.decisionId)
      expect(result.decision.decisionId).toBe(decision.decisionId)
    })

    it('不同版本 Renderer 产生的 Artifact 都合法（decisionPreserved === true）', async () => {
      const decision = makeRealDecision('explain')
      const pkg = createDecisionPackage(decision, 'input-ref', '1.0', '1.0')

      const rV1 = await replayExplanationAsync(pkg, new VersionedRenderer('v1.0'), DEFAULT_NOOP_CONFIG)
      const rV2 = await replayExplanationAsync(pkg, new VersionedRenderer('v2.0'), DEFAULT_NOOP_CONFIG)
      const rV3 = await replayExplanationAsync(pkg, new VersionedRenderer('v3.0'), DEFAULT_NOOP_CONFIG)

      expect(rV1.decisionPreserved).toBe(true)
      expect(rV2.decisionPreserved).toBe(true)
      expect(rV3.decisionPreserved).toBe(true)
    })

    it('Replay 不生成新 Decision', async () => {
      const decision = makeRealDecision('explain')
      const pkg = createDecisionPackage(decision, 'input-ref', '1.0', '1.0')

      const result = await replayExplanationAsync(pkg, new NoopRenderer(), DEFAULT_NOOP_CONFIG)

      // Decision 的 decisionId 应该与原始相同
      expect(result.decision.decisionId).toBe(decision.decisionId)
      // 不是新的 Decision
    })

    it('所有 actionType 的 Decision 都可以 Replay', async () => {
      const actionTypes = ['explain', 'suggest', 'question', 'summarize']

      for (const actionType of actionTypes) {
        const decision = makeRealDecision(actionType)
        const pkg = createDecisionPackage(decision, 'input-ref', '1.0', '1.0')

        const result = await replayExplanationAsync(pkg, new NoopRenderer(), DEFAULT_NOOP_CONFIG)

        expect(result.decisionPreserved).toBe(true)
        expect(result.reRenderedArtifact.sourceDecisionId).toBe(decision.decisionId)
        expect(result.reRenderedArtifact.content).toBeTruthy()
      }
    })
  })

  // ── sameSourceDecision / differentContent 辅助函数 ──
  describe('Helper Functions', () => {
    it('sameSourceDecision: 相同 sourceDecisionId → true', () => {
      const a: ExplanationArtifact = {
        artifactId: 'a1', sourceDecisionId: 'd-001',
        rendererIdentity: { rendererId: 'r', rendererType: 'template', rendererVersion: 'v1' },
        rendererVersion: 'v1', modelProvider: 'noop', modelVersion: 'v1', promptVersion: 'v1',
        generatedAt: 1, content: 'A',
      }
      const b: ExplanationArtifact = {
        artifactId: 'a2', sourceDecisionId: 'd-001',
        rendererIdentity: { rendererId: 'r', rendererType: 'template', rendererVersion: 'v2' },
        rendererVersion: 'v2', modelProvider: 'noop', modelVersion: 'v2', promptVersion: 'v2',
        generatedAt: 2, content: 'B',
      }
      expect(sameSourceDecision(a, b)).toBe(true)
    })

    it('sameSourceDecision: 不同 sourceDecisionId → false', () => {
      const a: ExplanationArtifact = {
        artifactId: 'a1', sourceDecisionId: 'd-001',
        rendererIdentity: { rendererId: 'r', rendererType: 'template', rendererVersion: 'v1' },
        rendererVersion: 'v1', modelProvider: 'noop', modelVersion: 'v1', promptVersion: 'v1',
        generatedAt: 1, content: 'A',
      }
      const b: ExplanationArtifact = {
        artifactId: 'a2', sourceDecisionId: 'd-002',
        rendererIdentity: { rendererId: 'r', rendererType: 'template', rendererVersion: 'v1' },
        rendererVersion: 'v1', modelProvider: 'noop', modelVersion: 'v1', promptVersion: 'v1',
        generatedAt: 2, content: 'A',
      }
      expect(sameSourceDecision(a, b)).toBe(false)
    })

    it('differentContent: 不同 content → true', () => {
      const a: ExplanationArtifact = {
        artifactId: 'a1', sourceDecisionId: 'd-001',
        rendererIdentity: { rendererId: 'r', rendererType: 'template', rendererVersion: 'v1' },
        rendererVersion: 'v1', modelProvider: 'noop', modelVersion: 'v1', promptVersion: 'v1',
        generatedAt: 1, content: 'A',
      }
      const b: ExplanationArtifact = {
        artifactId: 'a2', sourceDecisionId: 'd-001',
        rendererIdentity: { rendererId: 'r', rendererType: 'template', rendererVersion: 'v2' },
        rendererVersion: 'v2', modelProvider: 'noop', modelVersion: 'v2', promptVersion: 'v2',
        generatedAt: 2, content: 'B',
      }
      expect(differentContent(a, b)).toBe(true)
    })

    it('differentContent: 相同 content → false', () => {
      const a: ExplanationArtifact = {
        artifactId: 'a1', sourceDecisionId: 'd-001',
        rendererIdentity: { rendererId: 'r', rendererType: 'template', rendererVersion: 'v1' },
        rendererVersion: 'v1', modelProvider: 'noop', modelVersion: 'v1', promptVersion: 'v1',
        generatedAt: 1, content: 'same',
      }
      const b: ExplanationArtifact = {
        artifactId: 'a2', sourceDecisionId: 'd-001',
        rendererIdentity: { rendererId: 'r', rendererType: 'template', rendererVersion: 'v2' },
        rendererVersion: 'v2', modelProvider: 'noop', modelVersion: 'v2', promptVersion: 'v2',
        generatedAt: 2, content: 'same',
      }
      expect(differentContent(a, b)).toBe(false)
    })
  })
})
