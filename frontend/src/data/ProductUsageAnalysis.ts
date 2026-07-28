// ============================================================
// M46 Phase 3 — ProductUsageAnalysis
// M47: integrated OptimizationPriority + CapabilityHealth.
// Unified entry point: combines ExplorationFunnelAnalysis,
// ProductIntelligence, and DecisionIntelligence.
// Delegates to existing functions — zero duplication.
// Zero AI. Zero UI. Zero backend.
// ============================================================

import type { UserBehaviorEvent } from './UserBehaviorEvent'
import { allFunnelMetrics, type FunnelMetric } from './ExplorationFunnelAnalysis'
import { generateProductIntelligence, intelligenceSummary } from './ProductIntelligence'
import type { ProductIntelligence } from './ProductIntelligence'
import { generateDecisionIntelligence } from './OptimizationPriority'
import type { OptimizationPriority, CapabilityHealth } from './OptimizationPriority'

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export interface ProductUsageAnalysis {
  funnelMetrics: FunnelMetric[]
  intelligence: ProductIntelligence
  priority: OptimizationPriority
  capabilityHealth: CapabilityHealth[]
  summary: string
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

export function analyzeProductUsage(
  events: UserBehaviorEvent[],
): ProductUsageAnalysis {
  const funnelMetrics = allFunnelMetrics()
  const intelligence = generateProductIntelligence(events)
  const decision = generateDecisionIntelligence(intelligence, funnelMetrics)
  const summary = buildSummary(funnelMetrics, intelligence, decision)

  return {
    funnelMetrics,
    intelligence,
    priority: decision.priority,
    capabilityHealth: decision.capabilityHealth,
    summary,
  }
}

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function buildSummary(
  funnels: FunnelMetric[],
  pi: ProductIntelligence,
  decision: { priority: OptimizationPriority; capabilityHealth: CapabilityHealth[] },
): string {
  const lines: string[] = []

  // Event volume
  lines.push(`[基础] 事件: ${pi.totalEvents}, 会话: ${pi.sessions}`)

  // Funnel health
  for (const f of funnels) {
    lines.push(`[${f.name}] 转化率: ${Math.round(f.overallConversionRate * 100)}%${f.bottleneckSteps.length > 0 ? ` 瓶颈: ${f.bottleneckSteps.join(', ')}` : ''}`)
  }

  // Engagement
  lines.push(`[互动] AI对话采用: ${Math.round(pi.chatAdoptionRate * 100)}%, 研究保存: ${Math.round(pi.researchSaveRate * 100)}%`)
  if (pi.mostUsedTab) lines.push(`[信息] 最常用Tab: ${pi.mostUsedTab}`)

  // Drop-off & unused
  if (pi.dropOffPoints.length > 0) {
    lines.push(`[流失] ${pi.dropOffPoints.length}个终止点: ${pi.dropOffPoints.map((d) => `${d.funnel}@${d.step}`).join(', ')}`)
  }
  if (pi.unusedCapabilities.length > 0) {
    lines.push(`[未用] ${pi.unusedCapabilities.length}项能���未被使用: ${pi.unusedCapabilities.slice(0, 3).join('、')}`)
  }

  // M47: Decision intelligence
  lines.push(`[优先] 下一步优化: ${decision.priority.topRecommendation.capability} (${decision.priority.topRecommendation.severity})`)
  const criticals = decision.capabilityHealth.filter((c) => c.severity === 'critical')
  if (criticals.length > 0) {
    lines.push(`[风险] ${criticals.length}项能力处于critical: ${criticals.map((c) => c.capability).join(', ')}`)
  }

  return lines.join('\n')
}
