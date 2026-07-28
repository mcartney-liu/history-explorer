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
import { analyzeExplorationBehaviors } from './ExplorationBehaviors'
import type { ExplorationBehaviors } from './ExplorationBehaviors'
import { analyzeExplorationDepth } from './ExplorationDepth'
import type { ExplorationDepth } from './ExplorationDepth'
import { analyzeKnowledgeUsageCoverage } from './KnowledgeUsageCoverage'
import type { KnowledgeUsageCoverage } from './KnowledgeUsageCoverage'
import { generateProductDecisionInsight } from './ProductDecisionInsight'
import type { ProductDecisionInsight } from './ProductDecisionInsight'

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export interface ProductUsageAnalysis {
  funnelMetrics: FunnelMetric[]
  intelligence: ProductIntelligence
  priority: OptimizationPriority
  capabilityHealth: CapabilityHealth[]
  explorationBehaviors: ExplorationBehaviors
  explorationDepth: ExplorationDepth
  knowledgeUsageCoverage: KnowledgeUsageCoverage
  decisionInsight: ProductDecisionInsight
  summary: string
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

export function analyzeProductUsage(
  events: UserBehaviorEvent[],
): ProductUsageAnalysis {
  const funnelMetrics = allFunnelMetrics(events)
  const intelligence = generateProductIntelligence(events)
  const decision = generateDecisionIntelligence(intelligence, funnelMetrics)
  const explorationBehaviors = analyzeExplorationBehaviors(events)
  const explorationDepth = analyzeExplorationDepth(events)
  const knowledgeUsageCoverage = analyzeKnowledgeUsageCoverage(events)
  const decisionInsight = generateProductDecisionInsight({
    funnels: funnelMetrics,
    intelligence,
    priority: decision.priority,
    capabilityHealth: decision.capabilityHealth,
    behaviors: explorationBehaviors,
    depth: explorationDepth,
    knowledge: knowledgeUsageCoverage,
  })
  const summary = buildSummary(funnelMetrics, intelligence, decision, explorationBehaviors, explorationDepth, knowledgeUsageCoverage, decisionInsight)

  return {
    funnelMetrics,
    intelligence,
    priority: decision.priority,
    capabilityHealth: decision.capabilityHealth,
    explorationBehaviors,
    explorationDepth,
    knowledgeUsageCoverage,
    decisionInsight,
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
  eb: ExplorationBehaviors,
  ed: ExplorationDepth,
  kc: KnowledgeUsageCoverage,
  di: ProductDecisionInsight,
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

  // M48: Exploration behaviors
  lines.push(`[行为模式] 主要模式: ${eb.dominantPattern}  置信度: ${Math.round(eb.confidence * 100)}%${eb.insights.length > 0 ? `  洞察: ${eb.insights[0]}` : ''}`)

  // M49: Exploration depth
  lines.push(`[探索深度] 最高等级: ${ed.maxDepth}  ${ed.insights[0]}`)

  // M50: Knowledge usage coverage
  const totalEntities = kc.exploredEntityTypes.length + kc.unexploredEntityTypes.length
  if (kc.relationshipDataAvailable) {
    const totalRelations = kc.exploredRelationshipTypes.length + kc.unexploredRelationshipTypes.length
    lines.push(`[知识使用] 实际触达实体类型: ${kc.exploredEntityTypes.length}/${totalEntities}, 关系类型: ${kc.exploredRelationshipTypes.length}/${totalRelations}`)
  } else {
    lines.push(`[知识使用] 实际触达实体类型: ${kc.exploredEntityTypes.length}/${totalEntities}, 关系使用数据不可用`)
  }

  // M52: Decision fusion
  lines.push(`[决策] 状态: ${di.overallStatus}  置信度: ${Math.round(di.confidence * 100)}%`)
  if (di.primaryIssue) {
    lines.push(`[决策] 首要问题: ${di.primaryIssue.problem}`)
    lines.push(`[决策] 建议: ${di.recommendedAction.action}`)
  } else {
    lines.push('[决策] 当前无紧急产品问题')
  }

  return lines.join('\n')
}

// ============================================================
// M51 — DevTools console entry point
// Exposes `__pa()` in browser console to run the full
// intelligence pipeline on current localStorage events.
// Tree-shaken from production builds (never imported by UI).
// ============================================================

if (typeof window !== 'undefined') {
  ;(window as any).__pa = function __pa() {
    const raw = localStorage.getItem('history-explorer.events.v1')
    if (!raw) { console.log('[pa] No events in localStorage yet. Use the product first — browse entities, start research, chat with AI.'); return }
    try {
      const events = JSON.parse(raw)
      const result = analyzeProductUsage(events)
      console.log('[pa] Product Usage Analysis Summary:\n' + result.summary)
      console.log('[pa] Full result:', result)
      return result
    } catch (e) {
      console.error('[pa] Failed to parse events:', e)
    }
  }
  console.log('[pa] DevTools ready. Type __pa() in console to analyze product usage.')

  // M53: Auto-activation — watches for events and triggers pipeline
  import('./ProductIntelligenceActivation').then(({ shouldActivatePipeline }) => {
    let _autoInterval: ReturnType<typeof setInterval> | null = null
    function tryActivate() {
      const raw = localStorage.getItem('history-explorer.events.v1')
      if (!raw) return
      try {
        const events = JSON.parse(raw)
        const decision = shouldActivatePipeline(events)
        if (decision.shouldActivate) {
          const result = analyzeProductUsage(events)
          const di = result.decisionInsight
          console.log(`[Product Intelligence] (reason: ${decision.reason}) status: ${di.overallStatus}`)
          if (di.primaryIssue) {
            console.log(`[Product Intelligence] issue: ${di.primaryIssue.problem}`)
            console.log(`[Product Intelligence] action: ${di.recommendedAction.action}`)
            console.log(`[Product Intelligence] confidence: ${Math.round(di.confidence * 100)}%`)
          }
        }
      } catch (_) { /* silent */ }
    }
    ;(window as any).__pa_start = () => {
      if (_autoInterval) return
      _autoInterval = setInterval(tryActivate, 15_000)
      console.log('[pa] Auto-activation started. Pipeline runs on save_research or 5+ events.')
    }
    ;(window as any).__pa_stop = () => {
      if (_autoInterval) { clearInterval(_autoInterval); _autoInterval = null }
    }
    // Auto-start on load
    tryActivate()
  })
}
