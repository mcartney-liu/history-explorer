/**
 * P-U08 回归测试
 *
 * 根因（2026-08-13 实证）：实体页「下一步探索」产出的 open_dimension 目标是
 * 中文维度标签（'历史事件'），点击 404，用户感知为「下一步推演断掉」。
 *
 * 本测试用 backend 真实实体数据（/entity/roman_empire:civ-roman）复刻
 * App.tsx effect 的「投影 → ExplorationState → Policy」管线，锁死：
 *   1. Rule 1 的 targetRef 必须是真实可达实体（global_id），不是中文标签；
 *   2. dimensionMapping 缺失时绝不产出中文标签目标。
 */

import { describe, it, expect } from 'vitest'
import { computeUnderstandingProjection, type ContextSnapshot } from '../../UnderstandingProjection'
import { buildExplorationState } from '../ExplorationState'
import { evaluateExploration } from '../ExplorationPolicy'

// 真实数据（backend 实测，2026-08-13）：
const REAL_RELATED_ENTITIES = [
  { id: 'event-roman-empire-established', type: 'Event', name: '罗马帝国建立' },
  { id: 'roman_egypt', type: 'Civilization', name: '罗马治下的埃及' },
  { id: 'civ-byzantine', type: 'Civilization', name: '拜占庭帝国' },
  { id: 'religion-christianity', type: 'Religion', name: '基督教' },
  { id: 'event-pax-romana', type: 'Event', name: '罗马和平' },
  { id: 'event-empire-fall', type: 'Event', name: '西罗马帝国灭亡' },
]

// relationships[].other.global_id（与后端响应同构）
const REAL_RELATIONSHIP_OTHERS: Record<string, string> = {
  'event-roman-empire-established': 'roman_empire:event-roman-empire-established',
  roman_egypt: 'roman_empire:roman_egypt',
  'civ-byzantine': 'roman_empire:civ-byzantine',
  'religion-christianity': 'roman_empire:religion-christianity',
  'event-pax-romana': 'roman_empire:event-pax-romana',
  'event-empire-fall': 'roman_empire:event-empire-fall',
}

function runPipeline(dimensionMapping: Record<string, string[]>) {
  const dimensionEntities = REAL_RELATED_ENTITIES.map((e) => ({ id: e.id, type: e.type }))
  const entityTypes = [...new Set(dimensionEntities.map((e) => e.type).filter((t): t is string => Boolean(t)))]
  const template = {
    templateId: 'auto-generated-from-topic-data',
    version: '1.0',
    topic: '罗马帝国',
    goal: '',
    requiredDimensions: entityTypes,
    dimensionMapping,
    expectedRelations: [],
  }

  const snapshot: ContextSnapshot = {
    explorationId: 'exploration-default',
    anchorChain: [], // 首次进入实体页，锚点链为空
    relationChain: [],
  }

  const projection = computeUnderstandingProjection(snapshot, template)
  const eState = buildExplorationState({
    explorationId: 'exploration-default',
    currentTopic: '罗马帝国',
    currentAnchorRef: 'roman_empire:civ-roman',
    understandingProjection: {
      stage: projection.stage,
      coverageState: {
        requiredDimensions: projection.coverageState.requiredDimensions || [],
        coveredDimensions: projection.coverageState.coveredDimensions || [],
        coverageRatio: projection.coverageState.coverageRatio || 0,
      },
      missingLinks: projection.missingLinks,
      basedOn: { projectionVersion: '1.0' },
    },
    dimensionMapping,
    memoryProjection: { totalNodes: 0, daysSinceStart: 0, activeBranches: [] },
    sessionHistory: { exploredAnchors: [], exploredRelations: [], activeQuestions: [] },
  })

  return evaluateExploration(eState, {
    policyVersion: '1.0',
    timestamp: Date.now(),
    engineProtocolVersion: '1.0',
  })
}

describe('P-U08 回归：open_dimension 目标是真实实体而非中文标签', () => {
  it('真实数据（含 global_id 映射）→ open_dimension 指向可达实体', () => {
    // 复刻 App.tsx 的 dimensionMapping 构建（短 id → global_id）
    const dimensionMapping: Record<string, string[]> = {}
    for (const e of REAL_RELATED_ENTITIES) {
      if (!e.type) continue
      if (!dimensionMapping[e.type]) dimensionMapping[e.type] = []
      const gid = REAL_RELATIONSHIP_OTHERS[e.id] ?? e.id
      if (!dimensionMapping[e.type].includes(gid)) dimensionMapping[e.type].push(gid)
    }

    const decision = runPipeline(dimensionMapping)
    const out = decision.output

    expect(out.type).toBe('open_dimension')
    // 目标必须是真实 global_id（可点击、后端 200），绝不是中文维度标签（404）
    expect(out.targetRef).toBe('roman_empire:event-roman-empire-established')
    expect(out.targetRef).not.toMatch(/历史|文明|宗教|维度|探索/)
  })

  it('dimensionMapping 缺失 → 不产出中文标签目标（落到后续规则）', () => {
    const decision = runPipeline({})
    const out = decision.output

    // 不允许出现 404 目标（中文标签 / raw 维度名）
    expect(out.targetRef).not.toMatch(/历史|文明|宗教|维度|探索/)
  })
})
