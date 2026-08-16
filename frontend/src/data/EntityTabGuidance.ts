// ============================================================
// M44 Phase 2 — EntityTabGuidance
// Guidance copy for each EntityPage tab.
// Helps users understand what each tab does before clicking in.
// Zero AI. Purely presentational.
//
// ADR-0021 R2 — the title / description / recommended actions are now
// editable at runtime through the Content Configuration Layer
// (#/admin, module `entity_tabs`). `TAB_GUIDANCE` below stays the
// shipped default (fallback tier ②): it is what renders with no
// backend, and what the unit tests assert against. `guidanceFor()`
// overlays whatever has been configured on top of it.
//
// Consumers that should reflect an edit without a reload subscribe via
// `useContentRevision()` (see EntityPageShell).
// ============================================================

import type { EntityTab } from '../components/EntityPageShell'
import { slotDesc, slotItems, slotTitle } from './contentRuntime'

export interface TabGuidance {
  id: EntityTab
  title: string
  description: string
  userGoal: string
  recommendedActions: string[]
}

export const TAB_GUIDANCE: Record<EntityTab, TabGuidance> = {
  info: {
    id: 'info',
    title: '了解基本事实',
    description: '查看实体的基本信息、关系网络、时间线和知识图谱。',
    userGoal: '快速了解这是什么',
    recommendedActions: ['浏览关系图', '查看时间线', '阅读叙事先导'],
  },
  explore: {
    id: 'explore',
    title: '探索历史关系',
    description: '通过人物、事件、文明之间的关联继续发现新的历史路径。你也可以向 AI 历史学家提问——每个回答都有事实溯源。',
    userGoal: '我想继续探索这个主题',
    recommendedActions: ['查看系统推荐', '开启历史旅程', '与 AI 历史学家对话'],
  },
  research: {
    id: 'research',
    title: '深入研究',
    description: '生成结构化研究内容，支持多维度分析和多实体对比，结果可保存回顾。',
    userGoal: '我想系统研究这个主题',
    recommendedActions: ['启动 4 维度分析', '添加比较对象', '保存研究结果'],
  },
  analyze: {
    id: 'analyze',
    title: '理解原因与影响',
    description: '使用事件因果链、AI 解释和叙事卡片深入理解历史事件的前因后果。',
    userGoal: '我想知道为什么',
    recommendedActions: ['查看因果链', '使用 AI 解释', '阅读事件叙事'],
  },
  ai: {
    id: 'ai',
    title: '与 AI 历史学家对话',
    description: '向对话式历史学家自由提问——每个回答都带有事实溯源，帮你从任意角度深入理解这个实体。',
    userGoal: '我想自由追问',
    recommendedActions: ['向历史学家提问', '要求引用来源', '追问为什么'],
  },
}

/** Registry slot backing a tab, e.g. `explore` -> `entity_tabs.explore`. */
export function tabSlotId(tab: EntityTab): string {
  return `entity_tabs.${tab}`
}

/**
 * Guidance for a tab: configured copy where it exists, shipped copy otherwise.
 *
 * `userGoal` is intentionally NOT configurable — it is an internal label for
 * the tab's intent, never rendered, so exposing it in the console would be
 * noise with no visible effect.
 */
export function guidanceFor(tab: EntityTab): TabGuidance {
  const base = TAB_GUIDANCE[tab]
  const slot = tabSlotId(tab)
  return {
    ...base,
    title: slotTitle(slot, base.title),
    description: slotDesc(slot, base.description),
    recommendedActions: [...slotItems(slot, base.recommendedActions)],
  }
}
