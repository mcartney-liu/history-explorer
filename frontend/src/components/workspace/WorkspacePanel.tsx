// ============================================================
// M59-009 — WorkspacePanel
// Museum-style exploration workspace. "Research desk" sidebar.
// Sections: Current, History, Pinned, Notebook, Compare, AI.
// Pure presentational. Mock state. Future backend wire point.
// ============================================================

// M59-020: now uses real navigation history data.
// M65 Phase 1: left-rail layout with collapsed/expanded visual state.
// M65 Phase 3B: real pin/unpin with localStorage persistence.
import { useState, type ReactNode } from 'react'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/Icon'
import { ExplorationPathCard } from './ExplorationPathCard'
import { ExplorationHistoryList } from './ExplorationHistoryList'
import {
  getPinnedEntities,
  addPinnedEntity,
  removePinnedEntity,
} from '../../lib/workspaceStore'
import type { PinnedEntity } from '../../lib/pinnedStore'

// ---- Data types ----
export interface WorkspaceItem {
  id: string
  title: string
  subtitle: string
  icon: string
  timestamp?: string
}

interface WorkspaceSectionProps {
  title: string
  children: ReactNode
  badge?: string
}

// ---- Section ----
export function WorkspaceSection({ title, children, badge }: WorkspaceSectionProps) {
  return (
    <div className="ws-section">
      <div className="ws-section-header">
        <h4 className="ws-section-title">{title}</h4>
        {badge && <span className="ws-section-badge">{badge}</span>}
      </div>
      <div className="ws-section-body">{children}</div>
    </div>
  )
}

// ---- Item ----
export function WorkspaceItem({ item, onClick }: { item: WorkspaceItem; onClick?: () => void }) {
  return (
    <div className="ws-item" role="button" tabIndex={0} onClick={onClick}>
      <Icon name={item.icon as IconName} size={16} className="ws-item-icon" />
      <div className="ws-item-body">
        <span className="ws-item-title">{item.title}</span>
        <span className="ws-item-subtitle">{item.subtitle}</span>
      </div>
      {item.timestamp && (
        <span className="ws-item-time">{item.timestamp}</span>
      )}
    </div>
  )
}

// ---- Placeholder ----
export function WorkspacePlaceholder({ label }: { label: string }) {
  return (
    <div className="ws-placeholder">
      <span className="ws-placeholder-icon">+</span>
      <span className="ws-placeholder-label">{label}</span>
    </div>
  )
}

// ---- Main Panel ----
interface WorkspacePanelProps {
  current?: WorkspaceItem | null
  history?: WorkspaceItem[]
  // name is passed so the breadcrumb can display the human-readable entity
  // name (e.g. "凯撒") instead of the local id (e.g. "person-julius-caesar").
  onEntityClick?: (id: string, name?: string) => void
}

