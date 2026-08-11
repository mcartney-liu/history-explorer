/**
 * M86.1 — Explorer Runtime Context
 *
 * Experience Runtime 的单一语义核心。
 * 定义用户理解状态的运行时表示 + 创建/读取/更新规则。
 *
 * EP-006: Context 是所有 Experience Layer 的唯一语义来源。
 * EP-007: Context is relational, not factual.
 * EP-008: Context 是理解状态的唯一权威。
 * EP-009: Context has semantic provenance — 所有语义必须来源于权威知识层。
 *
 * Batch 2 (M86.1.5~1.6): Anchor/Relation 语义数据模型升级。
 * - currentFocus/previousFocus: string → Anchor 对象（含 entityProvenance + selectionContext）
 * - relationReason: string|null → activeRelation: Relation|null（provenance object）
 * - 新增 anchorChain: Anchor[] + relationChain: Relation[]
 *
 * 本文件不修改任何现有组件——仅提供 Context 类型和 Provider。
 */

import { createContext, useContext, type ReactNode } from 'react'

// ============================================================================
// 认知阶段（对应 M85.12 Understanding Model 五层）
// ============================================================================

export type CognitiveStage =
  | 'FACT'          // 确认"这个东西是什么"
  | 'EXPLANATION'   // 理解"它为什么发生"
  | 'CONNECTION'    // 把碎片连成关系
  | 'UNDERSTANDING' // 形成"原来如此"
  | 'NEW_QUESTION'  // 产生新问题

// ============================================================================
// Batch 2: Semantic Anchor（理解锚点）
// M86.1.5~1.6: Anchor 不是 Entity 副本——通过 entityId 指向 Knowledge Layer。
// entityProvenance 与 selectionContext 分离（"对象是谁" ≠ "为什么现在看它"）。
// ============================================================================

export interface EntityProvenance {
  source: 'knowledge_layer'
  dataset?: string
  version?: string
}

export interface SelectionContext {
  source: 'curator_layer' | 'knowledge_layer' | 'user_search'
  reason?: string
}

export interface Anchor {
  entityId: string
  entityType: string
  displayName: string
  entityProvenance: EntityProvenance
  selectionContext: SelectionContext
  semanticRole?: string
}

// ============================================================================
// Batch 2: Relation（认知推进关系）
// M86.1.5~1.6: Relation 不是自由文本——保存 descriptionRef，
// 展示文本在渲染时从 Causal Layer 查询（EP-009）。
// ============================================================================

export interface RelationProvenance {
  source: 'causal_layer' | 'curator_layer'
  dataset?: string
  version?: string
}

export interface Relation {
  relationId: string
  fromEntityId: string
  toEntityId: string
  relationType: string          // causes | supports | influences | explains | precedes | contrasts
  provenance: RelationProvenance
  descriptionRef: string        // 渲染时从 Causal Layer 查询展示文本
}

// ============================================================================
// Explorer Runtime Context — 10 字段模型（Batch 2 最终版）
// ============================================================================

export interface ExplorerRuntimeContextValue {
  /** 一次理解旅程的标识 */
  explorationId: string | null

  /** 用户真正想理解的问题（来源：Curator 预写的 seed_topic 或用户输入） */
  userQuestion: string | null

  /** 这条线最终要帮用户理解什么（来源：Curator 预写的 exploration_goals） */
  understandingGoal: string | null

  /** Batch 2: 当前理解锚点（Anchor 对象，替代 Batch 1 的 currentFocus: string） */
  currentAnchor: Anchor | null

  /** Batch 2: 上一个理解锚点 */
  previousAnchor: Anchor | null

  /** Batch 2: 当前跳转关系（provenance object，替代 Batch 1 的 relationReason: string|null） */
  activeRelation: Relation | null

  /** Batch 2 新增: 锚点序列（供 Understanding Layer 和 Workspace 使用） */
  anchorChain: Anchor[]

  /** Batch 2 新增: 关系序列（与 anchorChain 配对，供 Understanding Layer 判定因果链） */
  relationChain: Relation[]

  /** 当前认知阶段（仅由 Understanding Layer 判定，不由 Navigation 写入） */
  cognitiveStage: CognitiveStage

  /** 理解结构中尚未闭合的缺口（来源：理解结构推导，非 AI 推荐） */
  unresolvedGap: string | null
}

// ============================================================================
// API 输入类型
// ============================================================================

export interface CreateContextInput {
  explorationId: string
  userQuestion: string
  understandingGoal: string
}

/** Batch 2: 更新锚点时传入 Anchor 对象 + 可选 Relation */
export interface UpdateAnchorInput {
  anchor: Anchor
  relation?: Relation | null
}

// ============================================================================
// API 接口
// ============================================================================

export interface ExplorerRuntimeContextApi {
  context: ExplorerRuntimeContextValue
  createContext: (input: CreateContextInput) => void
  updateAnchor: (input: UpdateAnchorInput) => void
  clearContext: () => void
}

// ============================================================================
// 初始空值（Batch 2: 字段升级 + anchorChain/relationChain 新增）
// ============================================================================

export const EMPTY_CONTEXT: ExplorerRuntimeContextValue = {
  explorationId: null,
  userQuestion: null,
  understandingGoal: null,
  currentAnchor: null,
  previousAnchor: null,
  activeRelation: null,
  anchorChain: [],
  relationChain: [],
  cognitiveStage: 'FACT',
  unresolvedGap: null,
}

// ============================================================================
// React Context
// ============================================================================

export const ExplorerRuntimeContext = createContext<ExplorerRuntimeContextApi>({
  context: EMPTY_CONTEXT,
  createContext: () => {},
  updateAnchor: () => {},
  clearContext: () => {},
})

export function useExplorerContext(): ExplorerRuntimeContextValue {
  return useContext(ExplorerRuntimeContext).context
}

export function useExplorerContextApi(): ExplorerRuntimeContextApi {
  return useContext(ExplorerRuntimeContext)
}

export interface ExplorerRuntimeProviderProps {
  children: ReactNode
  value: ExplorerRuntimeContextApi
}
