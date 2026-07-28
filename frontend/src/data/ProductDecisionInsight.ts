// ============================================================
// M52 — ProductDecisionInsight
// Fusion layer: converts 6 independent intelligence outputs
// into 1 explainable product decision.
// Deterministic rules only. Zero AI. Zero backend. Zero UI.
// ============================================================

import type { FunnelMetric } from './ExplorationFunnelAnalysis'
import type { ProductIntelligence } from './ProductIntelligence'
import type { OptimizationPriority, CapabilityHealth } from './OptimizationPriority'
import type { ExplorationBehaviors } from './ExplorationBehaviors'
import type { ExplorationDepth } from './ExplorationDepth'
import type { KnowledgeUsageCoverage } from './KnowledgeUsageCoverage'

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export interface ProductDecisionInsight {
  overallStatus: 'healthy' | 'attention' | 'critical'
  primaryIssue: {
    capability: string
    problem: string
    severity: 'critical' | 'warning'
  } | null
  recommendedAction: {
    action: string
    reason: string
  }
  evidence: {
    sourceModules: string[]
    keyMetrics: Record<string, string | number>
    eventCount: number
  }
  /** Evidence completeness (0–1). NOT prediction probability. */
  confidence: number
  summary: string
  concerns: Array<{
    level: 'critical' | 'warning'
    module: string
    description: string
  }>
  positives: string[]
}

// -----------------------------------------------------------
// Input types
// -----------------------------------------------------------

export interface DecisionFusionInput {
  funnels: FunnelMetric[]
  intelligence: ProductIntelligence
  priority: OptimizationPriority
  capabilityHealth: CapabilityHealth[]
  behaviors: ExplorationBehaviors
  depth: ExplorationDepth
  knowledge: KnowledgeUsageCoverage
}

// -----------------------------------------------------------
// Fusion
// -----------------------------------------------------------

export function generateProductDecisionInsight(
  input: DecisionFusionInput,
): ProductDecisionInsight {
  const concerns = gatherConcerns(input)
  const positives = gatherPositives(input)
  const primary = selectPrimary(concerns, input)
  const action = buildAction(primary, input)
  const confidence = computeConfidence(input, concerns.length)
  const summary = buildSummary(primary, positives, input)
  const evidenceMetrics = buildMetrics(input)

  return {
    overallStatus: determineStatus(primary, concerns, input),
    primaryIssue: primary,
    recommendedAction: action,
    evidence: {
      sourceModules: concerns.map((c) => c.module),
      keyMetrics: evidenceMetrics,
      eventCount: input.intelligence.totalEvents,
    },
    confidence,
    summary,
    concerns,
    positives,
  }
}

// -----------------------------------------------------------
// Concerns
// -----------------------------------------------------------

function gatherConcerns(input: DecisionFusionInput): ProductDecisionInsight['concerns'] {
  const result: ProductDecisionInsight['concerns'] = []

  // 1. Validated priority recommendation
  const top = input.priority.topRecommendation
  if (top.severity === 'critical' || top.severity === 'warning') {
    const validated = validatePriorityRecommendation(top, input)
    if (validated) {
      result.push({
        level: top.severity,
        module: 'OptimizationPriority',
        description: top.reason,
      })
    }
  }

  // 2. CapabilityHealth critical/warning
  for (const cap of input.capabilityHealth) {
    if (cap.severity === 'critical' || cap.severity === 'warning') {
      result.push({
        level: cap.severity,
        module: 'CapabilityHealth',
        description: `${cap.capability}: ${cap.gapDescription}`,
      })
    }
  }

  // 3. Funnel bottlenecks
  for (const f of input.funnels) {
    if (f.bottleneckSteps.length > 0) {
      result.push({
        level: 'warning',
        module: 'FunnelAnalysis',
        description: `${f.name} bottleneck: ${f.bottleneckSteps.join(', ')}`,
      })
    }
  }

  // 4. Behavior-depth inconsistency
  if (input.depth.maxDepth >= 4 && input.behaviors.dominantPattern === 'quick_lookup') {
    result.push({
      level: 'warning',
      module: 'CrossModule',
      description: `depth=${input.depth.maxDepth} but behavior=quick_lookup — possible data inconsistency`,
    })
  }

  // 5. Knowledge limitation
  if (!input.knowledge.relationshipDataAvailable) {
    result.push({
      level: 'warning',
      module: 'KnowledgeCoverage',
      description: 'Relationship usage data unavailable — knowledge coverage incomplete',
    })
  }

  return result
}

// -----------------------------------------------------------
// Positives
// -----------------------------------------------------------

function gatherPositives(input: DecisionFusionInput): string[] {
  const result: string[] = []
  for (const cap of input.capabilityHealth) {
    if (cap.severity === 'healthy') {
      result.push(`${cap.capability} is healthy`)
    }
  }
  if (input.intelligence.totalEvents === 0) {
    result.push('No data yet — waiting for first user session')
  }
  if (result.length === 0) {
    result.push('System running, awaiting more user data')
  }
  return result
}

// -----------------------------------------------------------
// Primary issue selection
// -----------------------------------------------------------

