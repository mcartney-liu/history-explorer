/**
 * M89.2.10 — Understanding Workspace
 *
 * Workspace = Understanding Path 的可视化和交互空间。
 * 不是内容页面、不是 Entity 页面、不是 AI 聊天页。
 *
 * 五个区域（垂直 Attention Flow）：
 *   ① 为什么看到这个？
 *   ② 理解在怎么变？
 *   ③ 这个证据是什么？
 *   ④ 走到哪里了？
 *   ⑤ 下一步为什么？
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../../components/ui/Icon'
import type { UnderstandingWorkspaceState } from '../../next/exploration/UnderstandingWorkspaceState'
import { buildTopicUnderstandingState } from '../../next/exploration/topicUnderstandingState'
import { loadGap, saveGap } from '../../data/GapLedger'

// ============================================================================
// Props
// ============================================================================

export interface UnderstandingWorkspaceProps {
  /** Topic slug from the Router. */
  topic: string | null
}

// ============================================================================
// Workspace Component
// ============================================================================

export const UnderstandingWorkspace: React.FC<UnderstandingWorkspaceProps> = ({
  topic,
}) => {
  const [evidenceIndex, setEvidenceIndex] = useState(0)
  // Cognitive loop (P2, 2026-08-14): dimensions the user explicitly marked
  // "still want to understand" — the user-facing Knowledge Gap that
  // ExplorationPolicy reads (Rule 0) to aim the next step at it.
  const [markedGaps, setMarkedGaps] = useState<string[]>([])
  const hydratedRef = useRef(false)

  // Hydrate the persisted gap snapshot for this topic (cognitive loop, ADR-0018):
  // lets the user's "what I still don't get" survive a page reload.
  useEffect(() => {
    if (!topic) return
    let cancelled = false
    loadGap(topic)
      .then((g) => {
        if (cancelled) return
        const idx = g?.evidenceIndex
        if (typeof idx === 'number') setEvidenceIndex(idx)
        const gaps = g?.openGaps
        if (Array.isArray(gaps)) setMarkedGaps(gaps as string[])
        hydratedRef.current = true
      })
      .catch(() => {
        hydratedRef.current = true
      })
    return () => {
      cancelled = true
    }
  }, [topic])

  const state = useMemo(
    () => buildTopicUnderstandingState(topic, evidenceIndex),
    [topic, evidenceIndex],
  )

  // Persist progress whenever the user advances (refresh-safe gap ledger).
  useEffect(() => {
    if (!topic || !hydratedRef.current || !state) return
    saveGap(topic, {
      evidenceIndex,
      total: state.understandingPath.totalNodes,
      openGaps: markedGaps,
    })
  }, [topic, evidenceIndex, state, markedGaps])

  const handleContinue = useCallback(() => {
    setEvidenceIndex((i) => i + 1)
  }, [])

  const handleRestart = useCallback(() => {
    setEvidenceIndex(0)
  }, [])

  // No data for this topic — show empty state.
  if (!state) {
    return (
      <div className="m89-workspace">
        <section className="m89-section m89-navigation">
          <div className="m89-nav-card">
            <div className="m89-nav-label">暂无理解数据</div>
            <p className="m89-nav-dimensions">
              当前主题「{topic ?? '未知'}」暂不支持 Understanding Mode。
            </p>
          </div>
        </section>
      </div>
    )
  }

  const isComplete = state.phase === 'closure' || evidenceIndex >= 3

  return (
    <div className="m89-workspace">
      {/* ① 为什么看到这个？ */}
      <section className="m89-section m89-navigation">
        <NavigationArea state={state} />
      </section>

      {/* ② 理解在怎么变？ */}
      {state.phase === 'exploring' && state.currentEvidence && (
        <section className="m89-section m89-transition">
          <TransitionArea evidence={state.currentEvidence} />
        </section>
      )}

      {/* ③ 这个证据是什么？ */}
      {state.phase === 'exploring' && state.currentEvidence && (
        <section className="m89-section m89-evidence">
          <EvidenceArea evidence={state.currentEvidence} />
        </section>
      )}

      {/* ④ 走到哪里了？ */}
      <section className="m89-section m89-path">
        <PathArea
          state={state}
          markedGaps={markedGaps}
          onToggleGap={(dim) =>
            setMarkedGaps((prev) =>
              prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim],
            )
          }
        />
      </section>

      {/* ⑤ 下一步为什么？ */}
      <section className="m89-section m89-action">
        <ActionArea
          state={state}
          onContinue={isComplete ? handleRestart : handleContinue}
          onRestart={handleRestart}
        />
      </section>
    </div>
  )
}

// ============================================================================
// ① Navigation Area
// ============================================================================

const NavigationArea: React.FC<{ state: UnderstandingWorkspaceState }> = ({
  state,
}) => {
  if (state.phase === 'orientation') {
    return (
      <div className="m89-nav-card">
        <div className="m89-nav-label">你正在探索</div>
        <h1 className="m89-nav-question">{state.question}</h1>
        <p className="m89-nav-dimensions">
          这个问题涉及 {state.understandingPath.totalNodes} 个角度：
          {state.understandingPath.nodes.map((n) => n.dimension).join(' · ')}
        </p>
      </div>
    )
  }

  if (state.phase === 'closure') {
    return (
      <div className="m89-nav-card m89-nav-closure">
        <div className="m89-nav-label">你的理解发生了变化</div>
        <p className="m89-nav-summary">
          {state.reflection?.observedChange}
        </p>
      </div>
    )
  }

  // exploring
  return (
    <div className="m89-nav-card">
      <div className="m89-nav-label">为什么现在看这个？</div>
      <p className="m89-nav-reason">
        {state.nextAction?.reason}
      </p>
    </div>
  )
}

