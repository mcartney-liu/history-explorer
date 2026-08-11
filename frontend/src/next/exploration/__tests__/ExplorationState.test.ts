/**
 * M88.1 — ExplorationState Model Tests
 *
 * 验证 ExplorationState 模型和 buildExplorationState() 纯函数。
 *
 * 测试覆盖：
 *   1. ExplorationState 结构完整性
 *   2. buildExplorationState() 纯函数性
 *   3. 字段推导规则
 *   4. 与 Memory 的边界（不是复制品）
 *   5. 边界情况
 */

import { describe, it, expect } from 'vitest'
import type { UnderstandingStage } from '../../UnderstandingProjection'
import type { ExplorationStateBuilderInput } from '../ExplorationState'
import { buildExplorationState, EMPTY_EXPLORATION_STATE } from '../ExplorationState'

// ============================================================================
// Test Helpers
// ============================================================================

function makeInput(overrides?: Partial<ExplorationStateBuilderInput>): ExplorationStateBuilderInput {
  return {
    explorationId: 'exp-001',
    currentTopic: '罗马帝国',
    currentAnchorRef: 'entity:rome',
    understandingProjection: {
      stage: 'CONNECTION' as UnderstandingStage,
      coverageState: {
        requiredDimensions: ['military', 'economy', 'politics', 'culture'],
        coveredDimensions: ['military', 'politics'],
        coverageRatio: 0.5,
      },
      missingLinks: [
        {
          fromRef: 'entity:rome',
          toRef: 'entity:trade-network',
          expectedRelationType: 'enables',
          templateRef: 'template-roman',
        },
      ],
      basedOn: { projectionVersion: '1.0' },
    },
    memoryProjection: {
      totalNodes: 8,
      daysSinceStart: 3,
      activeBranches: [
        { branchId: 'b-1', latestStage: 'CONNECTION' },
        { branchId: 'b-2', latestStage: 'FACT' },
      ],
      basedOn: { projectionVersion: '1.0' },
    },
    sessionHistory: {
      exploredAnchors: ['entity:rome', 'entity:gaul'],
      exploredRelations: ['relation:conquest'],
      activeQuestions: ['罗马为什么能快速扩张？'],
    },
    ...overrides,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('ExplorationState Model (M88.1)', () => {
  // ── 测试 1: 结构完整性 ──
  describe('Structure', () => {
    it('包含所有必需字段', () => {
      const state = buildExplorationState(makeInput())

      const requiredKeys = [
        'explorationId', 'currentTopic', 'currentAnchorRef',
        'understandingStage', 'coverageRatio',
        'coveredDimensions', 'missingDimensions',
        'missingConnections',
        'exploredAnchors', 'exploredRelations', 'activeQuestions',
        'memorySnapshot', 'computedAt', 'basedOn',
      ]

      for (const key of requiredKeys) {
        expect(state).toHaveProperty(key)
      }
    })

    it('explorationId 正确传递', () => {
      const state = buildExplorationState(makeInput({ explorationId: 'exp-42' }))
      expect(state.explorationId).toBe('exp-42')
    })

    it('currentTopic 正确传递', () => {
      const state = buildExplorationState(makeInput({ currentTopic: '秦朝统一' }))
      expect(state.currentTopic).toBe('秦朝统一')
    })
  })

  // ── 测试 2: 纯函数性 ──
  describe('Pure Function', () => {
    it('相同输入 → 相同输出（除 computedAt）', () => {
      const input = makeInput()
      const s1 = buildExplorationState(input)
      const s2 = buildExplorationState(input)

      // 除 computedAt 外完全一致
      expect(s1.explorationId).toBe(s2.explorationId)
      expect(s1.coverageRatio).toBe(s2.coverageRatio)
      expect(s1.missingDimensions).toEqual(s2.missingDimensions)
      expect(s1.missingConnections).toEqual(s2.missingConnections)
      expect(s1.exploredAnchors).toEqual(s2.exploredAnchors)
    })

    it('不修改输入', () => {
      const input = makeInput()
      const frozen = JSON.stringify(input)

      buildExplorationState(input)

      expect(JSON.stringify(input)).toBe(frozen)
    })
  })

  // ── 测试 3: 字段推导规则 ──
  describe('Field Derivation', () => {
    it('understandingStage 直接映射', () => {
      const state = buildExplorationState(makeInput({
        understandingProjection: {
          ...makeInput().understandingProjection,
          stage: 'UNDERSTANDING',
        },
      }))
      expect(state.understandingStage).toBe('UNDERSTANDING')
    })

    it('coverageRatio 直接映射', () => {
      const state = buildExplorationState(makeInput({
        understandingProjection: {
          ...makeInput().understandingProjection,
          coverageState: {
            requiredDimensions: ['a', 'b'],
            coveredDimensions: ['a'],
            coverageRatio: 0.5,
          },
        },
      }))
      expect(state.coverageRatio).toBe(0.5)
    })

    it('missingDimensions = required - covered', () => {
      const state = buildExplorationState(makeInput())
      // required: ['military','economy','politics','culture']
      // covered: ['military','politics']
      // missing: ['economy','culture']
      expect(state.missingDimensions).toEqual(['economy', 'culture'])
    })

    it('全部覆盖时 missingDimensions 为空', () => {
      const input = makeInput()
      input.understandingProjection.coverageState.coveredDimensions = [
        'military', 'economy', 'politics', 'culture',
      ]
      input.understandingProjection.coverageState.coverageRatio = 1.0

      const state = buildExplorationState(input)
      expect(state.missingDimensions).toHaveLength(0)
    })

    it('missingConnections 直接映射', () => {
      const state = buildExplorationState(makeInput())
      expect(state.missingConnections).toHaveLength(1)
      expect(state.missingConnections[0].fromRef).toBe('entity:rome')
      expect(state.missingConnections[0].toRef).toBe('entity:trade-network')
    })

    it('空 missingLinks → 空 missingConnections', () => {
      const input = makeInput()
      input.understandingProjection.missingLinks = []

      const state = buildExplorationState(input)
      expect(state.missingConnections).toHaveLength(0)
    })

    it('exploredAnchors 直接映射', () => {
      const state = buildExplorationState(makeInput())
      expect(state.exploredAnchors).toEqual(['entity:rome', 'entity:gaul'])
    })

    it('activeQuestions 直接映射', () => {
      const state = buildExplorationState(makeInput())
      expect(state.activeQuestions).toEqual(['罗马为什么能快速扩张？'])
    })
  })

  // ── 测试 4: MemorySnapshot 是摘要，非复制 ──
  describe('MemorySnapshot - Summary, Not Copy', () => {
    it('memorySnapshot.totalNodes 来自 MemoryProjection', () => {
      const state = buildExplorationState(makeInput({
        memoryProjection: {
          ...makeInput().memoryProjection,
          totalNodes: 15,
        },
      }))
      expect(state.memorySnapshot.totalNodes).toBe(15)
    })

    it('memorySnapshot 不包含完整 GrowthGraph', () => {
      const state = buildExplorationState(makeInput())

      // MemorySnapshot 只有摘要字段
      const snapshotKeys = Object.keys(state.memorySnapshot)
      expect(snapshotKeys).toContain('totalNodes')
      expect(snapshotKeys).toContain('daysSinceStart')
      expect(snapshotKeys).toContain('activeBranches')

      // 不包含 GrowthGraph 的 nodes/edges
      expect(snapshotKeys).not.toContain('nodes')
      expect(snapshotKeys).not.toContain('edges')
    })

    it('activeBranches 摘要正确', () => {
      const state = buildExplorationState(makeInput())
      expect(state.memorySnapshot.activeBranches).toHaveLength(2)
      expect(state.memorySnapshot.activeBranches[0].branchId).toBe('b-1')
      expect(state.memorySnapshot.activeBranches[0].latestStage).toBe('CONNECTION')
    })
  })

  // ── 测试 5: 不同 coverageRatio → 不同 missingDimensions ──
  describe('Coverage Ratio Effects', () => {
    it('低覆盖 → 多 missingDimensions', () => {
      const input = makeInput()
      input.understandingProjection.coverageState.coveredDimensions = ['military']
      input.understandingProjection.coverageState.coverageRatio = 0.25

      const state = buildExplorationState(input)
      expect(state.missingDimensions.length).toBe(3) // economy, politics, culture
    })

    it('高覆盖 → 少 missingDimensions', () => {
      const input = makeInput()
      input.understandingProjection.coverageState.coveredDimensions = [
        'military', 'economy', 'politics',
      ]
      input.understandingProjection.coverageState.coverageRatio = 0.75

      const state = buildExplorationState(input)
      expect(state.missingDimensions.length).toBe(1) // culture
    })
  })

  // ── 测试 6: exploredAnchors 随探索推进增长 ──
  describe('Exploration History Growth', () => {
    it('探索前：exploredAnchors 较少', () => {
      const state = buildExplorationState(makeInput({
        sessionHistory: {
          exploredAnchors: ['entity:rome'],
          exploredRelations: [],
          activeQuestions: [],
        },
      }))
      expect(state.exploredAnchors).toHaveLength(1)
    })

    it('探索后：exploredAnchors 增长', () => {
      const state = buildExplorationState(makeInput({
        sessionHistory: {
          exploredAnchors: ['entity:rome', 'entity:gaul', 'entity:carthage'],
          exploredRelations: ['relation:conquest', 'relation:trade'],
          activeQuestions: ['为什么扩张？'],
        },
      }))
      expect(state.exploredAnchors).toHaveLength(3)
      expect(state.exploredAnchors).toContain('entity:carthage')
    })
  })

  // ── 测试 7: 边界情况 ──
  describe('Edge Cases', () => {
    it('空 sessionHistory', () => {
      const state = buildExplorationState(makeInput({
        sessionHistory: {
          exploredAnchors: [],
          exploredRelations: [],
          activeQuestions: [],
        },
      }))
      expect(state.exploredAnchors).toHaveLength(0)
      expect(state.exploredRelations).toHaveLength(0)
      expect(state.activeQuestions).toHaveLength(0)
    })

    it('EMPTY_EXPLORATION_STATE 有合理默认值', () => {
      expect(EMPTY_EXPLORATION_STATE.explorationId).toBe('')
      expect(EMPTY_EXPLORATION_STATE.understandingStage).toBe('FACT')
      expect(EMPTY_EXPLORATION_STATE.coverageRatio).toBe(0)
      expect(EMPTY_EXPLORATION_STATE.missingDimensions).toHaveLength(0)
      expect(EMPTY_EXPLORATION_STATE.missingConnections).toHaveLength(0)
      expect(EMPTY_EXPLORATION_STATE.memorySnapshot.totalNodes).toBe(0)
    })

    it('所有阶段类型都支持', () => {
      const stages: UnderstandingStage[] = ['FACT', 'CONNECTION', 'UNDERSTANDING', 'NEW_QUESTION']
      for (const stage of stages) {
        const input = makeInput()
        input.understandingProjection.stage = stage
        const state = buildExplorationState(input)
        expect(state.understandingStage).toBe(stage)
      }
    })
  })
})
