// ============================================================
// MirrorPanel — TP-19/22 read-only Cognitive Mirror (FRW Mirror pillar)
// ------------------------------------------------------------
// OD-09 closure: the Mirror pillar had NO dedicated panel component;
// MemoryProjection (next/memory/MemoryProjection.ts) was pure logic with
// zero runtime consumers. This panel is its first consumer.
//
// Contract (VS-03 TP-19/22 + B4 §5.4 five violations):
//   - Panel is READ-ONLY: lock icon + accent-soft "只读投影" badge,
//     paper-100 surface, NO edit controls.
//   - NO OUT-EDGES (X-R5): no "next step", no external links, no Dock
//     actions, no recommendations — reflection is the terminal state.
//   - Reflects ONLY the user's own trajectory (stage timeline, milestones,
//     active branches, coverage) — no other users, no popularity, no
//     click rates (violation #2).
//   - Output is never consumed by ExplorationPolicy (violation #3) — this
//     component renders only.
//   - No verdicts, no learner-type labels, no grading of the user
//     (violation #4).
//   - Session-scoped honesty: shows "本次会话" framing, never implies
//     long-term memory of the user (violation #5).
// ============================================================
import { useMemo } from 'react'
import type { GrowthGraphStore } from '../../next/memory/GrowthGraphStore'
import { createMemoryProjection, type MemoryUnitSummary } from '../../next/memory/MemoryProjection'
import { Icon } from '../ui/Icon'

interface MirrorPanelProps {
  graphStore?: GrowthGraphStore | null
  /** Current cognitive stage from projection engine (fallback). */
  cognitiveStage?: string | null
}

const STAGE_LABELS: Record<string, string> = {
  FACT: '事实收集',
  EXPLANATION: '解释构建',
  CONNECTION: '关系连接',
  UNDERSTANDING: '理解形成',
  NEW_QUESTION: '新问题',
}

function stageLabel(stage: string | undefined | null): string {
  if (!stage) return '探索中'
  return STAGE_LABELS[stage] ?? stage
}

export function MirrorPanel({ graphStore, cognitiveStage }: MirrorPanelProps) {
  const projection = useMemo(() => {
    if (!graphStore) return null
    const graph = graphStore.getGraph()
    if (graph.nodes.length === 0) return null
    // MemoryUnitSummary: session-scoped unit (App constructs a single default
    // unit). topicRef/userQuestion are display-only hints; the graph is the
    // source of truth for the mirror.
    const unit: MemoryUnitSummary = {
      unitId: graph.ownerUnitId,
      topicRef: 'session',
      userQuestion: '本次探索',
      status: 'active',
      createdAt: graph.createdAt,
      updatedAt: graph.updatedAt,
    }
    return createMemoryProjection(unit, graph)
  }, [graphStore])

  if (!projection) return null

  const stage = cognitiveStage ?? projection.currentStage
  const coveragePct = Math.round(projection.currentCoverageRatio * 100)
  const milestoneItems = projection.milestones.slice(-3).reverse()
  const timeline = projection.stageTimeline.slice(-4).reverse()

  return (
    <section
      aria-label="认知镜像 · 只读投影"
      style={{
        padding: 12,
        borderRadius: 'var(--radius-sm, 6px)',
        border: '1px solid var(--color-paper-300)',
        background: 'var(--color-paper-100)',
      }}
    >
      {/* Header: lock + read-only badge (VS-03 TP-19/22) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="lock" size={16} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-ink-700)' }}>
            认知镜像
          </span>
        </div>
        <span
          style={{
            fontSize: '0.62rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            padding: '2px 8px',
            borderRadius: 999,
            color: 'var(--color-accent)',
            background: 'var(--color-accent-soft)',
          }}
        >
          只读投影
        </span>
      </div>

      {/* Growth gauge (TP-30 scale): current stage + coverage */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-ink-700)' }}>
            {stageLabel(stage)}
          </span>
          <span style={{ fontSize: '0.66rem', color: 'var(--color-ink-500)' }}>
            覆盖度 {coveragePct}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={coveragePct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`理解覆盖度 ${coveragePct}%`}
          style={{
            height: 4,
            borderRadius: 2,
            background: 'var(--color-paper-300)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${coveragePct}%`,
              borderRadius: 2,
              background: 'var(--color-accent)',
              transition: 'width 0.3s ease-in-out',
            }}
          />
        </div>
      </div>

      {/* Milestones — the user's own cognitive milestones, no external data */}
      {milestoneItems.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-ink-500)', marginBottom: 4 }}>
            里程碑
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {milestoneItems.map((m) => (
              <li key={m.nodeId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.66rem', color: 'var(--color-ink-500)' }}>
                <Icon name="check" size={16} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.label} · {stageLabel(m.stage)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stage timeline — reflection of this session's trajectory */}
      {timeline.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-ink-500)', marginBottom: 4 }}>
            本次会话轨迹
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {timeline.map((t) => (
              <li key={t.nodeId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.64rem', color: 'var(--color-ink-400)' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: t.type === 'milestone' ? 'var(--color-accent)' : 'var(--color-paper-300)', flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.label} · {stageLabel(t.stage)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Session stats — honest, session-scoped, no implied long-term memory */}
      <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--color-paper-200)', paddingTop: 8 }}>
        <span style={{ fontSize: '0.62rem', color: 'var(--color-ink-400)' }}>
          {projection.totalNodes} 认知节点
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--color-ink-400)' }}>
          {projection.totalEdges} 连接
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--color-ink-400)' }}>
          {projection.dimensionCount} 维度
        </span>
      </div>
    </section>
  )
}

export default MirrorPanel
