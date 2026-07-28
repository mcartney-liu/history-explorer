// ============================================================
// M49 — ExplorationDepth
// Scores user exploration depth from event sequences.
// Deterministic rules. Zero AI. Zero backend. Zero UI.
//
// Answers: "How deep did the user go?"
// Not: "What exact path did the user take?"
// ============================================================

import type { UserBehaviorEvent } from './UserBehaviorEvent'

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export interface DepthDistribution {
  level0: number
  level1: number
  level2: number
  level3: number
  level4: number
  level5: number
}

export interface ExplorationDepth {
  /** Highest depth level reached (0–5). */
  maxDepth: number
  /** Distribution of depth levels across all events in this batch. */
  depthDistribution: DepthDistribution
  /** Human-readable insights. */
  insights: string[]
}

// -----------------------------------------------------------
// Depth detection
// -----------------------------------------------------------

function computeDepth(events: UserBehaviorEvent[]): number {
  const actions = new Set(events.map((e) => e.action))

  // Level 5: Deep — comparison or complete research loop
  if (actions.has('start_comparison')) return 5
  if (actions.has('start_research') && actions.has('save_research')) return 5

  // Level 4: Research — any research action
  if (actions.has('start_research') || actions.has('save_research') || actions.has('restore_research')) return 4

  // Level 3: Explore — journey or AI chat
  if (actions.has('click_journey') || actions.has('start_chat')) return 3

  // Level 2: Browse — entity open + tab switch
  if (actions.has('open_entity') && actions.has('switch_tab')) return 2

  // Level 1: Surface — discover or entity open, but nothing deeper
  if (actions.has('open_discover') || actions.has('open_entity')) return 1

  // Level 0: None
  return 0
}

// -----------------------------------------------------------
// Insights
// -----------------------------------------------------------

const DEPTH_LABELS: Record<number, string> = {
  0: '暂无探索行为',
  1: '用户停留在表层浏览',
  2: '用户进行了基础页面浏览',
  3: '用户进行了主动探索',
  4: '用户进入了研究行为',
  5: '用户进行了深度研究行为',
}

function generateInsights(maxDepth: number): string[] {
  const insights: string[] = [DEPTH_LABELS[maxDepth] ?? DEPTH_LABELS[0]]

  if (maxDepth >= 3) {
    insights.push('用户展现主动探索意愿')
  }
  if (maxDepth >= 4) {
    insights.push('用户利用研究功能进行深入学习')
  }
  if (maxDepth === 5) {
    insights.push('用户完成高级探索行为（对比分析或研究闭环）')
  }
  return insights
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

export function analyzeExplorationDepth(
  events: UserBehaviorEvent[],
): ExplorationDepth {
  const maxDepth = computeDepth(events)

  return {
    maxDepth,
    depthDistribution: {
      level0: maxDepth === 0 ? 1 : 0,
      level1: maxDepth === 1 ? 1 : 0,
      level2: maxDepth === 2 ? 1 : 0,
      level3: maxDepth === 3 ? 1 : 0,
      level4: maxDepth === 4 ? 1 : 0,
      level5: maxDepth === 5 ? 1 : 0,
    },
    insights: generateInsights(maxDepth),
  }
}
