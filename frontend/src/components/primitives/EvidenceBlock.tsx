// ============================================================
// M90.3 Stage D-1 — EvidenceBlock (Explorer Primitive)
//
// Replaces the "证据展示" role currently handled by scattered
// Panels (SummaryPanel, WhyImportantPanel, ProvenancePanel, etc.)
// with a single semantic primitive.
//
// EvidenceBlock is NOT a Panel — it's an Explorer Primitive
// with a fixed, constrained shape:
//   [Type Badge] [Title] [Evidence Text] [Source Citation]
//
// Stage D-2 will migrate existing Panels to use this block.
// ============================================================

import { type ReactNode } from 'react'

// ============================================================
// Types
// ============================================================

export type EvidenceType = 'fact' | 'source' | 'curator' | 'timeline' | 'interpretation'

export interface EvidenceBlockProps {
  /** What kind of evidence this is. */
  type: EvidenceType
  /** Optional semantic label (e.g. "核心事实", "来源出处"). */
  label?: string
  /** The evidence title (entity name, curator headline, etc.). */
  title?: string
  /** The evidence body text. */
  children: ReactNode
  /** Optional source citation (e.g. "《资治通鉴》卷十二"). */
  source?: string
  /** Optional provenance entity to link. */
  provenanceId?: string
  /** Called when the provenance link is clicked. */
  onProvenanceClick?: (id: string) => void
  /** Whether this evidence is the currently "active" one in the understanding flow. */
  active?: boolean
}

// ============================================================
// Type → color mapping (from Design System V1)
// ============================================================

// P5-S2 TP-08/真值层: type colors converge to the VS-01 semantic palette
// (VS-04 rule 4 — tokenized, no bare hex; VS-01 强调色克制 — single accent,
// no purple/blue side palette). Mapping: fact=truth-strong · source=ink-500
// (neutral) · curator=accent (product-curated) · timeline=truth-moderate ·
// interpretation=status-info (information, not objection).
const EVIDENCE_STYLES: Record<EvidenceType, { badge: string; border: string; bg: string }> = {
  fact: { badge: 'var(--color-truth-strong)', border: 'var(--color-truth-strong-line)', bg: 'var(--color-truth-strong-soft)' },
  source: { badge: 'var(--color-ink-500)', border: 'var(--color-paper-300)', bg: 'var(--color-paper-100)' },
  curator: { badge: 'var(--color-accent)', border: 'var(--color-accent-soft)', bg: 'var(--color-accent-soft)' },
  timeline: { badge: 'var(--color-truth-moderate)', border: 'var(--color-truth-moderate-soft)', bg: 'var(--color-truth-moderate-soft)' },
  interpretation: { badge: 'var(--color-status-info)', border: 'var(--color-status-info-soft)', bg: 'var(--color-status-info-soft)' },
}

const TYPE_LABELS: Record<EvidenceType, string> = {
  fact: '事实',
  source: '出处',
  curator: '策展',
  timeline: '时间线',
  interpretation: '解释',
}

// ============================================================
// Component
// ============================================================

export function EvidenceBlock({
  type,
  label,
  title,
  children,
  source,
  provenanceId,
  onProvenanceClick,
  active,
}: EvidenceBlockProps) {
  const style = EVIDENCE_STYLES[type]

  return (
    <div
      className={`evidence-block${active ? ' evidence-block--active' : ''}`}
      style={{
        padding: 'var(--space-4, 16px)',
        borderRadius: 'var(--radius-md, 8px)',
        border: `1px solid ${style.border}`,
        background: style.bg,
        transition: `border-color var(--motion-duration-fast) var(--motion-ease-standard)`,
        ...(active ? { borderColor: style.badge } : {}),
      }}
    >
      {/* Header: type badge + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          color: style.badge,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {label ?? TYPE_LABELS[type]}
        </span>
      </div>

      {/* Title */}
      {title && (
        <h4 style={{
          fontFamily: 'var(--serif, "Spectral", serif)',
          fontSize: '0.95rem',
          fontWeight: 600,
          color: 'var(--color-ink-900)',
          margin: '0 0 8px 0',
        }}>
          {title}
        </h4>
      )}

      {/* Body */}
      <div style={{
        fontSize: '0.85rem',
        color: 'var(--color-ink-500)',
        lineHeight: 1.6,
      }}>
        {children}
      </div>

      {/* Footer: source citation + provenance link */}
      {(source || provenanceId) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 12,
          paddingTop: 10,
          borderTop: `1px solid ${style.border}`,
          fontSize: '0.75rem',
          color: 'var(--color-ink-500)',
        }}>
          {source && (
            <span>来源：{source}</span>
          )}
          {provenanceId && onProvenanceClick && (
            <button
              type="button"
              onClick={() => onProvenanceClick(provenanceId)}
              style={{
                background: 'none',
                border: 'none',
                color: style.badge,
                cursor: 'pointer',
                fontSize: '0.75rem',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              查看出处
            </button>
          )}
        </div>
      )}
    </div>
  )
}
