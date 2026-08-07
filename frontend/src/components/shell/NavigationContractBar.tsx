// ============================================================
// M90.3 Stage B-2 — Navigation Contract Bar
//
// Renders: From / Why / Value — the contract that tells the
// user WHY they are looking at this specific entity/relation.
//
// Data source: ExplorerRuntimeContext (currentAnchor, previousAnchor,
// activeRelation, cognitiveStage).
//
// Per EP-002 and EC-003:
//   - Every navigation must carry From / Why / Value.
//   - This bar is ALWAYS visible (never auto-hides).
//
// The "Continue Exploring" button triggers a context-preserving
// navigation. In Stage E, this will open a modal with
// understanding-gap-driven suggestions.
//
// Stage D will: replace inline styles with a proper Primitive.
// Stage E will: wire the "Continue" button to real suggestions.
// ============================================================

import { useMemo } from 'react'
import { Icon } from '../ui/Icon'

interface NavigationContractBarProps {
  /** The current anchor entity the user is looking at. */
  currentAnchor: { id: string; label?: string; type?: string } | null
  /** The previous anchor (where the user came from). */
  previousAnchor: { id: string; label?: string; type?: string } | null
  /** The active relation explaining why this transition happened. */
  activeRelation: { fromRef: string; toRef: string; descriptionRef?: string } | null
  /** Current cognitive stage from the projection engine. */
  cognitiveStage: string | null
  /** Callback for "Continue Exploring". */
  onContinue: () => void
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

export function NavigationContractBar({
  currentAnchor,
  previousAnchor,
  activeRelation,
  cognitiveStage,
  onContinue,
}: NavigationContractBarProps) {
  const hasContext = currentAnchor !== null

  const fromLabel = useMemo(() => {
    if (!previousAnchor) return null
    return previousAnchor.label ?? previousAnchor.id
  }, [previousAnchor])

  const whyLabel = useMemo(() => {
    if (!activeRelation) return null
    // In Stage E, this will resolve descriptionRef from Causal Layer.
    return activeRelation.descriptionRef ?? '语义关系'
  }, [activeRelation])

  const valueLabel = useMemo(() => {
    if (!currentAnchor) return null
    return currentAnchor.label ?? currentAnchor.id
  }, [currentAnchor])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    }}>
      {/* Left: navigation contract */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {hasContext ? (
          <>
            {fromLabel && (
              <span style={{ fontSize: '0.8rem', color: 'var(--low, #6B7280)' }}>
                ← 来自 <span style={{ color: 'var(--mid, #9CA3AF)' }}>{fromLabel}</span>
              </span>
            )}
            {whyLabel && (
              <span style={{ fontSize: '0.8rem', color: 'var(--low, #6B7280)' }}>
                因为 <span style={{ color: 'var(--gold-mid, #CBA135)', fontStyle: 'italic' }}>{whyLabel}</span>
              </span>
            )}
            {valueLabel && (
              <span style={{ fontSize: '0.85rem', color: 'var(--hi, #F3F4F6)', fontWeight: 500 }}>
                {valueLabel}
              </span>
            )}
          </>
        ) : (
          <span style={{ fontSize: '0.8rem', color: 'var(--low, #6B7280)', fontStyle: 'italic' }}>
            选择一个探索路径开始你的理解旅程
          </span>
        )}
      </div>

      {/* Right: stage indicator + continue */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {cognitiveStage && (
          <span style={{
            fontSize: '0.75rem',
            color: 'var(--gold-mid, #CBA135)',
            background: 'var(--gold-glow, rgba(203,161,53,0.08))',
            padding: '2px 10px',
            borderRadius: 'var(--radius-sm, 4px)',
          }}>
            {stageLabel(cognitiveStage)}
          </span>
        )}
        <button
          type="button"
          onClick={onContinue}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 16px',
            borderRadius: 'var(--radius-sm, 6px)',
            fontSize: '0.85rem',
            color: 'var(--gold-hi, #CBA135)',
            background: 'transparent',
            border: '1px solid var(--gold-line, rgba(203,161,53,0.3))',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
        >
          <Icon name="research" size={16} />
          继续探索
        </button>
      </div>
    </div>
  )
}
