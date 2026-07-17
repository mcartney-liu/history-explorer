// Recent Explorations (M2-003, requirement 3).
// Shown on the landing (Home) screen. Lists the last visited topics and
// entities (persisted to localStorage, max 10) as clickable chips so a user
// can jump straight back into an exploration. Pure presentational component.

import { NavNode } from './navigation'

type RecentExplorationsProps = {
  items: NavNode[]
  onSelect: (node: NavNode) => void
  onClear?: () => void
}

function RecentExplorations({ items, onSelect, onClear }: RecentExplorationsProps) {
  if (items.length === 0) return null
  return (
    <section className="he-recent result-section" aria-label="Recent explorations">
      <div className="search-results-head">
        <h3>Recent Explorations</h3>
        {onClear && (
          <button className="link-button" type="button" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      <ul className="he-recent-list">
        {items.map((node) => (
          <li key={`${node.type}:${node.type === 'topic' ? node.topic : node.id}`}>
            <button
              type="button"
              className="he-recent-chip"
              onClick={() => onSelect(node)}
            >
              <span className="he-recent-kind">{node.type === 'topic' ? 'Topic' : 'Entity'}</span>
              <span className="he-recent-label">
                {node.type === 'topic' ? node.title : node.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default RecentExplorations
