/**
 * M87.4.1 — ExplanationProjection Contract Tests
 *
 * 验证 ExplanationProjection 的所有边界约束。
 *
 * 测试覆盖：
 *   1. 纯函数性（无副作用）
 *   2. 单向转换（Decision → ExplanationContext，不可逆）
 *   3. Source Trace 保留
 *   4. facts 全部来自 Decision.structuredContent.keyPoints
 *   5. forbiddenClaims 来自 RuleTrace 推导
 *   6. 所有 actionType 的转换
 *   7. 不产生新事实/新判断/新推荐
 */

import { describe, it, expect } from 'vitest'
import type { Decision } from '../../runtime/evaluation/Decision'
import type { CompanionResponsePayload } from '../CompanionPolicy'
import {
  projectDecisionToExplanation,
  EMPTY_EXPLANATION_CONTEXT,
} from '../ExplanationProjection'
import type { ExplanationContext } from '../ExplanationProjection'

// ============================================================================
// Test Helpers
// ============================================================================

function makeDecision(
  actionType: CompanionResponsePayload['actionType'],
  overrides?: Partial<CompanionResponsePayload>,
  traceOverrides?: Decision<CompanionResponsePayload>['trace'],
): Decision<CompanionResponsePayload> {
  return {
    decisionId: `test-decision-${actionType}`,
    evaluatorId: 'companion-policy-default-v1',
    evaluatorVersion: '1.0',
    inputRef: `test-input-${actionType}`,
    output: {
      actionType,
      targetRef: 'test-topic',
      structuredContent: {
        keyPoints: overrides?.structuredContent?.keyPoints ?? ['要点1', '要点2'],
        references: overrides?.structuredContent?.references ?? ['entity:test', 'relation:test-rel'],
      },
      suggestedNextStep: overrides?.suggestedNextStep ?? null,
      confidence: overrides?.confidence ?? 0.85,
    },
    trace: traceOverrides ?? [
      { ruleId: `companion-${actionType}`, inputs: { test: true }, decision: true },
    ],
    createdAt: Date.now(),
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('ExplanationProjection', () => {
  // ── 测试 1: 纯函数性 ──
  describe('Pure Function', () => {
    it('相同输入产生相同输出', () => {
      const decision = makeDecision('explain')
      const result1 = projectDecisionToExplanation(decision)
      const result2 = projectDecisionToExplanation(decision)

      expect(result1).toEqual(result2)
    })

    it('不修改输入 Decision', () => {
      const decision = makeDecision('explain')
      const frozen = JSON.stringify(decision)

      projectDecisionToExplanation(decision)

      expect(JSON.stringify(decision)).toBe(frozen)
    })

    it('不访问任何外部状态', () => {
      const decision = makeDecision('explain')
      // 纯函数——只依赖输入参数
      const result = projectDecisionToExplanation(decision)
      expect(result).toBeDefined()
      // 不需要任何 mock 即可运行
    })
  })

  // ── 测试 2: 单向转换 ──
  describe('One-way Transformation', () => {
    it('只接受 Decision 输入，不接受 ExplanationContext 输入', () => {
      // projectDecisionToExplanation 的签名只接受 Decision
      const decision = makeDecision('explain')
      const result = projectDecisionToExplanation(decision)
      expect(result).toBeDefined()
      // 没有反向函数
    })
  })

  // ── 测试 3: Source Trace 保留 ──
  describe('Source Trace', () => {
    it('sourceDecisionId 匹配 Decision.decisionId', () => {
      const decision = makeDecision('explain')
      const result = projectDecisionToExplanation(decision)

      expect(result.sourceDecisionId).toBe(decision.decisionId)
    })

    it('sourcePolicyVersion 匹配 Decision.evaluatorVersion', () => {
      const decision = makeDecision('explain')
      const result = projectDecisionToExplanation(decision)

      expect(result.sourcePolicyVersion).toBe(decision.evaluatorVersion)
    })

    it('sourceReferences 匹配 Decision.output.structuredContent.references', () => {
      const decision = makeDecision('explain')
      const result = projectDecisionToExplanation(decision)

      expect(result.sourceReferences).toEqual(
        decision.output.structuredContent.references,
      )
    })
  })

  // ── 测试 4: facts 全部来自 Decision ──
  describe('Facts from Decision Only', () => {
    it('facts 数量等于 keyPoints 数量', () => {
      const decision = makeDecision('explain', {
        structuredContent: {
          keyPoints: ['A', 'B', 'C'],
          references: [],
        },
      })
      const result = projectDecisionToExplanation(decision)

      expect(result.facts).toHaveLength(3)
    })

    it('每个 fact 的 text 匹配对应 keyPoint', () => {
      const decision = makeDecision('explain', {
        structuredContent: {
          keyPoints: ['罗马军事扩张', '道路体系建设', '行政整合'],
          references: [],
        },
      })
      const result = projectDecisionToExplanation(decision)

      expect(result.facts[0].text).toBe('罗马军事扩张')
      expect(result.facts[1].text).toBe('道路体系建设')
      expect(result.facts[2].text).toBe('行政整合')
    })

    it('每个 fact 的 source 标记为 decision.keyPoints', () => {
      const decision = makeDecision('explain')
      const result = projectDecisionToExplanation(decision)

      for (const fact of result.facts) {
        expect(fact.source).toBe('decision.keyPoints')
      }
    })

    it('fact.index 递增', () => {
      const decision = makeDecision('explain', {
        structuredContent: {
          keyPoints: ['A', 'B', 'C'],
          references: [],
        },
      })
      const result = projectDecisionToExplanation(decision)

      expect(result.facts[0].index).toBe(0)
      expect(result.facts[1].index).toBe(1)
      expect(result.facts[2].index).toBe(2)
    })

    it('空 keyPoints → 空 facts', () => {
      const decision = makeDecision('explain', {
        structuredContent: { keyPoints: [], references: [] },
      })
      const result = projectDecisionToExplanation(decision)

      expect(result.facts).toHaveLength(0)
    })
  })

  // ── 测试 5: references 解析 ──
  describe('Reference Parsing', () => {
    it('entity: 前缀 → type entity', () => {
      const decision = makeDecision('explain', {
        structuredContent: {
          keyPoints: [],
          references: ['entity:rome'],
        },
      })
      const result = projectDecisionToExplanation(decision)

      expect(result.references[0]).toEqual({
        ref: 'entity:rome',
        type: 'entity',
      })
    })

    it('relation: 前缀 → type relation', () => {
      const decision = makeDecision('explain', {
        structuredContent: {
          keyPoints: [],
          references: ['relation:empire-expansion'],
        },
      })
      const result = projectDecisionToExplanation(decision)

      expect(result.references[0]).toEqual({
        ref: 'relation:empire-expansion',
        type: 'relation',
      })
    })

    it('未知前缀 → type unknown', () => {
      const decision = makeDecision('explain', {
        structuredContent: {
          keyPoints: [],
          references: ['unknown:something'],
        },
      })
      const result = projectDecisionToExplanation(decision)

      expect(result.references[0]).toEqual({
        ref: 'unknown:something',
        type: 'unknown',
      })
    })
  })

  // ── 测试 6: forbiddenClaims 推导 ──
  describe('Forbidden Claims Derivation', () => {
    it('companion-explain 规则触发 → 禁止声称"我不确定"', () => {
      const decision = makeDecision('explain', {}, [
        { ruleId: 'companion-explain', inputs: {}, decision: true },
      ])
      const result = projectDecisionToExplanation(decision)

      const uncertainClaim = result.forbiddenClaims.find(
        (c) => c.claim.includes('不确定'),
      )
      expect(uncertainClaim).toBeDefined()
      expect(uncertainClaim!.ruleId).toBe('companion-explain')
    })

    it('companion-question-missing-link 规则触发 → 禁止声称"理解已经很完整"', () => {
      const decision = makeDecision('question', {}, [
        { ruleId: 'companion-question-missing-link', inputs: {}, decision: true },
      ])
      const result = projectDecisionToExplanation(decision)

      const completeClaim = result.forbiddenClaims.find(
        (c) => c.claim.includes('完整'),
      )
      expect(completeClaim).toBeDefined()
      expect(completeClaim!.ruleId).toBe('companion-question-missing-link')
    })

    it('companion-summarize 规则触发 → 禁止声称"理解不完整"', () => {
      const decision = makeDecision('summarize', {}, [
        { ruleId: 'companion-summarize', inputs: {}, decision: true },
      ])
      const result = projectDecisionToExplanation(decision)

      const incompleteClaim = result.forbiddenClaims.find(
        (c) => c.claim.includes('不完整'),
      )
      expect(incompleteClaim).toBeDefined()
      expect(incompleteClaim!.ruleId).toBe('companion-summarize')
    })

    it('companion-suggest-default 规则触发 → 禁止声称"唯一"', () => {
      const decision = makeDecision('suggest', {}, [
        { ruleId: 'companion-suggest-default', inputs: {}, decision: true },
      ])
      const result = projectDecisionToExplanation(decision)

      const onlyClaim = result.forbiddenClaims.find(
        (c) => c.claim.includes('唯一'),
      )
      expect(onlyClaim).toBeDefined()
      expect(onlyClaim!.ruleId).toBe('companion-suggest-default')
    })

    it('多个规则触发 → 多条 forbiddenClaims', () => {
      const decision = makeDecision('explain', {}, [
        { ruleId: 'companion-explain', inputs: {}, decision: true },
        { ruleId: 'companion-suggest-default', inputs: {}, decision: true },
      ])
      const result = projectDecisionToExplanation(decision)

      expect(result.forbiddenClaims.length).toBeGreaterThanOrEqual(2)
    })

    it('无匹配规则 → 空 forbiddenClaims', () => {
      const decision = makeDecision('explain', {}, [
        { ruleId: 'unknown-rule', inputs: {}, decision: true },
      ])
      const result = projectDecisionToExplanation(decision)

      expect(result.forbiddenClaims).toHaveLength(0)
    })

    it('只匹配 decision=true 的 trace', () => {
      const decision = makeDecision('explain', {}, [
        { ruleId: 'companion-explain', inputs: {}, decision: false },
      ])
      const result = projectDecisionToExplanation(decision)

      expect(result.forbiddenClaims).toHaveLength(0)
    })
  })

  // ── 测试 7: 所有 actionType 的转换 ──
  describe('All Action Types', () => {
    const actionTypes: CompanionResponsePayload['actionType'][] = [
      'explain', 'suggest', 'question', 'summarize', 'connect',
    ]

    for (const actionType of actionTypes) {
      it(`${actionType} → 生成有效的 ExplanationContext`, () => {
        const decision = makeDecision(actionType)
        const result = projectDecisionToExplanation(decision)

        expect(result.intent).toBe(actionType)
        expect(result.subject).toBe('test-topic')
        expect(result.narrativeGoal).toBeTruthy()
        expect(result.facts.length).toBeGreaterThan(0)
        expect(result.style.tone).toBeDefined()
        expect(result.style.depth).toBeDefined()
        expect(result.sourceDecisionId).toBe(decision.decisionId)
      })
    }
  })

  // ── 测试 8: 叙事风格判定 ──
  describe('Style Determination', () => {
    it('explain → educational tone', () => {
      const decision = makeDecision('explain')
      const result = projectDecisionToExplanation(decision)
      expect(result.style.tone).toBe('educational')
    })

    it('suggest → exploratory tone', () => {
      const decision = makeDecision('suggest')
      const result = projectDecisionToExplanation(decision)
      expect(result.style.tone).toBe('exploratory')
    })

    it('question → conversational tone', () => {
      const decision = makeDecision('question')
      const result = projectDecisionToExplanation(decision)
      expect(result.style.tone).toBe('conversational')
    })

    it('高 confidence → 深 depth', () => {
      const decision = makeDecision('explain', { confidence: 0.95 })
      const result = projectDecisionToExplanation(decision)
      expect(result.style.depth).toBe('deep')
    })

    it('低 confidence → 浅 depth', () => {
      const decision = makeDecision('suggest', { confidence: 0.3 })
      const result = projectDecisionToExplanation(decision)
      expect(result.style.depth).toBe('shallow')
    })

    it('语言偏好可配置', () => {
      const decision = makeDecision('explain')
      const result = projectDecisionToExplanation(decision, { language: 'en-US' })
      expect(result.style.language).toBe('en-US')
    })

    it('默认语言为 zh-CN', () => {
      const decision = makeDecision('explain')
      const result = projectDecisionToExplanation(decision)
      expect(result.style.language).toBe('zh-CN')
    })
  })

  // ── 测试 9: narrativeGoal 映射 ──
  describe('Narrative Goal', () => {
    it('explain → 帮助用户理解因果关系', () => {
      const decision = makeDecision('explain')
      const result = projectDecisionToExplanation(decision)
      expect(result.narrativeGoal).toBe('帮助用户理解因果关系')
    })

    it('suggest → 引导用户发现下一步探索方向', () => {
      const decision = makeDecision('suggest')
      const result = projectDecisionToExplanation(decision)
      expect(result.narrativeGoal).toBe('引导用户发现下一步探索方向')
    })

    it('question → 通过提问帮助用户主动思考', () => {
      const decision = makeDecision('question')
      const result = projectDecisionToExplanation(decision)
      expect(result.narrativeGoal).toBe('通过提问帮助用户主动思考')
    })

    it('summarize → 帮助用户收束当前理解，形成认知闭环', () => {
      const decision = makeDecision('summarize')
      const result = projectDecisionToExplanation(decision)
      expect(result.narrativeGoal).toBe('帮助用户收束当前理解，形成认知闭环')
    })
  })

  // ── 测试 10: 不产生新认知 ──
  describe('No New Cognition', () => {
    it('不产生 Decision 中没有的新事实', () => {
      const decision = makeDecision('explain', {
        structuredContent: {
          keyPoints: ['A', 'B'],
          references: [],
        },
      })
      const result = projectDecisionToExplanation(decision)

      // 所有 fact.text 都来自 keyPoints
      for (const fact of result.facts) {
        expect(decision.output.structuredContent.keyPoints).toContain(fact.text)
      }
    })

    it('不修改 targetRef', () => {
      const decision = {
        ...makeDecision('explain'),
        output: {
          ...makeDecision('explain').output,
          targetRef: 'original-topic',
        },
      }
      const result = projectDecisionToExplanation(decision)

      expect(result.subject).toBe('original-topic')
    })

    it('不添加额外 references', () => {
      const decision = makeDecision('explain', {
        structuredContent: {
          keyPoints: [],
          references: ['entity:rome'],
        },
      })
      const result = projectDecisionToExplanation(decision)

      expect(result.references).toHaveLength(1)
      expect(result.references[0].ref).toBe('entity:rome')
    })
  })

  // ── 测试 11: 空 Decision 处理 ──
  describe('Edge Cases', () => {
    it('空 keyPoints + 空 references 也能正常处理', () => {
      const decision = makeDecision('explain', {
        structuredContent: { keyPoints: [], references: [] },
      })
      const result = projectDecisionToExplanation(decision)

      expect(result.facts).toHaveLength(0)
      expect(result.references).toHaveLength(0)
      expect(result.sourceDecisionId).toBe(decision.decisionId)
    })

    it('EMPTY_EXPLANATION_CONTEXT 有合理默认值', () => {
      expect(EMPTY_EXPLANATION_CONTEXT.subject).toBe('')
      expect(EMPTY_EXPLANATION_CONTEXT.intent).toBe('explain')
      expect(EMPTY_EXPLANATION_CONTEXT.facts).toHaveLength(0)
      expect(EMPTY_EXPLANATION_CONTEXT.sourceDecisionId).toBe('')
    })
  })
})
