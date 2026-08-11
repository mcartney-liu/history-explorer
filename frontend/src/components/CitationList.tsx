import { useState } from 'react'
import type { AICitation } from '../data/aiClient'

type CitationListProps = {
  citations: AICitation[]
  rejected_citations?: AICitation[]
  // Host-supplied navigation: clicking a verified citation opens its entity.
  onCitationClick?: (global_id: string) => void
}

const KIND_LABEL: Record<string, string> = {
  entity: '实体',
  relationship: '关系',
  timeline: '时间线',
}

// Renders grounded citations and rejected citations. Rejected citations are
// NEVER made clickable — the user must see what the backend refused to verify,
// but cannot be misled into treating it as a navigable fact. By default the
// rejected list is COLLAPSED to save space; the user can expand it on demand.
export default function CitationList({
  citations,
  rejected_citations = [],
  onCitationClick,
}: CitationListProps) {
  const valid = citations ?? []
  const rejected = rejected_citations ?? []
  const [showRejected, setShowRejected] = useState(false)

  return (
    <div className="citation-list">
      {valid.length > 0 && (
        <div className="cl-group">
          <h4 className="cl-heading">事实引用（{valid.length}）</h4>
          <ul className="cl-items">
            {valid.map((c, i) => {
              // M12-2: entity / relationship citations are navigable facts and
              // stay clickable (consistent with M12-1). Timeline citations use a
              // SYNTHETIC global_id that GlobalGraph cannot resolve, so clicking
              // them would dead-link — they render as plain (non-clickable)
              // references. This is the only kind-aware guard added in M12-2.
              const clickable = c.kind === 'entity' || c.kind === 'relationship'
              return (
              <li
                key={`${c.global_id}-${i}`}
                className={`cl-item${clickable ? ' is-clickable' : ''}`}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                aria-label={`${clickable ? '查看引用来源 ' : '引用来源 '}${c.label || c.global_id}`}
                onClick={clickable ? () => onCitationClick?.(c.global_id) : undefined}
                onKeyDown={clickable ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onCitationClick?.(c.global_id)
                  }
                } : undefined}
              >
                <span className="cl-kind">{KIND_LABEL[c.kind] ?? c.kind}</span>
                <span className="cl-label">{c.label || c.global_id}</span>
                <span className="cl-id">{c.global_id}</span>
              </li>
              )
            })}
          </ul>
        </div>
      )}

      {rejected.length > 0 && (
        <div className="cl-group cl-group-rejected">
          <button
            type="button"
            className="cl-rejected-toggle"
            aria-expanded={showRejected}
            onClick={() => setShowRejected((v) => !v)}
          >
            <span className="cl-rejected-label">
              未通过验证的引用（{rejected.length}）
            </span>
            <span className="cl-rejected-chevron" aria-hidden="true">
              {showRejected ? '收起' : '展开'}
            </span>
          </button>
          {showRejected && (
            <ul className="cl-items cl-items-rejected">
              {rejected.map((c, i) => (
                <li
                  key={`rejected-${c.global_id}-${i}`}
                  className="cl-item cl-item-rejected"
                  aria-disabled="true"
                >
                  <span className="cl-kind">{KIND_LABEL[c.kind] ?? c.kind}</span>
                  <span className="cl-label">{c.label || c.global_id}</span>
                  <span className="cl-id">{c.global_id}</span>
                  <span className="cl-rejected-tag">未通过验证</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
