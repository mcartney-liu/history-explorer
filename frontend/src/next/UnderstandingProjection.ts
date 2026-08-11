/**
 * M86.1 Batch 3 — Understanding Projection Runtime
 *
 * Understanding Layer = Analysis Runtime。
 * 接收 Context Snapshot + UnderstandingTemplate → 输出 UnderstandingProjection。
 *
 * 三条边界：
 *   1. 数据 ≠ 解释  — UnderstandingProjection 不包含 Knowledge Layer 数据副本
 *   2. 行为 ≠ 理解  — 计算不使用点击次数/时长/浏览数
 *   3. AI ≠ 真相   — 不由 AI 判定 stage/coverage
 *
 * EP-006: Context 是唯一语义来源。
 * EP-009: 所有语义必须来源于权威知识层。
 *
 * 纯函数：computeUnderstandingProjection(snapshot, template) → UnderstandingProjection
 */

import type { Anchor, Relation } from './ExplorerRuntimeContext'

// ============================================================================
// UnderstandingTemplate（Curator 预写，M86.1.9）
// ============================================================================

export interface UnderstandingTemplate {
  templateId: string
  version: string              // M86.1.12
  topic: string
  goal: string                 // 人类可读版本（用于展示，不用于计算）
  requiredDimensions: string[]
  dimensionMapping: {
    [dimension: string]: string[]  // dimension → entityId[]
  }
  expectedRelations: {
    from: string               // entityId
    to: string                 // entityId
    type: string               // requires | enables | influences | supports
  }[]
}

// ============================================================================
// UnderstandingProjection（M86.1.11: 系统推导，非用户真实认知）
// ============================================================================

export type UnderstandingStage =
  | 'FACT'            // 正在确认事实
  | 'CONNECTION'      // 正在建立连接
  | 'UNDERSTANDING'   // 探索结构满足闭合条件（系统推导，非用户真实理解）
  | 'NEW_QUESTION'    // 从闭合中产生缺口

export interface KnownObject {
  anchorRef: string            // 引用 Context.anchorChain 中的 entityId
}

export interface DiscoveredRelation {
  relationRef: string          // 引用 Context.relationChain 中的 relationId
  fromObjectRef: string        // 引用 KnownObject.anchorRef
  toObjectRef: string          // 引用 KnownObject.anchorRef
  relationType: string
}

export interface MissingLink {
  fromRef: string              // 已知对象 A 的 anchorRef
  toRef: string                // 已知对象 B 的 anchorRef
  expectedRelationType: string
  templateRef: string          // 引用 UnderstandingTemplate.templateId（M86.1.9: 文本→引用）
}

export interface CoverageState {
  requiredDimensions: string[]
  coveredDimensions: string[]
  coverageRatio: number        // coveredDimensions.length / requiredDimensions.length
}

export interface UnderstandingProjection {
  topicRef: string
  knownObjects: KnownObject[]
  discoveredRelations: DiscoveredRelation[]
  coverageState: CoverageState
  stage: UnderstandingStage
  missingLinks: MissingLink[]
  // unresolvedQuestions 不属于 Understanding Layer——由 Experience Layer 翻译
  basedOn: {
    anchorChainLength: number
    relationChainLength: number
    computedAt: number
    templateRef: string        // M86.1.12
    templateVersion: string    // M86.1.12
    projectionVersion: string  // M86.1.12
  }
}

// ============================================================================
// Context Snapshot（Understanding Layer 的唯一输入）
// ============================================================================

export interface ContextSnapshot {
  explorationId: string | null
  anchorChain: Anchor[]
  relationChain: Relation[]
}

// ============================================================================
// 默认空值
// ============================================================================

export const EMPTY_PROJECTION: UnderstandingProjection = {
  topicRef: '',
  knownObjects: [],
  discoveredRelations: [],
  coverageState: {
    requiredDimensions: [],
    coveredDimensions: [],
    coverageRatio: 0,
  },
  stage: 'FACT',
  missingLinks: [],
  basedOn: {
    anchorChainLength: 0,
    relationChainLength: 0,
    computedAt: 0,
    templateRef: '',
    templateVersion: '',
    projectionVersion: '1.0',
  },
}

// ============================================================================
// computeUnderstandingProjection（纯函数）
//
// 输入：Context 快照 + UnderstandingTemplate
// 输出：UnderstandingProjection
//
// 禁止：AI 参与、行为指标、修改 Entity/Relation
// ============================================================================

