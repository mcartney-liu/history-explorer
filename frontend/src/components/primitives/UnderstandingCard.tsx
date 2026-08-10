// ============================================================
// M90.3 Stage D-1 — UnderstandingCard (Explorer Primitive)
//
// Renders a single "Understanding Transition":
//   Before Belief → Evidence → After Belief
//
// This is the core cognitive unit of the product. It replaces
// the InterpretationPanel / ConnectionsExplainedPanel pattern
// of rendering flat lists of "connections explained".
//
// Stage D-2 will migrate existing Understanding panels to
// use this card.
// ============================================================

import { type ReactNode } from 'react'

// ============================================================
// Types
// ============================================================

export type TransitionDirection = 'cause→effect' | 'effect→cause' | 'co-occurrence'

export interface UnderstandingCardProps {
  /** The belief BEFORE encountering this evidence. */
  before: string
  /** The evidence that caused the transition. */
  evidence: ReactNode
  /** The belief AFTER encountering this evidence. */
  after: string
  /** The direction of the causal transition. */
  direction?: TransitionDirection
  /** Confidence level (0–1). */
  confidence?: number
  /** The Curator-written explanation of WHY this transition matters. */
  curatorNote?: string
}

// ============================================================
// Direction → label
// ============================================================

const DIRECTION_LABELS: Record<TransitionDirection, string> = {
  'cause→effect': '因 → 果',
  'effect→cause': '果 → 因',
  'co-occurrence': '共现',
}

// ============================================================
// Component
// ============================================================

export function UnderstandingCard({
  before,
  evidence,
  after,
  direction,
  confidence,
  curatorNote,
}: UnderstandingCardProps) {
  // P5-S2 TP-13: VS-01 tokens — cognitive-transition card is Sub-layer
  // (user's own understanding trajectory) → accent family; no gold/hex/ease.
  const goldHi = 'var(--color-accent)'
  const goldGlow = 'var(--color-accent-soft)'
  const goldLine = 'var(--color-accent-soft)'

  return (
    <div style={{
      padding: 'var(--space-5, 20px)',
      borderRadius: 'var(--radius-md, 8px)',
      border: `1px solid ${goldLine}`,
      background: goldGlow,
      transition: `border-color var(--motion-duration-fast) var(--motion-ease-standard)`,
    }}>
      {/* Before */}
      <div style={{
        fontSize: '0.8rem',
        color: 'var(--color-ink-500)',
        marginBottom: 12,
      }}>
        <span style={{ fontWeight: 600, color: 'var(--color-ink-500)' }}>之前认为：</span>
        <span style={{ fontFamily: 'var(--serif, "Spectral", serif)', fontStyle: 'italic' }}>
          {before}
        </span>
      </div>

      {/* Evidence */}
      <div style={{
        padding: '12px 16px',
        borderLeft: `3px solid ${goldHi}`,
        marginBottom: 12,
        background: 'var(--color-accent-soft)',
      }}>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: goldHi,
          marginBottom: 6,
        }}>
          {direction ? DIRECTION_LABELS[direction] : '证据'}
          {confidence !== undefined && (
            <span style={{
              marginLeft: 8,
              fontSize: '0.7rem',
              fontWeight: 400,
              color: 'var(--color-ink-500)',
            }}>
              {(confidence * 100).toFixed(0)}% 置信度
            </span>
          )}
        </div>
        <div style={{
          fontSize: '0.85rem',
          color: 'var(--color-ink-900)',
          lineHeight: 1.6,
        }}>
          {evidence}
        </div>
      </div>

      {/* After */}
      <div style={{
        fontSize: '0.85rem',
        color: 'var(--color-ink-900)',
        fontFamily: 'var(--serif, "Spectral", serif)',
        lineHeight: 1.5,
        fontWeight: 500,
      }}>
        <span style={{ fontWeight: 600, color: goldHi }}>现在理解：</span>
        {after}
      </div>

      {/* Curator note */}
      {curatorNote && (
        <div style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: `1px solid ${goldLine}`,
          fontSize: '0.75rem',
          color: 'var(--color-ink-500)',
          lineHeight: 1.5,
        }}>
          <span style={{ fontWeight: 600, color: 'var(--color-ink-500)' }}>策展说明：</span>
          {curatorNote}
        </div>
      )}
    </div>
  )
}
