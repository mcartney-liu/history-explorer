// ============================================================
// M59-020 — ExplorationHistoryList
// Pure presentational. Renders workspace history items.
// ============================================================

import type { ExplorationHistoryItem } from '../../data/workspace/ExplorationHistoryModel'
import { Icon } from '../ui/Icon'

interface ExplorationHistoryListProps {
  items: ExplorationHistoryItem[]
  // name is passed so the parent can navigate by local id while still keeping
  // the human-readable display name (e.g. for breadcrumbs / journey entries).
  onItemClick?: (id: string, name?: string) => void
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return '刚刚'
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`
  return `${Math.floor(s / 3600)} 小时前`
}

export function ExplorationHistoryList({ items, onItemClick }: ExplorationHistoryListProps) {
  if (items.length === 0) {
    return (
      <div className="ehl-empty">
        <span className="ehl-empty-icon">⟶</span>
        <span>探索的实体将在此显示</span>
      </div>
    )
  }

  return (
    <div className="ehl">
      {[...items].reverse().slice(0, 8).map((item, i) => (
        <div
          key={item.id}
          className="ehl-item"
          role="button"
          tabIndex={0}
          onClick={() => onItemClick?.(item.entityId, item.name)}
        >
          <div className="ehl-item-left">
            <Icon
              name={item.type === 'entity' ? 'book' : 'globe'}
              size={16}
              className="ehl-item-icon"
            />
            <div>
              <span className="ehl-item-name">{item.name || item.id}</span>
              {i === items.length - 1 && (
                <span className="ehl-item-current">当前</span>
              )}
            </div>
          </div>
          <span className="ehl-item-time">{timeAgo(item.visitedAt)}</span>
        </div>
      ))}
    </div>
  )
}

export default ExplorationHistoryList
