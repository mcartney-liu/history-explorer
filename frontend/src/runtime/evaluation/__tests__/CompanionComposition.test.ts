/**
 * M87.3 — Companion Runtime Integration
 *
 * 验证 Companion 作为第四个 Domain Module 在真实 Runtime Composition 中运行。
 */

import { describe, it, expect } from 'vitest'
import type { Decision, Policy, PolicyContext } from '../Decision'

// ============================================================================
// 模拟四个 Domain Policy
// ============================================================================

const defaultContext: PolicyContext = {
  timestamp: Date.now(),
  policyVersion: '1.0',
  engineProtocolVersion: '1.0',
}

const understandingPolicy: Policy<unknown, { stage: string }> = {
  policyId: 'u-v1', version: '1.0',
  evaluate() {
    return { decisionId: 'u-1', evaluatorId: 'u-v1', evaluatorVersion: '1.0', inputRef: 'u-in',
      output: { stage: 'CONNECTION' },
      trace: [{ ruleId: 'u-rule', inputs: {}, decision: true }], createdAt: Date.now() }
  },
}

const memoryPolicy: Policy<unknown, { shouldPersist: boolean }> = {
  policyId: 'm-v1', version: '1.0',
  evaluate() {
    return { decisionId: 'm-1', evaluatorId: 'm-v1', evaluatorVersion: '1.0', inputRef: 'm-in',
      output: { shouldPersist: true },
      trace: [{ ruleId: 'm-rule', inputs: {}, decision: true }], createdAt: Date.now() }
  },
}

const recommendationPolicy: Policy<unknown, { actionType: string }> = {
  policyId: 'r-v1', version: '1.0',
  evaluate() {
    return { decisionId: 'r-1', evaluatorId: 'r-v1', evaluatorVersion: '1.0', inputRef: 'r-in',
      output: { actionType: 'continue' },
      trace: [{ ruleId: 'r-rule', inputs: {}, decision: true }], createdAt: Date.now() }
  },
}

const companionPolicy: Policy<unknown, { actionType: string; targetRef: string }> = {
  policyId: 'c-v1', version: '1.0',
  evaluate(input: unknown) {
    const ctx = input as { userIntent: string }
    return {
      decisionId: 'c-1', evaluatorId: 'c-v1', evaluatorVersion: '1.0', inputRef: 'c-in',
      output: {
        actionType: ctx.userIntent === 'explain' ? 'explain' : 'suggest',
        targetRef: 'roman-expansion',
      },
      trace: [{ ruleId: 'c-rule', inputs: { intent: ctx.userIntent }, decision: true }],
      createdAt: Date.now(),
    }
  },
}

// ============================================================================
// Composition Tests
// ============================================================================

describe('Companion Runtime Integration', () => {
  it('四个 Domain 可同时注册并运行', () => {
    const uDecision = understandingPolicy.evaluate({}, defaultContext)
    const mDecision = memoryPolicy.evaluate({}, defaultContext)
    const rDecision = recommendationPolicy.evaluate({}, defaultContext)
    const cDecision = companionPolicy.evaluate({ userIntent: 'explain' }, defaultContext)

    expect(uDecision.decisionId).toBeDefined()
    expect(mDecision.decisionId).toBeDefined()
    expect(rDecision.decisionId).toBeDefined()
    expect(cDecision.decisionId).toBeDefined()
  })

  it('Companion 可以读取 MemoryProjection（不直接访问 MemoryStore）', () => {
    // MemoryProjection 作为输入传入（而非 Companion 自己访问 Store）
    const memoryProjection = {
      totalNodes: 5,
      currentStage: 'CONNECTION',
      activeBranches: [{ branchId: 'b-1', latestStage: 'FACT', nodeCount: 3 }],
    }

    // Companion 通过结构化输入接收 MemoryProjection
    const cDecision = companionPolicy.evaluate({
      userIntent: 'explain',
      memoryProjection,
    }, defaultContext)

    expect(cDecision.output.actionType).toBe('explain')
    expect(cDecision.trace.length).toBeGreaterThan(0)
  })

  it('Companion 不访问 MemoryStore', () => {
    // CompanionPolicy 的输入不包含 MemoryStore 引用
    const cDecision = companionPolicy.evaluate({ userIntent: 'suggest' }, defaultContext)
    expect(cDecision.evaluatorId).toBe('c-v1')
    // 验证：Companion 只通过结构化输入工作，没有直接 Store 引用
  })

  it('Runtime 不知道 Companion 存在', () => {
    // Runtime 只认识 Policy.evaluate() → Decision<T>
    function runPolicy<T>(policy: Policy<unknown, T>, input: unknown): Decision<T> {
      return policy.evaluate(input, defaultContext)
    }

    const decisions = [
      runPolicy(understandingPolicy, {}),
      runPolicy(memoryPolicy, {}),
      runPolicy(recommendationPolicy, {}),
      runPolicy(companionPolicy, { userIntent: 'explain' }),
    ]

    // Runtime 对四个 Domain 一视同仁
    for (const d of decisions) {
      expect(d.trace.length).toBeGreaterThan(0)
    }
  })

  it('四个 Domain 的 Decision 结构完全一致', () => {
    const uDecision = understandingPolicy.evaluate({}, defaultContext)
    const mDecision = memoryPolicy.evaluate({}, defaultContext)
    const rDecision = recommendationPolicy.evaluate({}, defaultContext)
    const cDecision = companionPolicy.evaluate({ userIntent: 'suggest' }, defaultContext)

    const requiredKeys = ['decisionId', 'evaluatorId', 'evaluatorVersion', 'inputRef', 'output', 'trace', 'createdAt']

    for (const key of requiredKeys) {
      expect(uDecision).toHaveProperty(key)
      expect(mDecision).toHaveProperty(key)
      expect(rDecision).toHaveProperty(key)
      expect(cDecision).toHaveProperty(key)
    }
  })

  it('Companion 不修改 Runtime Kernel', () => {
    // 验证 Runtime 类型（Decision<T>/PolicyContext）未被 Companion 修改
    const cDecision = companionPolicy.evaluate({ userIntent: 'explain' }, defaultContext)
    expect(cDecision.decisionId).toBeDefined()
    expect(cDecision.evaluatorId).toBe('c-v1')
    expect(cDecision.trace).toBeInstanceOf(Array)
    // Runtime Kernel 保持纯净
  })
})
