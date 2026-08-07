/**
 * M86.2.4 Phase 4 — WorkspaceAdapter
 *
 * Memory Module 的 Experience Layer 适配器。
 * 消费 MemoryProjection → 输出 Workspace 可用的展示数据。
 *
 * 约束（M86.2）：
 *   - Workspace 是 Experience Layer 的 Consumer——只读 MemoryProjection
 *   - 不修改 MemoryUnit / GrowthGraph / MemoryDecision
 *   - 用户操作不绕过 Runtime 直接写入 Memory
 *   - 展示文本由 Adapter 生成，非 Source 存储
 */

import type { MemoryProjection, StageTimelineItem, ActiveBranch } from './MemoryProjection'

// ============================================================================
// Workspace 展示数据类型
// ============================================================================

export interface WorkspaceUnderstandingSummary {
  /** 主题标题 */
  title: string
  /** 用户想理解的问题 */
  question: string
  /** 当前理解阶段 */
  stage: string
  /** 理解进度（0-1） */
  progress: number
  /** 已用天数 */
  daysActive: number
  /** 状态标签 */
  statusLabel: string
}

export interface WorkspaceTimelineItem {
  /** 时间戳 */
  timestamp: number
  /** 展示文本 */
  description: string
  /** 阶段标签 */
  stageLabel: string
  /** 进度 */
  progress: number
  /** 是否里程碑 */
  isMilestone: boolean
}

export interface WorkspaceBranchItem {
  /** 分支标签 */
  label: string
  /** 最新阶段 */
  stage: string
  /** 节点数 */
  nodeCount: number
}

export interface WorkspaceView {
  /** 理解摘要 */
  summary: WorkspaceUnderstandingSummary
  /** 时间线 */
  timeline: WorkspaceTimelineItem[]
  /** 活跃分支 */
  branches: WorkspaceBranchItem[]
  /** 里程碑 */
  milestones: WorkspaceTimelineItem[]
  /** 缺口提示 */
  gaps: string[]
  /** 统计 */
  stats: {
    totalNodes: number
    totalEdges: number
    daysSinceStart: number
  }
}

// ============================================================================
// WorkspaceAdapter
// ============================================================================

/**
 * 将 MemoryProjection 转换为 Workspace 可消费的展示数据。
 *
 * 纯函数——不修改 Source，不访问外部状态。
 * 展示文本由 Adapter 生成（非 Source 存储）。
 */
export function createWorkspaceView(projection: MemoryProjection): WorkspaceView {
  return {
    summary: buildSummary(projection),
    timeline: buildTimeline(projection.stageTimeline),
    branches: buildBranches(projection.activeBranches),
    milestones: buildTimeline(projection.milestones),
    gaps: buildGaps(projection),
    stats: {
      totalNodes: projection.totalNodes,
      totalEdges: projection.totalEdges,
      daysSinceStart: projection.daysSinceStart,
    },
  }
}

// ============================================================================
// 辅助
// ============================================================================

function buildSummary(p: MemoryProjection): WorkspaceUnderstandingSummary {
  const statusLabels: Record<string, string> = {
    active: '探索中',
    completed: '已完成',
    archived: '已归档',
  }

  return {
    title: p.unit.topicRef || '未命名主题',
    question: p.unit.userQuestion || '探索历史',
    stage: stageDisplayLabel(p.currentStage),
    progress: p.currentCoverageRatio,
    daysActive: p.daysSinceStart,
    statusLabel: statusLabels[p.unit.status] ?? p.unit.status,
  }
}

function buildTimeline(items: readonly StageTimelineItem[]): WorkspaceTimelineItem[] {
  return items.map((item) => ({
    timestamp: item.timestamp,
    description: item.label,
    stageLabel: stageDisplayLabel(item.stage),
    progress: item.coverageRatio,
    isMilestone: item.type === 'milestone' || item.type === 'reactivation',
  }))
}

function buildBranches(branches: readonly ActiveBranch[]): WorkspaceBranchItem[] {
  return branches.map((b) => ({
    label: `分支探索（${b.nodeCount} 步）`,
    stage: stageDisplayLabel(b.latestStage),
    nodeCount: b.nodeCount,
  }))
}

function buildGaps(p: MemoryProjection): string[] {
  const gaps: string[] = []

  if (p.missingLinkCount > 0) {
    gaps.push(`还有 ${p.missingLinkCount} 个结构缺口待探索`)
  }

  if (p.currentCoverageRatio < 0.5) {
    gaps.push(`当前理解覆盖仅 ${Math.round(p.currentCoverageRatio * 100)}%，建议继续探索更多维度`)
  }

  if (p.currentStage === 'FACT' && p.totalNodes > 3) {
    gaps.push('已接触多个事实，尝试建立它们之间的关联')
  }

  return gaps
}

function stageDisplayLabel(stage: string): string {
  switch (stage) {
    case 'FACT': return '确认事实'
    case 'EXPLANATION': return '理解原因'
    case 'CONNECTION': return '建立关联'
    case 'UNDERSTANDING': return '形成理解'
    case 'NEW_QUESTION': return '产生新问题'
    default: return stage
  }
}
