// ============================================================
// M44 Phase 2 — EntityTabGuidance
// Static guidance data for each EntityPage tab.
// Helps users understand what each tab does before clicking in.
// Zero AI. Zero backend. Purely presentational.
// ============================================================

import type { EntityTab } from '../components/EntityPageShell'

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
    description: '通过人物、事件、文明之间的关联继续发现新的历史路径。你也可以向 AI 历史学���提问——每个回答都有事实溯源。',
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
  extensions: {
    id: 'extensions',
    title: '扩展功能',
    description: '更多功能即将推出。包括 AI 内容创作、教育模块和社交探索。',
    userGoal: '探索更多可能',
    recommendedActions: ['敬请期待'],
  },
}

export function guidanceFor(tab: EntityTab): TabGuidance {
  return TAB_GUIDANCE[tab]
}