export function computeUnderstandingProjection(
  snapshot: ContextSnapshot,
  template: UnderstandingTemplate,
): UnderstandingProjection {
  // 1. 从 anchorChain 提取 knownObjects
  const knownObjects: KnownObject[] = snapshot.anchorChain.map((a) => ({
    anchorRef: a.entityId,
  }))

  // 2. 从 relationChain 提取 discoveredRelations
  const discoveredRelations: DiscoveredRelation[] = snapshot.relationChain.map((r) => ({
    relationRef: r.relationId,
    fromObjectRef: r.fromEntityId,
    toObjectRef: r.toEntityId,
    relationType: r.relationType,
  }))

  // 3. 计算 coverageState（基于 Template.dimensionMapping 显式映射，不由 entityType 推断）
  const knownEntityIds = new Set(snapshot.anchorChain.map((a) => a.entityId))
  const coveredDimensions = template.requiredDimensions.filter((dim) => {
    const mappedIds = template.dimensionMapping[dim]
    if (!mappedIds || mappedIds.length === 0) return false
    return mappedIds.some((id) => knownEntityIds.has(id))
  })
  const coverageState: CoverageState = {
    requiredDimensions: template.requiredDimensions,
    coveredDimensions,
    coverageRatio:
      template.requiredDimensions.length > 0
        ? coveredDimensions.length / template.requiredDimensions.length
        : 0,
  }

  // 4. 判定 stage（基于锚点链和关系链的结构，不由跳转次数/时长触发）
  const stage = determineStage(knownObjects, discoveredRelations, coverageState)

  // 5. 计算 missingLinks（对比 Template.expectedRelations，不由 AI 生成）
  const missingLinks = computeMissingLinks(knownEntityIds, discoveredRelations, template)

  return {
    topicRef: snapshot.explorationId ?? '',
    knownObjects,
    discoveredRelations,
    coverageState,
    stage,
    missingLinks,
    basedOn: {
      anchorChainLength: snapshot.anchorChain.length,
      relationChainLength: snapshot.relationChain.length,
      computedAt: Date.now(),
      templateRef: template.templateId,
      templateVersion: template.version,
      projectionVersion: '1.0',
    },
  }
}

// ============================================================================
// determineStage（纯函数，不使用 AI）
//
// 规则（M86.1.8 + 1.9）：
//   FACT         — 默认
//   CONNECTION   — discoveredRelations.length >= 1（必须有 Causal Layer 数据）
//   UNDERSTANDING — 存在完整因果链（A→B→C）+ coverageRatio > 0
//   NEW_QUESTION  — stage=UNDERSTANDING + missingLinks.length > 0
//
// 不可自动推进：不由跳转次数/时长/点击数触发。
// ============================================================================

function determineStage(
  _knownObjects: KnownObject[],
  discoveredRelations: DiscoveredRelation[],
  coverage: CoverageState,
): UnderstandingStage {
  // NEW_QUESTION 在外部判定（需要对比 missingLinks）
  // 此处只处理 FACT → CONNECTION → UNDERSTANDING

  if (discoveredRelations.length === 0) {
    return 'FACT'
  }

  // 检查是否存在完整因果链：至少两个 Relation 首尾相连
  const hasChain = hasCausalChain(discoveredRelations)

  if (hasChain && coverage.coverageRatio > 0) {
    return 'UNDERSTANDING'
  }

  return 'CONNECTION'
}

/** 检查 discoveredRelations 中是否存在至少一条首尾相连的链（A→B→C） */
function hasCausalChain(relations: DiscoveredRelation[]): boolean {
  if (relations.length < 2) return false
  for (let i = 0; i < relations.length - 1; i++) {
    // 检查是否存在连续链：relation[i].to === relation[i+1].from
    for (let j = i + 1; j < relations.length; j++) {
      if (relations[i].toObjectRef === relations[j].fromObjectRef) {
        return true
      }
    }
  }
  return false
}

// ============================================================================
// computeMissingLinks（纯函数，不使用 AI）
//
// 对比 Template.expectedRelations 和已发现的 discoveredRelations，
// 找出 Template 中预期存在但用户尚未发现的连接。
// ============================================================================

function computeMissingLinks(
  knownEntityIds: Set<string>,
  discoveredRelations: DiscoveredRelation[],
  template: UnderstandingTemplate,
): MissingLink[] {
  // 建立已发现关系的快速查找集
  const discoveredSet = new Set(
    discoveredRelations.map((r) => `${r.fromObjectRef}→${r.toObjectRef}`),
  )

  return template.expectedRelations
    .filter((er) => {
      // 两端都在 knownObjects 中 + 关系尚未被发现
      return (
        knownEntityIds.has(er.from) &&
        knownEntityIds.has(er.to) &&
        !discoveredSet.has(`${er.from}→${er.to}`)
      )
    })
    .map((er) => ({
      fromRef: er.from,
      toRef: er.to,
      expectedRelationType: er.type,
      templateRef: template.templateId,
    }))
}
