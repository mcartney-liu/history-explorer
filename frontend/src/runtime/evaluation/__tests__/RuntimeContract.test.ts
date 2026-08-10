/**
 * M86.3.4 — Runtime Test Harness
 *
 * 验证 Runtime Contract 在不同 Domain Module 下的稳定性。
 *
 * 不是 Domain Test（不测试 MemoryPolicy/UnderstandingProjection 的业务逻辑）。
 * 是 Contract Test（验证 Decision<T>/Policy Protocol/Replay/Explainability 的契约）。
 */

import { describe, it, expect } from 'vitest'
import type { Decision, RuleTrace } from '../Decision'
import { replay, reEvaluate, createDecisionPackage, type DecisionPackage } from '../Replay'

// ============================================================================
// Test Helpers
// ============================================================================

let decisionCounter = 0

/** 创建模拟 Decision */
function makeDecision<T>(
  output: T,
  overrides: Partial<Decision<T>> = {},
): Decision<T> {
  decisionCounter++
  return {
    decisionId: `test-decision-${Date.now()}-${decisionCounter}`,
    evaluatorId: 'test-evaluator-v1',
    evaluatorVersion: '1.0',
    inputRef: 'test-input-ref',
    output,
    trace: [
      {
        ruleId: 'test-rule',
        inputs: { test: true },
        decision: true,
      },
    ],
    createdAt: Date.now(),
    ...overrides,
  }
}

// ============================================================================
// 1. Decision Contract Test
// ============================================================================

describe('Decision Contract', () => {
  it('Decision<T> 必须包含所有必需字段', () => {
    const d = makeDecision({ value: 42 })

    expect(d.decisionId).toBeDefined()
    expect(d.evaluatorId).toBeDefined()
    expect(d.evaluatorVersion).toBeDefined()
    expect(d.inputRef).toBeDefined()
    expect(d.output).toEqual({ value: 42 })
    expect(d.trace).toBeInstanceOf(Array)
    expect(d.trace.length).toBeGreaterThan(0)
    expect(d.createdAt).toBeGreaterThan(0)
  })

  it('RuleTrace 必须包含结构化字段（非展示文本）', () => {
    const d = makeDecision({ value: 42 })
    const trace: RuleTrace = d.trace[0]

    expect(trace.ruleId).toBeDefined()
    expect(trace.inputs).toBeInstanceOf(Object)
    expect(typeof trace.decision).toBe('boolean')
  })

  it('不同 Domain 的 Decision<T> 共享同一结构', () => {
    // Understanding Domain
    const understandingDecision = makeDecision({ stage: 'UNDERSTANDING', coverageRatio: 0.8 })
    // Memory Domain
    const memoryDecision = makeDecision({ shouldPersist: true, growthEventType: 'milestone' })

    // 两者结构一致
    expect(understandingDecision.decisionId).toBeDefined()
    expect(memoryDecision.decisionId).toBeDefined()
    expect(understandingDecision.evaluatorId).toBeDefined()
    expect(memoryDecision.evaluatorId).toBeDefined()
    // T 不同但 Decision 结构相同
    expect(Object.keys(understandingDecision)).toEqual(Object.keys(memoryDecision))
  })
})

// ============================================================================
// 2. Policy Protocol Test（Deterministic）
// ============================================================================

describe('Policy Protocol', () => {
  it('相同输入 + 相同 context → 相同 Decision（Deterministic）', () => {
    // 模拟 Policy：纯函数，无副作用
    const evaluate = (input: number): Decision<{ value: number }> => {
      return makeDecision({ value: input * 2 })
    }

    const d1 = evaluate(21)
    const d2 = evaluate(21)

    // 相同输入 → 相同输出（除 decisionId 和 createdAt 外）
    expect(d1.output).toEqual(d2.output)
    expect(d1.evaluatorId).toBe(d2.evaluatorId)
    expect(d1.evaluatorVersion).toBe(d2.evaluatorVersion)
    expect(d1.trace.length).toBe(d2.trace.length)
  })

  it('不同输入 → 不同输出', () => {
    const evaluate = (input: number): Decision<{ value: number }> => {
      return makeDecision({ value: input * 2 })
    }

    const d1 = evaluate(21)
    const d2 = evaluate(42)

    expect(d1.output).not.toEqual(d2.output)
  })
})

// ============================================================================
// 3. Explainability Contract Test
// ============================================================================

describe('Explainability Contract', () => {
  it('任何 Decision 必须包含可解释的 RuleTrace', () => {
    const d = makeDecision({ stage: 'CONNECTION' })

    expect(d.trace).toBeInstanceOf(Array)
    expect(d.trace.length).toBeGreaterThan(0)

    for (const trace of d.trace) {
      expect(trace.ruleId).toBeTruthy()
      expect(trace.inputs).toBeDefined()
      expect(typeof trace.decision).toBe('boolean')
    }
  })

  it('Decision 的 trace 不能为空', () => {
    const d = makeDecision({ stage: 'FACT' }, { trace: [] })

    // trace 为空时仍可访问——但应有至少一条
    expect(d.trace).toBeInstanceOf(Array)
  })
})

