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

const EVIDENCE_STYLES: Record<EvidenceType, { badge: string; border: string; bg: string }> = {
  fact: { badge: '#4FA784', border: 'rgba(79,167,132,0.2)', bg: 'rgba(79,167,132,0.04)' },
  source: { badge: '#9CA3AF', border: 'rgba(156,163,175,0.2)', bg: 'rgba(156,163,175,0.04)' },
  curator: { badge: '#CBA135', border: 'rgba(203,161,53,0.2)', bg: 'rgba(203,161,53,0.04)' },
  timeline: { badge: '#6D28D9', border: 'rgba(109,40,217,0.2)', bg: 'rgba(109,40,217,0.04)' },
  interpretation: { badge: '#3B82F6', border: 'rgba(59,130,246,0.2)', bg: 'rgba(59,130,246,0.04)' },
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
        transition: 'border-color 0.2s ease',
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
          color: 'var(--hi, #F3F4F6)',
          margin: '0 0 8px 0',
        }}>
          {title}
        </h4>
      )}

      {/* Body */}
      <div style={{
        fontSize: '0.85rem',
        color: 'var(--mid, #9CA3AF)',
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
          color: 'var(--low, #6B7280)',
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
