// ============================================================
// M90.3 Stage E-3 — UnderstandingStatus (Metrics + Memory wired)
//
// 6 blocks:
//   1. Cognitive Stage
//   2. Coverage Progress
//   3. ExplorationMetrics (growth delta)
//   4. Memory Growth Graph
//   5. System Recommendation (ExplorationPolicy)
//   6. Understanding Gap
// ============================================================

import { useMemo } from 'react'
import { Icon } from '../ui/Icon'
import type { ExplorationState } from '../../next/exploration/ExplorationState'
import type { ExplorationAction } from '../../next/exploration/ExplorationPolicy'
import type { ExplorationMetrics } from '../../next/exploration/ExplorationMetrics'
import type { GrowthGraphStore } from '../../next/memory/GrowthGraphStore'

interface UnderstandingStatusProps {
  /** Current cognitive stage from projection engine. */
  cognitiveStage: string | null
  /** Unresolved understanding gap from projection engine. */
  unresolvedGap: string | null
  /** Live ExplorationState (coverage, dimensions, etc.). */
  explorationState?: ExplorationState | null
  /** Recommended next action from ExplorationPolicy. */
  policyAction?: ExplorationAction | null
  /** Cognitive growth metrics (before → after delta). */
  explorationMetrics?: ExplorationMetrics | null
  /** Memory growth graph store. */
  graphStore?: GrowthGraphStore | null
}

function stageEmoji(stage: string | null): string {
  switch (stage) {
    case 'FACT': return '🔍'
    case 'EXPLANATION': return '💡'
    case 'CONNECTION': return '🔗'
    case 'UNDERSTANDING': return '🧠'
    case 'NEW_QUESTION': return '❓'
    default: return '📍'
  }
}

function stageLabel(stage: string | null): string {
  switch (stage) {
    case 'FACT': return '事实收集'
    case 'EXPLANATION': return '解释构建'
    case 'CONNECTION': return '关系连接'
    case 'UNDERSTANDING': return '理解形成'
    case 'NEW_QUESTION': return '新问题'
    default: return '探索中'
  }
}

function stageDescription(stage: string | null): string {
  switch (stage) {
    case 'FACT': return '正在了解基本事实'
    case 'EXPLANATION': return '正在理解因果关系'
    case 'CONNECTION': return '正在发现关联'
    case 'UNDERSTANDING': return '正在形成完整理解'
    case 'NEW_QUESTION': return '新的问题浮现了'
    default: return '开始你的探索'
  }
}

function actionLabel(action: ExplorationAction): string {
  switch (action.type) {
    case 'open_dimension': return `探索「${action.targetRef || '缺失维度'}」`
    case 'follow_cause': return `追踪因果关系`
    case 'deep_continue': return `继续深化探索`
    case 'compare_context': return `跨语境对比`
    case 'reflect': return `理解收束`
    default: return '继续探索'
  }
}

function actionHint(action: ExplorationAction): string {
  return action.reason || '基于你的理解状态，系统建议这一步'
}

function Row({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>
        {label}
        <span style={{ fontSize: '0.65rem', marginLeft: 4, opacity: 0.6 }}>{hint}</span>
      </span>
      <span style={{ fontWeight: 600, color: 'var(--mid, #9CA3AF)' }}>{value}</span>
    </div>
  )
}