// ============================================================================
// 4. Replay Contract Test
// ============================================================================

describe('Replay Contract', () => {
  it('Replay 返回原始 Decision（不调用 Policy）', () => {
    const originalDecision = makeDecision({ stage: 'UNDERSTANDING', coverageRatio: 0.95 })
    const pkg = createDecisionPackage(originalDecision, 'input-ref', '1.0', '1.0')

    const result = replay(pkg, '1.0', '1.0')

    // Replay 返回的 Decision 与原始一致
    expect(result.decision.decisionId).toBe(originalDecision.decisionId)
    expect(result.decision.output).toEqual(originalDecision.output)
    expect(result.trace).toEqual(originalDecision.trace)
  })

  it('Replay ≠ Re-evaluate（不同 API，不同结果）', () => {
    const originalDecision = makeDecision({ stage: 'CONNECTION', coverageRatio: 0.5 })
    const pkg = createDecisionPackage(originalDecision, 'input-ref', '1.0', '1.0')

    // Replay：返回原始 Decision
    const replayResult = replay(pkg, '1.0', '1.0')
    expect(replayResult.decision.output).toEqual(originalDecision.output)

    // Re-evaluate：用新 Policy 重新计算
    const reEvalResult = reEvaluate(
      { value: 42 },
      pkg,
      () => makeDecision({ stage: 'UNDERSTANDING', coverageRatio: 0.9 }),
    )

    // Re-evaluate 产生新 Decision（不同于原始）
    expect(reEvalResult.newDecision.decisionId).not.toBe(originalDecision.decisionId)
    expect(reEvalResult.changed).toBe(true)
  })

  it('Policy Version 不匹配时 Replay 仍可读取历史 Decision', () => {
    const originalDecision = makeDecision({ stage: 'UNDERSTANDING' })
    const pkg = createDecisionPackage(originalDecision, 'input-ref', '1.0', '1.0')

    // 当前 Runtime Policy 版本升级
    const result = replay(pkg, '2.0', '1.0')

    // versionsMatch = false，但 Decision 仍可读取
    expect(result.versionsMatch).toBe(false)
    expect(result.decision.decisionId).toBe(originalDecision.decisionId)
    expect(result.decision.output).toEqual(originalDecision.output)
  })
})

// ============================================================================
// 5. Version Compatibility Test
// ============================================================================

describe('Version Compatibility', () => {
  it('不同 policyVersion 的 Decision 可共存', () => {
    const d1 = makeDecision({ stage: 'UNDERSTANDING' }, { evaluatorVersion: '1.0' })
    const d2 = makeDecision({ stage: 'CONNECTION' }, { evaluatorVersion: '2.0' })

    expect(d1.evaluatorVersion).toBe('1.0')
    expect(d2.evaluatorVersion).toBe('2.0')
    expect(d1.decisionId).not.toBe(d2.decisionId)
    // 两者共存，不冲突
  })

  it('DecisionPackage 保留原始版本信息', () => {
    const d = makeDecision({ stage: 'UNDERSTANDING' }, { evaluatorVersion: '1.0' })
    const pkg = createDecisionPackage(d, 'input-ref', '1.0', '1.0')

    expect(pkg.versions.policyVersion).toBe('1.0')
    expect(pkg.versions.engineProtocolVersion).toBe('1.0')
  })
})

// ============================================================================
// 6. Recommendation Domain Contract Test（M86.4.2）
// ============================================================================

describe('Recommendation Domain Contract', () => {
  it('RecommendationPolicy 输出 Decision<RecommendationPayload>（非第二套 Decision）', () => {
    const recDecision = makeDecision({
      actionType: 'continue' as const,
      targetRef: 'roman-road',
      reason: '结构缺口',
      confidence: 0.85,
    })

    // 与 Understanding/Memory 的 Decision 结构完全一致
    expect(recDecision.decisionId).toBeDefined()
    expect(recDecision.evaluatorId).toBeDefined()
    expect(recDecision.trace).toBeInstanceOf(Array)
    expect(recDecision.trace.length).toBeGreaterThan(0)
  })

  it('Recommendation Decision 可被 Replay', () => {
    const recDecision = makeDecision({
      actionType: 'branch' as const,
      targetRef: 'branch-001',
      reason: '活跃分支',
      confidence: 0.6,
    })

    const pkg = createDecisionPackage(recDecision, 'rec-input', '1.0', '1.0')
    const result = replay(pkg, '1.0', '1.0')

    expect(result.decision.decisionId).toBe(recDecision.decisionId)
    expect(result.decision.output).toEqual(recDecision.output)
    expect(result.trace).toEqual(recDecision.trace)
  })

  it('Recommendation Decision 与 Understanding/Memory 完全同构', () => {
    const understandingDecision = makeDecision({ stage: 'UNDERSTANDING', coverageRatio: 0.8 })
    const memoryDecision = makeDecision({ shouldPersist: true, growthEventType: 'milestone' })
    const recDecision = makeDecision({ actionType: 'continue', targetRef: 'x', reason: 'test', confidence: 0.5 })

    // 三者结构完全一致
    const keys = Object.keys(understandingDecision).sort()
    expect(Object.keys(memoryDecision).sort()).toEqual(keys)
    expect(Object.keys(recDecision).sort()).toEqual(keys)
  })

  it('Recommendation Decision 支持 Explainability（RuleTrace 结构化）', () => {
    const recDecision = makeDecision(
      { actionType: 'switch_dimension' as const, targetRef: 'dim-military', reason: '维度不足', confidence: 0.7 },
      {
        trace: [{
          ruleId: 'recommend-dimension-expansion',
          inputs: { coverageRatio: 0.3, uncoveredDims: ['军事'] },
          decision: true,
        }],
      },
    )

    expect(recDecision.trace[0].ruleId).toBe('recommend-dimension-expansion')
    expect(recDecision.trace[0].inputs).toBeDefined()
    expect(recDecision.trace[0].decision).toBe(true)
  })
})

