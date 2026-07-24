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

// Renders grounded citations and rejected citations SIDE BY SIDE. Rejected
// citations are NEVER hidden and NEVER made clickable — the user must see what
// the backend refused to verify, but cannot be misled into treating it as a
// navigable fact.
export default function CitationList({
  citations,
  rejected_citations = [],
  onCitationClick,
}: CitationListProps) {
  const valid = citations ?? []
  const rejected = rejected_citations ?? []

  return (
    <div className="citation-list">
      {valid.length > 0 && (
        <div className="cl-group">
          <h4 className="cl-heading">事实引用（{valid.length}）</h4>
          <ul className="cl-items">
            {valid.map((c, i) => (
              <li
                key={`${c.global_id}-${i}`}
                className="cl-item is-clickable"
                role="button"
                tabIndex={0}
                aria-label={`查看引用来源 ${c.label || c.global_id}`}
                onClick={() => onCitationClick?.(c.global_id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onCitationClick?.(c.global_id)
                  }
                }}
              >
                <span className="cl-kind">{KIND_LABEL[c.kind] ?? c.kind}</span>
                <span className="cl-label">{c.label || c.global_id}</span>
                <span className="cl-id">{c.global_id}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rejected.length > 0 && (
        <div className="cl-group cl-group-rejected">
          <h4 className="cl-heading">未通过验证的引用（{rejected.length}）</h4>
          <ul className="cl-items">
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
        </div>
      )}
    </div>
  )
}
