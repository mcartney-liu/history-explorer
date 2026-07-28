// ============================================================
// M47 — OptimizationPriority + CapabilityHealth
// Product Decision Intelligence Layer.
// Reads existing intelligence to rank optimization candidates
// and score capability health. Pure functions.
// Zero AI. Zero UI. Zero backend.
// ============================================================

import type { FunnelMetric } from './ExplorationFunnelAnalysis'
import type { ProductIntelligence } from './ProductIntelligence'

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export type SeverityLevel = 'critical' | 'warning' | 'healthy'

export interface OptimizationCandidate {
  capability: string
  score: number
  reach: number
  severity: SeverityLevel
  reason: string
}

export interface OptimizationPriority {
  topRecommendation: OptimizationCandidate
  ranking: OptimizationCandidate[]
  generatedAt: string
}

export interface CapabilityHealth {
  capability: string
  score: number
  adoptionRate: number
  severity: SeverityLevel
  gapDescription: string
}

export interface DecisionIntelligence {
  priority: OptimizationPriority
  capabilityHealth: CapabilityHealth[]
}

// -----------------------------------------------------------
// Scoring helpers
// -----------------------------------------------------------

function severityWeight(s: SeverityLevel): number {
  switch (s) {
    case 'critical': return 3
    case 'warning': return 2
    case 'healthy': return 0
  }
}

function fixProximity(_capability: string): number {
  // All frontend-only fixes have the same proximity — no backend bottleneck.
  return 0.7
}

function classifySeverity(rate: number, threshold_warning: number, threshold_critical: number): SeverityLevel {
  if (rate >= threshold_warning) return 'healthy'
  if (rate >= threshold_critical) return 'warning'
  return 'critical'
}

// -----------------------------------------------------------
// Optimization Priority
// -----------------------------------------------------------

export function generateOptimizationPriority(
  pi: ProductIntelligence,
  funnels: FunnelMetric[],
): OptimizationPriority {
  const candidates: OptimizationCandidate[] = []

  // No data = no recommendations
  if (pi.totalEvents === 0) {
    return {
      topRecommendation: {
        capability: '暂无数据',
        score: 0, reach: 0, severity: 'healthy',
        reason: '尚未收集到用户行为数据',
      },
      ranking: [],
      generatedAt: new Date().toISOString(),
    }
  }

  // Discovery — only if user actually entered Discovery
  if (pi.discoveryToEntityRate < 1 && pi.discoveryToEntityRate > 0) {
    const reach = 1 - pi.discoveryToEntityRate
    const sev = classifySeverity(pi.discoveryToEntityRate, 0.7, 0.3)
    candidates.push({
      capability: 'Discover-to-Entity 转化',
      score: +(reach * severityWeight(sev) * fixProximity('discovery')).toFixed(2),
      reach,
      severity: sev,
      reason: `只有 ${Math.round(pi.discoveryToEntityRate * 100)}% 的用户从发现进入实体${pi.discoveryToEntityRate === 0 ? '，探索入口需要显著优化' : ''}`,
    })
  }

  // Exploration — only if user actively explored
  const explorationFunnel = funnels.find((f) => f.name === 'Exploration')
  if (explorationFunnel && explorationFunnel.overallConversionRate < 0.5
      && explorationFunnel.overallConversionRate > 0) {
    const reach = 1 - explorationFunnel.overallConversionRate
    const sev = classifySeverity(explorationFunnel.overallConversionRate, 0.4, 0.2)
    candidates.push({
      capability: 'Exploration 探索深度',
      score: +(reach * severityWeight(sev) * fixProximity('exploration')).toFixed(2),
      reach,
      severity: sev,
      reason: `探索漏斗转化率仅 ${Math.round(explorationFunnel.overallConversionRate * 100)}%${explorationFunnel.bottleneckSteps.length > 0 ? `，瓶颈: ${explorationFunnel.bottleneckSteps.join(', ')}` : ''}`,
    })
  }

  // Research save rate
  if (pi.researchSaveRate < 0.5) {
    const reach = 1 - pi.researchSaveRate
    const sev = classifySeverity(pi.researchSaveRate, 0.4, 0.2)
    candidates.push({
      capability: 'Research 保存流程',
      score: +(reach * severityWeight(sev) * fixProximity('research')).toFixed(2),
      reach,
      severity: sev,
      reason: `仅 ${Math.round(pi.researchSaveRate * 100)}% 的研究被保存${pi.researchSaveRate === 0 ? '，无用户完成研究闭环' : ''}`,
    })
  }

  // AI Chat adoption
  if (pi.chatAdoptionRate < 0.3 && pi.totalEvents > 0) {
    const reach = 1 - pi.chatAdoptionRate
    const sev = classifySeverity(pi.chatAdoptionRate, 0.2, 0.05)
    candidates.push({
      capability: 'AI 历史学家对话',
      score: +(reach * severityWeight(sev) * fixProximity('chat')).toFixed(2),
      reach,
      severity: sev,
      reason: `AI 对话采用率仅 ${Math.round(pi.chatAdoptionRate * 100)}%，${pi.chatAdoptionRate === 0 ? '入口可能需要更突出' : '可考虑在更多位置展示'}`,
    })
  }

  // Drop-off: if any funnel has drop-off, it's a signal
  for (const dp of pi.dropOffPoints) {
    if (!candidates.some((c) => c.capability.includes(dp.funnel))) {
      candidates.push({
        capability: `${dp.funnel} 漏斗中断`,
        score: 0.6,
        reach: 1,
        severity: 'warning',
        reason: `用户在 ${dp.funnel} 的 ${dp.step} 步骤停止，下一步 ${dp.nextStep} 未被触发`,
      })
    }
  }

  // Rank by score descending
  candidates.sort((a, b) => b.score - a.score)

  const top = candidates[0] ?? {
    capability: '暂无明确瓶颈',
    score: 0,
    reach: 0,
    severity: 'healthy',
    reason: '所有关键路径表现正常',
  }

  return {
    topRecommendation: top,
    ranking: candidates,
    generatedAt: new Date().toISOString(),
  }
}

