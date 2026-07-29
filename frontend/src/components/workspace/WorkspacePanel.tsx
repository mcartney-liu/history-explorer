// ============================================================
// M59-009 — WorkspacePanel
// Museum-style exploration workspace. "Research desk" sidebar.
// Sections: Current, History, Pinned, Notebook, Compare, AI.
// Pure presentational. Mock state. Future backend wire point.
// ============================================================

// M59-020: now uses real navigation history data.
import type { ReactNode } from 'react'
import { ExplorationPathCard } from './ExplorationPathCard'
import { ExplorationHistoryList } from './ExplorationHistoryList'

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
      <span className="ws-item-icon">{item.icon}</span>
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
  return (
    <aside className="ws" aria-label="探索工作台">
      {/* Brand */}
      <div className="ws-brand">
        <span className="ws-brand-name">探索工作台</span>
      </div>

      {/* Current */}
      <WorkspaceSection title="当前探索" badge={current ? '1' : undefined}>
        {current ? (
          <WorkspaceItem
            item={current}
            onClick={() => onEntityClick?.(current.id, current.title)}
          />
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
      <WorkspaceSection title="已置顶">
        <WorkspacePlaceholder label="长按实体卡片即可置顶，方便快速返回" />
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
          <span className="ws-ai-icon">💬</span>
          <span className="ws-ai-label">与历史学家对话</span>
        </div>
      </WorkspaceSection>
    </aside>
  )
}

export default WorkspacePanel