export function UnderstandingStatus({
  cognitiveStage,
  unresolvedGap,
  explorationState,
  policyAction,
  explorationMetrics,
  graphStore,
}: UnderstandingStatusProps) {
  const coveragePct = explorationState ? Math.round(explorationState.coverageRatio * 100) : 0

  // Memory graph summary
  const graphSummary = useMemo(() => {
    if (!graphStore) return null
    const graph = graphStore.getGraph()
    const milestones = graph.nodes.filter((n) => n.type === 'milestone')
    const deltas = graph.nodes.filter((n) => n.type === 'delta')
    return {
      totalNodes: graph.nodes.length,
      milestones: milestones.length,
      deltas: deltas.length,
      latestMilestone: milestones.length > 0 ? milestones[milestones.length - 1] : null,
    }
  }, [graphStore])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Cognitive Stage */}
      <div style={{
        padding: 12,
        borderRadius: 'var(--radius-sm, 6px)',
        border: '1px solid var(--gold-line, rgba(203,161,53,0.2))',
        background: 'var(--gold-glow, rgba(203,161,53,0.04))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: '1rem' }}>{stageEmoji(cognitiveStage)}</span>
          <span style={{
            fontFamily: 'var(--serif, "Spectral", serif)',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--gold-hi, #CBA135)',
          }}>
            {stageLabel(cognitiveStage)}
          </span>
        </div>
        <p style={{
          fontSize: '0.75rem',
          color: 'var(--low, #6B7280)',
          margin: 0,
          lineHeight: 1.4,
        }}>
          {stageDescription(cognitiveStage)}
        </p>
      </div>

      {/* Coverage Progress (wired from ExplorationState) */}
      {explorationState && coveragePct > 0 && (
        <div style={{
          padding: 12,
          borderRadius: 'var(--radius-sm, 6px)',
          border: '1px solid rgba(79,167,132,0.2)',
          background: 'rgba(79,167,132,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#4FA784',
            }}>
              理解覆盖度
            </span>
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#4FA784',
            }}>
              {coveragePct}%
            </span>
          </div>
          <div style={{
            height: 4,
            borderRadius: 2,
            background: 'rgba(79,167,132,0.15)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${coveragePct}%`,
              borderRadius: 2,
              background: 'linear-gradient(90deg, #4FA784, #6BCB9B)',
              transition: 'width 0.5s ease',
            }} />
          </div>
          {explorationState.missingDimensions.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {explorationState.missingDimensions.map((dim) => (
                <span key={dim} style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(79,167,132,0.1)',
                  color: 'rgba(79,167,132,0.8)',
                }}>
                  缺: {dim}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ExplorationPolicy Recommendation */}
      {policyAction && (
        <div style={{
          padding: 12,
          borderRadius: 'var(--radius-sm, 6px)',
          border: '1px solid rgba(203,161,53,0.25)',
          background: 'rgba(203,161,53,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Icon name="graph" size={14} />
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--gold-hi, #CBA135)',
            }}>
              系统建议
            </span>
          </div>
          <p style={{
            fontSize: '0.78rem',
            color: 'var(--gold-hi, #CBA135)',
            margin: '0 0 4px 0',
            fontWeight: 500,
            lineHeight: 1.3,
          }}>
            {actionLabel(policyAction)}
          </p>
          <p style={{
            fontSize: '0.7rem',
            color: 'var(--low, #6B7280)',
            margin: 0,
            lineHeight: 1.3,
          }}>
            {actionHint(policyAction)}
          </p>
        </div>
      )}

      {/* M90.3 E-3 — ExplorationMetrics: Cognitive Growth */}
      {explorationMetrics && (
        <div style={{
          padding: 12,
          borderRadius: 'var(--radius-sm, 6px)',
          border: '1px solid rgba(125,140,196,0.2)',
          background: 'rgba(125,140,196,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Icon name="graph" size={14} />
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#7D8CC4',
            }}>
              认知增长
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem', color: 'var(--low, #6B7280)' }}>
            <Row label="深度" value={`+${explorationMetrics.depthDelta}`} hint="新探索的实体" />
            <Row label="广度" value={`+${explorationMetrics.dimensionDelta}`} hint="新覆盖的维度" />
            <Row label="关系" value={`+${explorationMetrics.connectionDelta}`} hint="新发现的关联" />
            <Row label="连续性" value={`${Math.round(explorationMetrics.continuityScore * 100)}%`} hint="与上次探索的衔接" />
            <div style={{
              marginTop: 6,
              paddingTop: 6,
              borderTop: '1px solid rgba(125,140,196,0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontWeight: 600, color: '#7D8CC4' }}>综合增长</span>
              <span style={{
                fontWeight: 700,
                fontSize: '0.85rem',
                color: explorationMetrics.understandingGrowthScore > 0 ? '#4FA784' : '#7D8CC4',
              }}>
                {explorationMetrics.understandingGrowthScore > 0 ? '+' : ''}
                {Math.round(explorationMetrics.understandingGrowthScore * 10) / 10}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* M90.3 E-3 — Memory Growth Graph */}
      {graphSummary && graphSummary.totalNodes > 0 && (
        <div style={{
          padding: 12,
          borderRadius: 'var(--radius-sm, 6px)',
          border: '1px solid rgba(196,160,125,0.2)',
          background: 'rgba(196,160,125,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Icon name="book" size={14} />
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#C4A07D',
            }}>
              记忆图
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--low, #6B7280)', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 4px 0' }}>
              已记录 <strong style={{ color: '#C4A07D' }}>{graphSummary.totalNodes}</strong> 个认知节点
              {graphSummary.milestones > 0 && (
                <span>（含 <strong style={{ color: '#CBA135' }}>{graphSummary.milestones}</strong> 个里程碑）</span>
              )}
            </p>
            {graphSummary.latestMilestone && (
              <p style={{ margin: 0, fontSize: '0.65rem', opacity: 0.7 }}>
                最近里程碑：{graphSummary.latestMilestone.snapshot.stage}阶段 · 覆盖度{Math.round(graphSummary.latestMilestone.snapshot.coverageRatio * 100)}%
              </p>
            )}
          </div>
        </div>
      )}

      {/* Unresolved Gap */}
      {unresolvedGap && (
        <div style={{
          padding: 12,
          borderRadius: 'var(--radius-sm, 6px)',
          border: '1px solid rgba(79,167,132,0.2)',
          background: 'rgba(79,167,132,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icon name="search" size={16} />
            <span style={{
              fontFamily: 'var(--serif, "Spectral", serif)',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#4FA784',
            }}>
              理解缺口
            </span>
          </div>
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--mid, #9CA3AF)',
            margin: 0,
            lineHeight: 1.4,
          }}>
            {unresolvedGap}
          </p>
        </div>
      )}
    </div>
  )
}
