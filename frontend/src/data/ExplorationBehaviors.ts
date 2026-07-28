// ============================================================
// M48 — ExplorationBehaviors
// Detects behavioral patterns from UserBehaviorEvent sequences.
// Deterministic rules only. Zero AI. Zero backend. Zero UI.
//
// Naming: "Behaviors" not "Intent" because events tell us
// what users DO, not what they THINK.
// ============================================================

import type { UserBehaviorEvent } from './UserBehaviorEvent'

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export type ExplorationPattern =
  | 'comparison_research'
  | 'research_loop'
  | 'deep_exploration'
  | 'limited_exploration'
  | 'quick_lookup'
  | 'unknown'

export interface ExplorationBehaviors {
  /** Best-guess dominant behavioral pattern from event data. */
  dominantPattern: ExplorationPattern
  /** Rule confidence (0–1). Represents pattern match specificity, not psychological certainty. */
  confidence: number
  /** All patterns detected in the event sequence. */
  patterns: ExplorationPattern[]
  /** Human-readable behavioral insights derived from events. */
  insights: string[]
}

// -----------------------------------------------------------
// Pattern detection (order: most specific → least specific)
// -----------------------------------------------------------

function detectComparison(events: UserBehaviorEvent[]): boolean {
  return events.some((e) => e.action === 'start_comparison')
}

function detectResearchLoop(events: UserBehaviorEvent[]): boolean {
  const hasStart = events.some((e) => e.action === 'start_research')
  const hasSave = events.some((e) => e.action === 'save_research')
  const hasRestore = events.some((e) => e.action === 'restore_research')
  return (hasStart && hasSave) || hasRestore
}

function detectDeepExploration(events: UserBehaviorEvent[]): boolean {
  const hasJourney = events.some((e) => e.action === 'click_journey')
  const hasTab = events.some((e) => e.action === 'switch_tab')
  const hasChat = events.some((e) => e.action === 'start_chat')
  // Either a journey click, or tab exploration combined with chat
  return hasJourney || (hasTab && hasChat)
}

function detectLimitedExploration(events: UserBehaviorEvent[]): boolean {
  const hasEntity = events.some((e) => e.action === 'open_entity')
  const hasDeep = events.some((e) =>
    ['click_journey', 'start_chat', 'start_research', 'start_comparison'].includes(e.action),
  )
  // Opened an entity but did NO deeper behavior.
  // This is neutral — user may be satisfied or lost.
  return hasEntity && !hasDeep
}

function detectQuickLookup(events: UserBehaviorEvent[]): boolean {
  const hasEntity = events.some((e) => e.action === 'open_entity')
  const otherActions = events.filter((e) => e.action !== 'open_entity')
  return hasEntity && otherActions.length === 0
}

// -----------------------------------------------------------
// Confidence map
// -----------------------------------------------------------

const CONFIDENCE: Record<ExplorationPattern, number> = {
  comparison_research: 0.9,
  research_loop: 0.85,
  deep_exploration: 0.7,
  limited_exploration: 0.5,
  quick_lookup: 0.4,
  unknown: 0,
}

// -----------------------------------------------------------
// Insights
// -----------------------------------------------------------

function generateInsights(patterns: ExplorationPattern[]): string[] {
  const result: string[] = []
  if (patterns.includes('comparison_research')) {
    result.push('用户进行了多实体比较探索')
  }
  if (patterns.includes('research_loop')) {
    result.push('用户完成了研究闭环')
  }
  if (patterns.includes('deep_exploration')) {
    result.push('用户进行了深度探索行为')
  }
  if (patterns.includes('limited_exploration')) {
    result.push('用户停留在浅层探索阶段（可能是满足，也可能是困惑——无法从事件数据区分）')
  }
  if (patterns.includes('quick_lookup')) {
    result.push('用户进行了快速查阅后离开')
  }
  if (patterns.includes('unknown')) {
    result.push('暂无足够行为数据识别探索模式')
  }
  return result
}

// -----------------------------------------------------------
// Priority resolution
// -----------------------------------------------------------

const PATTERN_PRIORITY: ExplorationPattern[] = [
  'comparison_research',
  'research_loop',
  'deep_exploration',
  'quick_lookup',
  'limited_exploration',
  'unknown',
]

function resolveDominant(patterns: ExplorationPattern[]): ExplorationPattern {
  for (const p of PATTERN_PRIORITY) {
    if (patterns.includes(p)) return p
  }
  return 'unknown'
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

export function analyzeExplorationBehaviors(
  events: UserBehaviorEvent[],
): ExplorationBehaviors {
  if (events.length === 0) {
    return {
      dominantPattern: 'unknown',
      confidence: CONFIDENCE.unknown,
      patterns: ['unknown'],
      insights: generateInsights(['unknown']),
    }
  }

  const matched: ExplorationPattern[] = []

  if (detectComparison(events)) matched.push('comparison_research')
  if (detectResearchLoop(events)) matched.push('research_loop')
  if (detectDeepExploration(events)) matched.push('deep_exploration')
  if (detectLimitedExploration(events)) matched.push('limited_exploration')
  if (detectQuickLookup(events)) matched.push('quick_lookup')

  if (matched.length === 0) matched.push('unknown')

  const dominant = resolveDominant(matched)

  return {
    dominantPattern: dominant,
    confidence: CONFIDENCE[dominant],
    patterns: matched,
    insights: generateInsights(matched),
  }
}
