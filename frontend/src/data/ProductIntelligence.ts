// M46 Phase 2 — ProductIntelligence extended
// Added: dropOffPoints, chatAdoptionRate, unusedCapabilities.
// ============================================================

import type { UserBehaviorEvent, BehaviorAction } from './UserBehaviorEvent'

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export interface DropOffPoint {
  funnel: string
  step: string
  reached: number
  nextStep: string
}

export interface ProductIntelligence {
  totalEvents: number
  sessions: number
  discoveryToEntityRate: number
  exploreEngagementRate: number
  researchSaveRate: number
  chatAdoptionRate: number
  mostUsedTab: string | null
  mostExploredTypes: string[]
  dropOffPoints: DropOffPoint[]
  unusedCapabilities: string[]
  recommendations: string[]
}

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function countAction(events: UserBehaviorEvent[], action: BehaviorAction): number {
  return events.filter((e) => e.action === action).length
}

function sessionCount(events: UserBehaviorEvent[]): number {
  if (events.length < 2) return events.length
  let sessions = 1
  for (let i = 1; i < events.length; i++) {
    const prev = new Date(events[i - 1].timestamp).getTime()
    const curr = new Date(events[i].timestamp).getTime()
    if (curr - prev > 30 * 60 * 1000) sessions++
  }
  return sessions
}

function rate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Math.round((numerator / denominator) * 100) / 100
}