export function WorkspacePanel({
  current,
  history = [],
  onEntityClick,
}: WorkspacePanelProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [pinned, setPinned] = useState<PinnedEntity[]>(getPinnedEntities)

  // Refresh pinned list on expand (in case external changes occurred)
  const pinnedIds = pinned.map((p) => p.id)
  const currentIsPinned = current ? pinnedIds.includes(current.id) : false

  const handlePin = () => {
    if (!current) return
    if (currentIsPinned) {
      setPinned(removePinnedEntity(current.id))
    } else {
      setPinned(
        addPinnedEntity({
          id: current.id,
          title: current.title,
          subtitle: current.subtitle,
          icon: current.icon,
          pinnedAt: Date.now(),
        })
      )
    }
  }

  const handleUnpin = (id: string) => {
    setPinned(removePinnedEntity(id))
  }

  if (collapsed) {
    return (
      <aside className="ws-rail-collapsed" aria-label="探索工作台">
        <button
          className="ws-rail-expand"
          onClick={() => setCollapsed(false)}
          aria-label="展开工作台"
          aria-expanded={false}
          title="展开工作台"
        >
          <Icon name="book" size={20} />
        </button>
        {current && (
          <button
            className="ws-rail-current"
            onClick={() => onEntityClick?.(current.id, current.title)}
            aria-label={current.title}
            title={current.title}
          >
            <span className="ws-rail-dot" />
          </button>
        )}
        {history.length > 0 && (
          <div className="ws-rail-history">
            {history.slice(0, 5).map((h) => (
              <button
                key={h.id}
                className="ws-rail-node"
                onClick={() => onEntityClick?.(h.id, h.title)}
                aria-label={h.title}
                title={h.title}
              >
                <span className="ws-rail-dot-sm" />
              </button>
            ))}
          </div>
        )}
      </aside>
    )
  }

  return (
    <aside className="ws" aria-label="探索工作台">
      {/* Brand + collapse */}
      <div className="ws-brand">
        <span className="ws-brand-name">探索工作台</span>
        <button
          className="ws-rail-collapse"
          onClick={() => setCollapsed(true)}
          aria-label="折叠工作台"
          aria-expanded={true}
          title="折叠工作台"
        >
          <Icon name="arrow-right" size={16} />
        </button>
      </div>

      {/* Current */}
      <WorkspaceSection title="当前探索" badge={current ? '1' : undefined}>
        {current ? (
          <div className="ws-current-row">
            <WorkspaceItem
              item={current}
              onClick={() => onEntityClick?.(current.id, current.title)}
            />
            <button
              className="ws-pin-btn"
              onClick={handlePin}
              aria-label={currentIsPinned ? '取消置顶' : '置顶'}
              title={currentIsPinned ? '取消置顶' : '置顶'}
            >
              <Icon name="star" size={16} />
            </button>
          </div>
        ) : (
          <WorkspacePlaceholder label="点击任意实体开始探索" />
        )}
      </WorkspaceSection>

      {/* History — real data from navigation stack */}
      <WorkspaceSection title="探索足迹" badge={history.length > 0 ? String(history.length) : undefined}>
        {history.length > 0 ? (
          <>
            <ExplorationPathCard path={history.map((h) => h.title)} />
            <div style={{ height: 'var(--space-2)' }} />
            <ExplorationHistoryList
              items={history.map((h, i) => ({
                id: h.id,
                entityId: h.id,
                name: h.title,
                type: h.subtitle,
                visitedAt: Date.now() - (history.length - i) * 60000,
                source: 'related' as const,
                depth: i,
              }))}
              onItemClick={(id, name) => onEntityClick?.(id, name)}
            />
          </>
        ) : (
          <WorkspacePlaceholder label="你探索过的实体会出现在这里" />
        )}
      </WorkspaceSection>

      {/* Pinned */}
      <WorkspaceSection title="已置顶" badge={pinned.length > 0 ? String(pinned.length) : undefined}>
        {pinned.length > 0 ? (
          pinned.map((p) => (
            <div key={p.id} className="ws-current-row">
              <WorkspaceItem
                item={{ id: p.id, title: p.title, subtitle: p.subtitle, icon: p.icon }}
                onClick={() => onEntityClick?.(p.id, p.title)}
              />
              <button
                className="ws-pin-btn"
                onClick={() => handleUnpin(p.id)}
                aria-label="取消置顶"
                title="取消置顶"
              >
                <Icon name="star" size={16} />
              </button>
            </div>
          ))
        ) : (
          <WorkspacePlaceholder label="点击实体旁的星标即可置顶，方便快速返回" />
        )}
      </WorkspaceSection>

      {/* Notebook */}
      <WorkspaceSection title="研究笔记">
        <WorkspacePlaceholder label="在研究面板中记录你的历史发现" />
      </WorkspaceSection>

      {/* Compare */}
      <WorkspaceSection title="对比队列">
        <WorkspacePlaceholder label="添加多个实体，横向对比时间线或关系" />
      </WorkspaceSection>

      {/* AI Assistant entry */}
      <WorkspaceSection title="AI 助手">
        <div className="ws-ai-entry">
          <Icon name="chat" size={16} className="ws-ai-icon" />
          <span className="ws-ai-label">与历史学家对话</span>
        </div>
      </WorkspaceSection>
    </aside>
  )
}

export default WorkspacePanel