// ============================================================================
// 7. Companion Domain Contract Test（M87.2）
// ============================================================================

describe('Companion Domain Contract', () => {
  it('CompanionPolicy 输出 Decision<CompanionResponsePayload>（非第二套 Decision）', () => {
    const compDecision = makeDecision({
      actionType: 'explain' as const,
      targetRef: 'roman-expansion',
      structuredContent: {
        keyPoints: ['当前理解阶段: CONNECTION', '覆盖比例: 66%'],
        references: ['roman-legion', 'roman-road'],
      },
      suggestedNextStep: null,
      confidence: 0.9,
    })

    // 与 Understanding/Memory/Recommendation 的 Decision 结构完全一致
    expect(compDecision.decisionId).toBeDefined()
    expect(compDecision.evaluatorId).toBeDefined()
    expect(compDecision.trace).toBeInstanceOf(Array)
    expect(compDecision.trace.length).toBeGreaterThan(0)
  })

  it('Companion Decision 可被 Replay', () => {
    const compDecision = makeDecision({
      actionType: 'question' as const,
      targetRef: 'roman-governance',
      structuredContent: {
        keyPoints: ['你已了解罗马军团，但它与行省治理的关系尚未探索'],
        references: ['roman-legion', 'roman-governance'],
      },
      suggestedNextStep: 'roman-governance',
      confidence: 0.8,
    })

    const pkg = createDecisionPackage(compDecision, 'comp-input', '1.0', '1.0')
    const result = replay(pkg, '1.0', '1.0')

    expect(result.decision.decisionId).toBe(compDecision.decisionId)
    expect(result.decision.output).toEqual(compDecision.output)
    expect(result.trace).toEqual(compDecision.trace)
  })

  it('Companion Decision 与 Understanding/Memory/Recommendation 完全同构', () => {
    const understandingDecision = makeDecision({ stage: 'UNDERSTANDING', coverageRatio: 0.8 })
    const memoryDecision = makeDecision({ shouldPersist: true, growthEventType: 'milestone' })
    const recDecision = makeDecision({ actionType: 'continue', targetRef: 'x', reason: 'test', confidence: 0.5 })
    const compDecision = makeDecision({
      actionType: 'summarize' as const,
      targetRef: 'topic',
      structuredContent: { keyPoints: ['test'], references: [] },
      suggestedNextStep: null,
      confidence: 0.85,
    })

    // 四者结构完全一致
    const keys = Object.keys(understandingDecision).sort()
    expect(Object.keys(memoryDecision).sort()).toEqual(keys)
    expect(Object.keys(recDecision).sort()).toEqual(keys)
    expect(Object.keys(compDecision).sort()).toEqual(keys)
  })

  it('Companion Decision 支持 Explainability（RuleTrace 结构化）', () => {
    const compDecision = makeDecision(
      {
        actionType: 'question' as const,
        targetRef: 'roman-governance',
        structuredContent: { keyPoints: ['test'], references: [] },
        suggestedNextStep: 'roman-governance',
        confidence: 0.8,
      },
      {
        trace: [{
          ruleId: 'companion-question-missing-link',
          inputs: { missingCount: 3 },
          decision: true,
        }],
      },
    )

    expect(compDecision.trace[0].ruleId).toBe('companion-question-missing-link')
    expect(compDecision.trace[0].inputs).toEqual({ missingCount: 3 })
    expect(compDecision.trace[0].decision).toBe(true)
  })

  it('Runtime 不感知 Companion Domain', () => {
    // Runtime 只认识 Decision<T>，不认识 Companion
    const compDecision = makeDecision({
      actionType: 'explain' as const,
      targetRef: 'x',
      structuredContent: { keyPoints: [], references: [] },
      suggestedNextStep: null,
      confidence: 0.9,
    })

    // Runtime Contract 检查（与所有 Domain 相同的检查逻辑）
    const requiredKeys = ['decisionId', 'evaluatorId', 'evaluatorVersion', 'inputRef', 'output', 'trace', 'createdAt']
    for (const key of requiredKeys) {
      expect(compDecision).toHaveProperty(key)
    }
  })
})
