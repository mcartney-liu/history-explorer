// ============================================================
// M90.3 / P5-S5 — UnderstandingCanvas
//
// Wraps topic exploration content with understanding-driven
// visual organization. Groups panels by cognitive stage and
// highlights the most relevant group based on current state.
//
// Design principles (M89.2.5A):
//   - L1: Cognitive positioning (largest, first)
//   - L2: Content core (what to explore)
//   - L3: Understanding state (how much covered)
//   - L4: Action choices (what's next)
//
// P5-S5 四视角重组：5 tab（概览/关系/时间线/对比/更多探索）→
// 四视角（探索/解释/关系/理解）。视角 = 认知动作，用户顺着走
// 一遍就从「是什么」走到「我懂了」。探索包/因果对象保持旅程范式。
// ============================================================

import { useState, type ReactNode } from 'react'
import type { ExplorationState } from '../../next/exploration/ExplorationState'

interface UnderstandingCanvasProps {
  /** Current cognitive stage */
  cognitiveStage: string | null
  /** Current exploration state */
  explorationState: ExplorationState | null
  /** All topic root panels (the original JSX from App.tsx) */
  children?: ReactNode
  /** 探索视角：这是什么 —— 概览叙事 / 为什么重要 / 主实体 */
  exploreSection: ReactNode
  /** 解释视角：为什么 —— 时间线 + 对比 + 争议 + AI 解释 */
  explainSection?: ReactNode
  /** 关系视角：跟谁连 —— 关系列表/图谱 + 跨主题 + 相关实体 */
  relateSection: ReactNode
  /** 理解视角：我懂了 —— 画像足迹聚合（UnderstandingOverview）+ 继续探索 */
  understandingSection?: ReactNode
}

export function UnderstandingCanvas({
  cognitiveStage,
  explorationState,
  exploreSection,
  explainSection,
  relateSection,
  understandingSection,
}: UnderstandingCanvasProps) {
  const stage = cognitiveStage || 'FACT'
  const coveragePct = explorationState
    ? Math.round(explorationState.coverageRatio * 100)
    : 0

  // P5-S5: 四视角 —— 视角 = 认知动作（是什么 → 为什么 → 跟谁连 → 我懂了）。
  const TABS: { id: string; label: string }[] = [
    { id: 'explore', label: '探索' },
    { id: 'explain', label: '解释' },
    { id: 'relate', label: '关系' },
    { id: 'understand', label: '理解' },
  ]

  // 默认选中跟随认知阶段：先回答「这是什么」，再逐步深入。
  const defaultTab =
    stage === 'FACT' ? 'explore'
    : stage === 'EXPLANATION' ? 'explain'
    : stage === 'CONNECTION' ? 'relate'
    : 'understand'
  const [activeTab, setActiveTab] = useState<string>(defaultTab)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* L1: 认知定位条 — 始终可见，始终第一 */}
      <div style={{
        padding: '16px 20px',
        borderRadius: 'var(--radius-sm, 8px)',
        border: '1px solid var(--color-accent-soft)',
        background: 'var(--color-accent-soft)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--color-accent)',
            }}>
              {stage === 'FACT' && '当前阶段：了解基本事实'}
              {stage === 'EXPLANATION' && '当前阶段：理解因果关系'}
              {stage === 'CONNECTION' && '当前阶段：发现关联'}
              {stage === 'UNDERSTANDING' && '当前阶段：形成理解'}
              {stage === 'NEW_QUESTION' && '当前阶段：新问题浮现'}
            </span>
          </div>
          {coveragePct > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{
                width: 100,
                height: 4,
                borderRadius: 2,
                background: 'var(--color-paper-300)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${coveragePct}%`,
                  borderRadius: 2,
                  background: 'var(--color-truth-strong)',
                  transition: `width var(--motion-duration-slow) var(--motion-ease-standard)`,
                }} />
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-truth-strong)',
              }}>
                {coveragePct}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 标签导航 */}
      <div role="tablist" aria-label="探索视图切换" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm, 8px)',
              border: activeTab === tab.id ? '1px solid var(--color-accent)' : '1px solid var(--color-paper-300)',
              background: activeTab === tab.id ? 'var(--color-accent-soft)' : 'var(--color-paper-100)',
              color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-ink-700)',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 标签内容 */}
      <div role="tabpanel">
        {activeTab === 'explore' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 820, width: '100%', margin: '0 auto', padding: '0 4px' }}>
            {/* 主题信息卡 — 呼应线框图右侧面板，适配 720px 单列布局 */}
            <div style={{ padding: '16px 18px', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--color-paper-300)', background: 'var(--color-paper-100)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-ink-500)', letterSpacing: '0.04em' }}>理解度</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-accent)', fontFamily: 'var(--serif, serif)', lineHeight: 1 }}>{coveragePct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--color-paper-300)', overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: '100%', width: `${coveragePct}%`, background: 'linear-gradient(90deg, var(--color-accent), var(--color-truth-strong))', borderRadius: 999 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {explainSection && (
                  <button type="button" onClick={() => setActiveTab('explain')} style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--color-paper-300)', background: 'var(--color-background-primary)', fontSize: '0.82rem', cursor: 'pointer' }}>开始解释</button>
                )}
                <button type="button" onClick={() => setActiveTab('relate')} style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--color-paper-300)', background: 'var(--color-background-primary)', fontSize: '0.82rem', cursor: 'pointer' }}>查看关系图</button>
              </div>
            </div>
            {exploreSection}
          </div>
        )}
        {activeTab === 'explain' && explainSection && <div>{explainSection}</div>}
        {activeTab === 'relate' && <div>{relateSection}</div>}
        {activeTab === 'understand' && understandingSection && <div>{understandingSection}</div>}
      </div>
    </div>
  )
}

export default UnderstandingCanvas