// ============================================================================
// ② Transition Area
// ============================================================================

const TransitionArea: React.FC<{
  evidence: NonNullable<UnderstandingWorkspaceState['currentEvidence']>
}> = ({ evidence }) => {
  return (
    <div className="m89-transition-card">
      <div className="m89-transition-before">
        <span className="m89-transition-label">之前你可能认为</span>
        <p>{evidence.transition.before}</p>
      </div>
      <div className="m89-transition-arrow">↓</div>
      <div className="m89-transition-after">
        <span className="m89-transition-label">新的证据让我们看到</span>
        <p>{evidence.transition.after}</p>
      </div>
    </div>
  )
}

// ============================================================================
// ③ Evidence Area
// ============================================================================

const EvidenceArea: React.FC<{
  evidence: NonNullable<UnderstandingWorkspaceState['currentEvidence']>
}> = ({ evidence }) => {
  return (
    <div className="m89-evidence-card">
      <h3 className="m89-evidence-question">{evidence.questionAnswered}</h3>
      <p className="m89-evidence-text">{evidence.materials.text}</p>
      {evidence.materials.facts.length > 0 && (
        <ul className="m89-evidence-facts">
          {evidence.materials.facts.map((fact, i) => (
            <li key={i}>{fact}</li>
          ))}
        </ul>
      )}
      {evidence.provenance && (
        <div className="m89-evidence-provenance">
          <span className="m89-provenance-label">来源</span>
          <div className="m89-provenance-tags">
            {evidence.provenance.entities.map((e) => (
              <span key={e} className="m89-provenance-tag m89-tag-entity">{e}</span>
            ))}
            {evidence.provenance.relations.map((r) => (
              <span key={r} className="m89-provenance-tag m89-tag-relation">{r}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// ④ Path Area
// ============================================================================

const PathArea: React.FC<{
  state: UnderstandingWorkspaceState
  markedGaps: string[]
  onToggleGap: (dim: string) => void
}> = ({ state, markedGaps, onToggleGap }) => {
  const { nodes, connections, currentNodeIndex, totalNodes } =
    state.understandingPath

  return (
    <div className="m89-path-card">
      <div className="m89-path-header">
        <span className="m89-path-label">你的理解路径</span>
        <span className="m89-path-progress">
          {currentNodeIndex} / {totalNodes}
        </span>
      </div>

      <div className="m89-path-nodes">
        {nodes.map((node, i) => (
          <React.Fragment key={node.dimension}>
            <div
              className={`m89-path-node ${node.completed ? 'completed' : ''} ${
                i === currentNodeIndex && !node.completed ? 'current' : ''
              }`}
            >
              {/* Wave2-#140 / P0-1: status used to be drawn with filled /
                  ringed / hollow circle dingbat glyphs, which the M62.5
                  symbol guard bans as functional icons. Now uses the
                  registered 2px-stroke SVG set; state is carried by the
                  .completed / .current colour rules in m89.css. */}
              <span
                className="m89-path-dot"
                aria-label={
                  node.completed
                    ? '已完成'
                    : i === currentNodeIndex
                      ? '进行中'
                      : '未开始'
                }
              >
                <Icon name={node.completed ? 'check' : 'circle'} size={16} />
              </span>
              <span className="m89-path-dimension">{node.dimension}</span>
              {!node.completed && (
                <button
                  type="button"
                  className={
                    markedGaps.includes(node.dimension)
                      ? 'm89-gap-mark is-marked'
                      : 'm89-gap-mark'
                  }
                  aria-pressed={markedGaps.includes(node.dimension)}
                  onClick={() => onToggleGap(node.dimension)}
                >
                  {markedGaps.includes(node.dimension) ? '已标记想搞清楚' : '还想搞清楚'}
                </button>
              )}
            </div>
            {i < nodes.length - 1 && (
              <div
                className={`m89-path-connector ${i < currentNodeIndex - 1 ? 'active' : ''}`}
              >
                {i < currentNodeIndex - 1 && connections[i] && (
                  <span className="m89-path-connector-reason">
                    {connections[i].reason}
                  </span>
                )}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// ⑤ Action Area
// ============================================================================

const ActionArea: React.FC<{
  state: UnderstandingWorkspaceState
  onContinue: () => void
  onRestart: () => void
}> = ({ state, onContinue, onRestart }) => {
  if (state.phase === 'closure') {
    return (
      <div className="m89-action-card">
        <p className="m89-action-hook">
          {state.reflection?.newQuestion}
        </p>
        <div className="m89-action-buttons">
          <button className="m89-btn-primary" onClick={onRestart}>
            重新开始
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="m89-action-card">
      <p className="m89-action-hook">
        {state.nextAction?.hook}
      </p>
      <div className="m89-action-buttons">
        <button className="m89-btn-primary" onClick={onContinue}>
          继续探索
        </button>
        <button className="m89-btn-secondary" onClick={onContinue}>
          换一个方向
        </button>
      </div>
    </div>
  )
}