function selectPrimary(
  concerns: ProductDecisionInsight['concerns'],
  input: DecisionFusionInput,
): ProductDecisionInsight['primaryIssue'] {
  if (input.intelligence.totalEvents === 0) return null

  // Priority candidates need supporting evidence
  const priorityConcern = concerns.find((c) => c.module === 'OptimizationPriority')
  const otherConcernCount = concerns.filter((c) => c.module !== 'OptimizationPriority').length
  const hasSupportingEvidence = otherConcernCount >= 1 || input.intelligence.totalEvents >= 3

  if (priorityConcern && !hasSupportingEvidence) {
    // Keep in concerns but don't promote to primaryIssue
    // (concern is already added by gatherConcerns)
  }

  // Find the first critical concern with enough backing
  const candidate = concerns.find((c) => c.level === 'critical')
  if (!candidate) return null

  // If candidate is from OptimizationPriority, require validation
  if (candidate.module === 'OptimizationPriority' && !hasSupportingEvidence) {
    return null
  }

  const cap = input.priority.topRecommendation.capability
  return {
    capability: candidate.module === 'OptimizationPriority' ? cap : candidate.module,
    problem: candidate.description,
    severity: candidate.level,
  }
}

// -----------------------------------------------------------
// Action
// -----------------------------------------------------------

function buildAction(
  primary: ProductDecisionInsight['primaryIssue'],
  input: DecisionFusionInput,
): ProductDecisionInsight['recommendedAction'] {
  if (!primary) {
    return { action: '继续观察产品指标', reason: '当前无紧急产品问题' }
  }
  if (primary.capability.includes('保存')) {
    return { action: '优化研究完成后的保存引导', reason: input.priority.topRecommendation.reason }
  }
  if (primary.capability.includes('Discovery') || primary.capability.includes('Discover')) {
    return { action: '优化 Discovery 页面探索入口', reason: input.priority.topRecommendation.reason }
  }
  if (primary.capability.includes('Chat') || primary.capability.includes('对话')) {
    return { action: '提升 AI 对话入口可见性', reason: input.priority.topRecommendation.reason }
  }
  return { action: `调查 ${primary.capability} 相关体验问题`, reason: primary.problem }
}

// -----------------------------------------------------------
// Confidence
// -----------------------------------------------------------

function computeConfidence(input: DecisionFusionInput, concernCount: number): number {
  if (input.intelligence.totalEvents === 0) return 0
  // Evidence completeness — NOT prediction probability
  const eventVolume = 0.25
  const moduleAgreement = concernCount === 0 ? 0.3 : concernCount <= 2 ? 0.2 : 0.1
  const traceability = input.priority.topRecommendation.reason.length > 10 ? 0.25 : 0.1
  const knowledgeCoverage = input.knowledge.coverageRatio.entityCoverage * 0.1
  const depthContext = (input.depth.maxDepth / 5) * 0.1
  return +(eventVolume + moduleAgreement + traceability + knowledgeCoverage + depthContext).toFixed(2)
}

// -----------------------------------------------------------
// Evidence
// -----------------------------------------------------------

function buildMetrics(input: DecisionFusionInput): Record<string, string | number> {
  return {
    totalEvents: input.intelligence.totalEvents,
    sessions: input.intelligence.sessions,
    discoveryToEntityRate: input.intelligence.discoveryToEntityRate,
    exploreEngagementRate: input.intelligence.exploreEngagementRate,
    researchSaveRate: input.intelligence.researchSaveRate,
    chatAdoptionRate: input.intelligence.chatAdoptionRate,
    maxDepth: input.depth.maxDepth,
    dominantPattern: input.behaviors.dominantPattern,
    entityCoverage: input.knowledge.coverageRatio.entityCoverage,
    relationshipDataAvailable: input.knowledge.relationshipDataAvailable ? 'yes' : 'no',
  }
}

// -----------------------------------------------------------
// Status
// -----------------------------------------------------------

function determineStatus(
  primary: ProductDecisionInsight['primaryIssue'],
  concerns: ProductDecisionInsight['concerns'],
  input: DecisionFusionInput,
): ProductDecisionInsight['overallStatus'] {
  if (input.intelligence.totalEvents === 0) return 'healthy' // No data ≠ bad product
  if (primary?.severity === 'critical') return 'critical'
  if (concerns.length > 0) return 'attention'
  return 'healthy'
}

// -----------------------------------------------------------
// Summary
// -----------------------------------------------------------

function buildSummary(
  primary: ProductDecisionInsight['primaryIssue'],
  positives: string[],
  input: DecisionFusionInput,
): string {
  const parts: string[] = []
  if (input.intelligence.totalEvents === 0) {
    parts.push('尚无用户行为数据。')
  } else {
    parts.push(`基于${input.intelligence.totalEvents}个事件的分析：`)
    if (primary) {
      parts.push(`主要问题：${primary.problem}`)
      parts.push(`建议：${buildAction(primary, input).action}`)
    } else {
      parts.push('当前无紧急产品问题。')
    }
    if (positives.length > 0) {
      parts.push(`积极信号：${positives.slice(0, 3).join('；')}`)
    }
  }
  return parts.join(' ')
}

// -----------------------------------------------------------
// Validation
// -----------------------------------------------------------

/** Priority candidate must have supporting evidence from at least one other module. */
function validatePriorityRecommendation(
  top: { severity: string; reason: string },
  input: DecisionFusionInput,
): boolean {
  // If events exist, recommendation is based on real data → accept
  if (input.intelligence.totalEvents > 0) return true

  // If zero events but priority says healthy → accept (no data = no panic)
  if (top.severity === 'healthy') return true

  // Otherwise: data is insufficient, downgrade
  return false
}