// -----------------------------------------------------------
// Capability Health
// -----------------------------------------------------------

export function calculateCapabilityHealth(
  pi: ProductIntelligence,
  funnels: FunnelMetric[],
): CapabilityHealth[] {
  const discoveryFunnel = funnels.find((f) => f.name === 'Discovery')
  const explorationFunnel = funnels.find((f) => f.name === 'Exploration')
  const researchFunnel = funnels.find((f) => f.name === 'Research')

  const results: CapabilityHealth[] = [
    {
      capability: 'Discovery 发现',
      score: pi.discoveryToEntityRate * 100,
      adoptionRate: pi.discoveryToEntityRate,
      severity: classifySeverity(pi.discoveryToEntityRate, 0.7, 0.3),
      gapDescription: pi.discoveryToEntityRate < 1
        ? `部分用户进入发现页后未进一步点击实体`
        : '发现流程健康',
    },
    {
      capability: 'Exploration 探索',
      score: explorationFunnel ? explorationFunnel.overallConversionRate * 100 : 0,
      adoptionRate: explorationFunnel ? explorationFunnel.overallConversionRate : 0,
      severity: explorationFunnel
        ? classifySeverity(explorationFunnel.overallConversionRate, 0.5, 0.2)
        : 'healthy',
      gapDescription: explorationFunnel && explorationFunnel.bottleneckSteps.length > 0
        ? `瓶颈: ${explorationFunnel.bottleneckSteps.join(', ')}`
        : explorationFunnel ? '探索流程健康' : '暂无探索数据',
    },
    {
      capability: 'AI Chat 对话',
      score: pi.chatAdoptionRate * 100,
      adoptionRate: pi.chatAdoptionRate,
      severity: classifySeverity(pi.chatAdoptionRate, 0.2, 0.05),
      gapDescription: pi.chatAdoptionRate < 0.1
        ? 'AI 对话能力未被充分发现'
        : pi.chatAdoptionRate < 0.3 ? 'AI 对话采用率可提升' : 'AI 对话采用健康',
    },
    {
      capability: 'Research 研究',
      score: researchFunnel ? researchFunnel.overallConversionRate * 100 : 0,
      adoptionRate: researchFunnel ? researchFunnel.overallConversionRate : 0,
      severity: researchFunnel
        ? classifySeverity(researchFunnel.overallConversionRate, 0.5, 0.2)
        : 'healthy',
      gapDescription: pi.researchSaveRate < 0.3
        ? '研究启动后有大量流失，保存体验弱'
        : researchFunnel ? '研究流程健康' : '暂无研究数据',
    },
    {
      capability: 'Comparison 对比',
      score: pi.unusedCapabilities.includes('多实体对比研究') ? 0 : 80,
      adoptionRate: pi.unusedCapabilities.includes('多实体对比研究') ? 0 : 0.8,
      severity: pi.unusedCapabilities.includes('多实体对比研究') ? 'critical' : 'healthy',
      gapDescription: pi.unusedCapabilities.includes('多实体对比研究')
        ? '多实体对比能力完全未被使用'
        : '对比功能被使用',
    },
    {
      capability: 'Save & Restore 保存',
      score: pi.researchSaveRate * 100,
      adoptionRate: pi.researchSaveRate,
      severity: classifySeverity(pi.researchSaveRate, 0.5, 0.2),
      gapDescription: pi.researchSaveRate < 0.3
        ? '研究完成但保存率低'
        : '保存流程健康',
    },
  ]

  return results
}

// -----------------------------------------------------------
// Unified Decision Intelligence
// -----------------------------------------------------------

export function generateDecisionIntelligence(
  pi: ProductIntelligence,
  funnels: FunnelMetric[],
): DecisionIntelligence {
  return {
    priority: generateOptimizationPriority(pi, funnels),
    capabilityHealth: calculateCapabilityHealth(pi, funnels),
  }
}
