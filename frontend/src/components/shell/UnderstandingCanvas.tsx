// ============================================================
// M90.3 — UnderstandingCanvas
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
// ============================================================

import { type ReactNode } from 'react'
import type { ExplorationState } from '../../next/exploration/ExplorationState'

interface UnderstandingCanvasProps {
  /** Current cognitive stage */
  cognitiveStage: string | null
  /** Current exploration state */
  explorationState: ExplorationState | null
  /** All topic root panels (the original JSX from App.tsx) */
  children?: ReactNode
  /** Narrative section panels */
  narrativeSection: ReactNode
  /** Interpretation section panels */
  interpretationSection: ReactNode
  /** Supporting section panels */
  supportingSection: ReactNode
}

// Section header component
function SectionHeader({ title, subtitle, active }: {
  title: string
  subtitle?: string
  active?: boolean
}) {
  return (
    <div style={{
      padding: '12px 16px',
      marginBottom: 12,
      borderRadius: 'var(--radius-sm, 8px)',
      border: active
        ? '1px solid var(--gold-line, rgba(203,161,53,0.3))'
        : '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
      background: active
        ? 'var(--gold-glow, rgba(203,161,53,0.04))'
        : 'rgba(255,255,255,0.02)',
    }}>
      <div style={{
        fontFamily: 'var(--serif, "Spectral", serif)',
        fontSize: '1rem',
        fontWeight: 700,
        color: active ? 'var(--gold-hi, #CBA135)' : 'var(--mid, #9CA3AF)',
        marginBottom: subtitle ? 4 : 0,
      }}>
        {title}
      </div>
      {subtitle && (
        <div style={{
          fontSize: '0.78rem',
          color: 'var(--low, #6B7280)',
          lineHeight: 1.4,
        }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

export function UnderstandingCanvas({
  cognitiveStage,
  explorationState,
  narrativeSection,
  interpretationSection,
  supportingSection,
}: UnderstandingCanvasProps) {
  const stage = cognitiveStage || 'FACT'
  const coveragePct = explorationState
    ? Math.round(explorationState.coverageRatio * 100)
    : 0

  // Determine which section is "active" based on cognitive stage
  const narrativeActive = stage === 'FACT'
  const interpretationActive = stage === 'EXPLANATION' || stage === 'CONNECTION'
  const supportingActive = stage === 'UNDERSTANDING' || stage === 'NEW_QUESTION'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ============================================================
          L1: Cognitive Positioning — always visible, always first
          ============================================================ */}
      <div style={{
        padding: '16px 20px',
        borderRadius: 'var(--radius-sm, 8px)',
        border: '1px solid var(--gold-line, rgba(203,161,53,0.2))',
        background: 'var(--gold-glow, rgba(203,161,53,0.03))',
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
              color: 'var(--gold-hi, #CBA135)',
            }}>
              {stage === 'FACT' && '🔍 当前阶段：了解基本事实'}
              {stage === 'EXPLANATION' && '💡 当前阶段：理解因果关系'}
              {stage === 'CONNECTION' && '🔗 当前阶段：发现关联'}
              {stage === 'UNDERSTANDING' && '🧠 当前阶段：形成理解'}
              {stage === 'NEW_QUESTION' && '❓ 当前阶段：新问题浮现'}
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
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#4FA784',
              }}>
                {coveragePct}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          L2: Content Core — panels organized by cognitive priority
          ============================================================ */}

      {/* Narrative section — what this topic IS */}
      <SectionHeader
        title={narrativeActive ? '👆 你正在了解这个主题的基本事实' : '这个主题是什么'}
        subtitle="历史叙事、核心实体与背景"
        active={narrativeActive}
      />
      <div style={{ opacity: narrativeActive ? 1 : 0.7, transition: 'opacity 0.3s' }}>
        {narrativeSection}
      </div>

      {/* Interpretation section — WHY things happened */}
      <SectionHeader
        title={interpretationActive ? '👆 你正在探索它们之间的关系' : '它们之间有什么关系'}
        subtitle="因果关系、实体关联与时间线"
        active={interpretationActive}
      />
      <div style={{ opacity: interpretationActive ? 1 : 0.65, transition: 'opacity 0.3s' }}>
        {interpretationSection}
      </div>

      {/* Supporting section — WHAT ELSE to explore */}
      <SectionHeader
        title={supportingActive ? '👆 你正在深入理解这个主题' : '还有什么可以探索'}
        subtitle="跨主题连接、AI解读与继续探索"
        active={supportingActive}
      />
      <div style={{ opacity: supportingActive ? 1 : 0.55, transition: 'opacity 0.3s' }}>
        {supportingSection}
      </div>
    </div>
  )
}

export default UnderstandingCanvas
