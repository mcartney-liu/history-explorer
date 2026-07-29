// ============================================================
// M43 Phase 4 — ExplorationFunnelAnalysis
// Analyzes UserBehaviorEvent data to compute funnel metrics,
// conversion rates, and blocker detection. Pure functions.
//
// Domain Boundary: Platform Capability. Funnels are defined
// by event sequences, not by history-specific content.
// Zero AI. Zero backend. Zero UI impact.
// ============================================================

import { getEvents, type UserBehaviorEvent } from './UserBehaviorEvent'

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export interface FunnelStep {
  /** Step name for display. */
  label: string
  /** Event action that represents this step. */
  action: string
  /** Number of users who reached this step. */
  entered: number
  /** Number of users who proceeded to the next step. */
  completed: number
}

export interface FunnelMetric {
  /** Funnel identifier. */
  name: string
  /** Steps in order. */
  steps: FunnelStep[]
  /** Overall conversion: last step entered / first step entered. */
  overallConversionRate: number
  /** Steps where drop-off is highest (percentage loss). */
  bottleneckSteps: string[]
}

// -----------------------------------------------------------
// Step definitions
// -----------------------------------------------------------

const DISCOVERY_STEPS = [
  { label: '打开首页', action: 'open_discover' },
  { label: '点击实体', action: 'click_entity' },
  { label: '进入实体', action: 'open_entity' },
]

const EXPLORATION_STEPS = [
  { label: '进入实体', action: 'open_entity' },
  { label: 'Tab 切换/关系点击/对话启动', action: 'any_explore', // composite
    matchActions: ['switch_tab', 'click_relationship', 'click_journey', 'start_chat'] },
  { label: '继续旅程', action: 'click_journey' },
]

const RESEARCH_STEPS = [
  { label: '开始研究', action: 'start_research' },
  { label: '保存研究', action: 'save_research' },
  { label: '恢复研究', action: 'restore_research' },
  { label: '开始比较', action: 'start_comparison' },
]

// -----------------------------------------------------------
// Core Analysis
// -----------------------------------------------------------

function hasAction(events: UserBehaviorEvent[], action: string, matchActions?: string[]): boolean {
  if (matchActions) return events.some((e) => matchActions.includes(e.action))
  return events.some((e) => e.action === action)
}

function buildFunnel(
  name: string,
  stepDefs: { label: string; action: string; matchActions?: string[] }[],
  events: UserBehaviorEvent[],
): FunnelMetric {
  const steps: FunnelStep[] = []

  for (let i = 0; i < stepDefs.length; i++) {
    const def = stepDefs[i]
    const entered = hasAction(events, def.action, def.matchActions)
    const completed =
      i + 1 < stepDefs.length
        ? hasAction(events, stepDefs[i + 1].action, stepDefs[i + 1].matchActions)
        : entered // last step: completed = entered

    steps.push({
      label: def.label,
      action: def.action,
      entered: entered ? 1 : 0,
      completed: completed ? 1 : 0,
    })

    if (i > 0 && steps[i - 1].entered > 0 && !entered) {
      // previous step had entered but this step did not
    }
  }

  const firstEntered = steps[0]?.entered ?? 0
  const lastEntered = steps[steps.length - 1]?.entered ?? 0
  const overallConversionRate = firstEntered > 0 ? lastEntered / firstEntered : 0

  // Bottleneck: steps where entered but not completed
  const bottleneckSteps = steps
    .filter((s) => s.entered > 0 && s.completed === 0)
    .map((s) => s.label)

  return { name, steps, overallConversionRate, bottleneckSteps }
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

export function analyzeDiscoveryFunnel(): FunnelMetric {
  return buildFunnel('Discovery', DISCOVERY_STEPS, _eventOverride ?? getEvents())
}

export function analyzeExplorationFunnel(): FunnelMetric {
  return buildFunnel('Exploration', EXPLORATION_STEPS, _eventOverride ?? getEvents())
}

export function analyzeResearchFunnel(): FunnelMetric {
  return buildFunnel('Research', RESEARCH_STEPS, _eventOverride ?? getEvents())
}

// M55: allow external event source override for pipeline alignment.
let _eventOverride: UserBehaviorEvent[] | null = null

export function allFunnelMetrics(events?: UserBehaviorEvent[]): FunnelMetric[] {
  if (events) _eventOverride = events
  try {
    return [
      analyzeDiscoveryFunnel(),
      analyzeExplorationFunnel(),
      analyzeResearchFunnel(),
    ]
  } finally {
    _eventOverride = null
  }
}

export function funnelSummaryText(): string {
  const metrics = allFunnelMetrics()
  return metrics
    .map((m) => {
      const conv = `${Math.round(m.overallConversionRate * 100)}%`
      const blocks = m.bottleneckSteps.length > 0
        ? ` bottlenecks: ${m.bottleneckSteps.join(', ')}`
        : ''
      return `${m.name}: ${m.steps.length} steps, conversion ${conv}${blocks}`
    })
    .join('\n')
}

// -----------------------------------------------------------
// Alternative: session-based funnel for testability
// -----------------------------------------------------------

export function analyzeFunnelFromEvents(
  name: string,
  steps: string[],
  events: UserBehaviorEvent[],
): FunnelMetric {
  const stepDefs = steps.map((s, i) => ({
    label: `Step ${i + 1}: ${s}`,
    action: s,
  }))
  return buildFunnel(name, stepDefs, events)
}