function mostUsedTab(events: UserBehaviorEvent[]): string | null {
  const map = new Map<string, number>()
  for (const e of events) {
    if (e.action === 'switch_tab' && e.tab) {
      map.set(e.tab, (map.get(e.tab) ?? 0) + 1)
    }
  }
  if (map.size === 0) return null
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

function mostExploredTypes(events: UserBehaviorEvent[]): string[] {
  const map = new Map<string, number>()
  for (const e of events) {
    if (e.entityType) map.set(e.entityType, (map.get(e.entityType) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k)
}

function generateRecommendations(
  events: UserBehaviorEvent[],
  discoveryRate: number,
  engagementRate: number,
  saveRate: number,
): string[] {
  const recs: string[] = []
  const hasClick = events.some((e) => e.action === 'click_entity')
  const hasTabSwitch = events.some((e) => e.action === 'switch_tab')
  const hasSave = events.some((e) => e.action === 'save_research')
  const hasCompare = events.some((e) => e.action === 'start_comparison')
  const hasChat = events.some((e) => e.action === 'start_chat')

  if (!hasClick) {
    recs.push('用户进入 Discover 后没有打开实体，探索入口需要优化')
  }
  if (!hasTabSwitch) {
    recs.push('用户进入 EntityPage 后没有继续探索，Tab 引导可能不够明确')
  }
  if (!hasSave) {
    recs.push('研究完成后用户没有保存结果，保存提示可能需要更突出')
  }
  if (!hasCompare) {
    recs.push('多实体比较能力可能未被发现，研究 tab 应引导比较操作')
  }
  if (!hasChat) {
    recs.push('AI 历史学家对话尚未被使用，探索 tab 入口可更显著')
  }
  return recs.length > 0 ? recs : ['所有关键探索路径都已被使用']
}

// -----------------------------------------------------------
// M46 Phase 2 — New analysis functions
// -----------------------------------------------------------

/** Find steps where user stopped in each funnel. */
function findDropOffPoints(events: UserBehaviorEvent[]): DropOffPoint[] {
  const results: DropOffPoint[] = []

  // Discovery: open_discover → click_entity → open_entity
  if (events.some((e) => e.action === 'open_discover')) {
    if (!events.some((e) => e.action === 'click_entity')) {
      results.push({
        funnel: 'Discovery', step: 'open_discover', reached: 1, nextStep: 'click_entity',
      })
    } else if (!events.some((e) => e.action === 'open_entity')) {
      results.push({
        funnel: 'Discovery', step: 'click_entity', reached: 1, nextStep: 'open_entity',
      })
    }
  }

  // Exploration: only flag if user actively explored (switch_tab) but didn't complete
  if (events.some((e) => e.action === 'switch_tab')) {
    if (!events.some((e) => e.action === 'click_journey')) {
      results.push({
        funnel: 'Exploration', step: 'switch_tab', reached: 1, nextStep: 'click_journey',
      })
    }
  }

  // Research: start → save → restore → compare
  if (events.some((e) => e.action === 'start_research')) {
    if (!events.some((e) => e.action === 'save_research')) {
      results.push({
        funnel: 'Research', step: 'start_research', reached: 1, nextStep: 'save_research',
      })
    } else if (!events.some((e) => e.action === 'restore_research')) {
      results.push({
        funnel: 'Research', step: 'save_research', reached: 1, nextStep: 'restore_research',
      })
    } else if (!events.some((e) => e.action === 'start_comparison')) {
      results.push({
        funnel: 'Research', step: 'restore_research', reached: 1, nextStep: 'start_comparison',
      })
    }
  }

  return results
}

/** Chat adoption: start_chat / open_entity. */
function chatAdoptionRate(events: UserBehaviorEvent[]): number {
  return rate(
    countAction(events, 'start_chat' as BehaviorAction),
    countAction(events, 'open_entity' as BehaviorAction),
  )
}

/** Detect capabilities that exist in the event type system but were never used. */
function unusedCapabilities(events: UserBehaviorEvent[]): string[] {
  const actions = new Set(events.map((e) => e.action))
  const unused: string[] = []

  if (!actions.has('start_chat')) unused.push('AI 历史学家对话')
  if (!actions.has('save_research')) unused.push('研究结果保存')
  if (!actions.has('restore_research')) unused.push('研究恢复回顾')
  if (!actions.has('start_comparison')) unused.push('多实体对比研究')
  if (!actions.has('click_journey')) unused.push('历史旅程探索')
  if (!actions.has('switch_tab')) unused.push('Tab 页面切换')
  if (!actions.has('click_entity')) unused.push('从首页进入实体')

  return unused
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

export function generateProductIntelligence(
  events: UserBehaviorEvent[],
): ProductIntelligence {
  const totalEvents = events.length
  const sessions = sessionCount(events)
  const discoveryToEntityRate = rate(
    countAction(events, 'click_entity'),
    countAction(events, 'open_discover'),
  )
  const exploreActions = countAction(events, 'switch_tab')
    + countAction(events, 'click_journey')
    + countAction(events, 'start_chat')
  const exploreEngagementRate = totalEvents > 0
    ? rate(exploreActions, totalEvents)
    : 0
  const researchSaveRate = rate(
    countAction(events, 'save_research'),
    countAction(events, 'start_research'),
  )
  const tab = mostUsedTab(events)
  const types = mostExploredTypes(events)
  const recommendations = generateRecommendations(
    events, discoveryToEntityRate, exploreEngagementRate, researchSaveRate,
  )
  const dropOffPoints = findDropOffPoints(events)
  const chatAdoption = chatAdoptionRate(events)
  const unused = unusedCapabilities(events)

  return {
    totalEvents,
    sessions,
    discoveryToEntityRate,
    exploreEngagementRate,
    researchSaveRate,
    chatAdoptionRate: chatAdoption,
    mostUsedTab: tab,
    mostExploredTypes: types,
    dropOffPoints,
    unusedCapabilities: unused,
    recommendations,
  }
}

/** Human-readable summary for debugging. */
export function intelligenceSummary(pi: ProductIntelligence): string {
  return [
    `Events: ${pi.totalEvents} (${pi.sessions} sessions)`,
    `Discovery → Entity: ${Math.round(pi.discoveryToEntityRate * 100)}%`,
    `Exploration engagement: ${Math.round(pi.exploreEngagementRate * 100)}%`,
    `Research save rate: ${Math.round(pi.researchSaveRate * 100)}%`,
    pi.mostUsedTab ? `Most used tab: ${pi.mostUsedTab}` : 'No tab data',
    `Recommendations: ${pi.recommendations.length}`,
  ].join('\n')
}
