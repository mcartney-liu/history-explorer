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
//
// Wave2-#141: the interpretation and supporting sections are now
// collapsible drawers that open when their cognitive stage is
// active (or on user click). The narrative section stays always
// open — a topic view's first screen should answer "what IS this
// topic" before flooding the user with 20 stacked panels.
// ============================================================

import { useState, type ReactNode } from 'react'
import type { ExplorationState } from '../../next/exploration/ExplorationState'
import { Icon } from '../ui/Icon'

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

// Section header component. P5-S2 TP-10: active state via VS-01 accent
// tokens (no gold), no emoji markers (P0-1), motion ease-in-out.
// Wave2-#141: clickable when onToggle is provided (collapsible drawer).
function SectionHeader({ title, subtitle, active, collapsible, expanded, onToggle }: {
  title: string
  subtitle?: string
  active?: boolean
  collapsible?: boolean
  expanded?: boolean
  onToggle?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!collapsible}
      aria-expanded={collapsible ? expanded : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        textAlign: 'left',
        padding: '12px 16px',
        marginBottom: 12,
        borderRadius: 'var(--radius-sm, 8px)',
        border: active
          ? '1px solid var(--color-accent)'
          : '1px solid var(--color-paper-300)',
        background: active
          ? 'var(--color-accent-soft)'
          : 'var(--color-paper-100)',
        cursor: collapsible ? 'pointer' : 'default',
        fontFamily: 'inherit',
      }}
    >
      <span style={{ display: 'block', minWidth: 0 }}>
        <span style={{
          display: 'block',
          fontFamily: 'var(--serif, "Spectral", serif)',
          fontSize: '1rem',
          fontWeight: 700,
          color: active ? 'var(--color-accent)' : 'var(--color-ink-700)',
          marginBottom: subtitle ? 4 : 0,
        }}>
          {title}
        </span>
        {subtitle && (
          <span style={{
            display: 'block',
            fontSize: '0.78rem',
            color: 'var(--color-ink-500)',
            lineHeight: 1.4,
          }}>
            {subtitle}
          </span>
        )}
      </span>
      {collapsible && (
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            marginLeft: 12,
            display: 'inline-flex',
            color: 'var(--color-accent)',
            transition: 'transform var(--motion-duration-normal, 0.2s) var(--motion-ease-standard, ease-in-out)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <Icon name="chevron-down" size={16} />
        </span>
      )}
    </button>
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

  // Wave2-#141: secondary sections are drawers — collapsed by default so the
  // first screen answers "what IS this topic"; a section auto-opens when its
  // cognitive stage becomes active, and the user can toggle manually.
  const [openSections, setOpenSections] = useState<{ interpretation: boolean; supporting: boolean }>({
    interpretation: interpretationActive,
    supporting: supportingActive,
  })
  const interpretationOpen = openSections.interpretation || interpretationActive
  const supportingOpen = openSections.supporting || supportingActive

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ============================================================
          L1: Cognitive Positioning — always visible, always first
          ============================================================ */}
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

      {/* ============================================================
          L2: Content Core — panels organized by cognitive priority
          ============================================================ */}

      {/* Narrative section — what this topic IS (always open) */}
      <SectionHeader
        title={narrativeActive ? '你正在了解这个主题的基本事实' : '这个主题是什么'}
        subtitle="历史叙事、核心实体与背景"
        active={narrativeActive}
      />
      <div style={{ opacity: narrativeActive ? 1 : 0.7, transition: `opacity var(--motion-duration-normal) var(--motion-ease-standard)` }}>
        {narrativeSection}
      </div>

      {/* Interpretation section — WHY things happened (collapsible drawer) */}
      <SectionHeader
        title={interpretationActive ? '你正在探索它们之间的关系' : '它们之间有什么关系'}
        subtitle="因果关系、实体关联与时间线"
        active={interpretationActive}
        collapsible
        expanded={interpretationOpen}
        onToggle={() => setOpenSections((s) => ({ ...s, interpretation: !s.interpretation }))}
      />
      {interpretationOpen && (
        <div style={{ opacity: interpretationActive ? 1 : 0.65, transition: `opacity var(--motion-duration-normal) var(--motion-ease-standard)` }}>
          {interpretationSection}
        </div>
      )}

      {/* Supporting section — WHAT ELSE to explore (collapsible drawer) */}
      <SectionHeader
        title={supportingActive ? '你正在深入理解这个主题' : '还有什么可以探索'}
        subtitle="跨主题连接、AI解读与继续探索"
        active={supportingActive}
        collapsible
        expanded={supportingOpen}
        onToggle={() => setOpenSections((s) => ({ ...s, supporting: !s.supporting }))}
      />
      {supportingOpen && (
        <div style={{ opacity: supportingActive ? 1 : 0.55, transition: `opacity var(--motion-duration-normal) var(--motion-ease-standard)` }}>
          {supportingSection}
        </div>
      )}
    </div>
  )
}

export default UnderstandingCanvas
