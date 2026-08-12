import { useEffect, useState } from 'react'
import {
  listResearch,
  listResearchMerged,
  deleteResearchRemote,
  type SavedResearch,
} from '../data/ResearchHistory'
import Icon from './ui/Icon'

export type ResearchLibraryProps = {
  onSelect?: (research: SavedResearch) => void
  /** Bump to re-read (e.g. after a new research was saved). */
  refreshKey?: number
}

/** Map a raw entityType string to a stable visual variant class. */
const TYPE_VARIANT: Record<string, string> = {
  Civilization: 'civ',
  Dynasty: 'dyn',
  Empire: 'dyn',
  Event: 'event',
  War: 'event',
  Person: 'person',
  Figure: 'person',
  Location: 'loc',
  Place: 'loc',
  Concept: 'concept',
  Idea: 'concept',
  Technology: 'tech',
  Religion: 'rel',
  Culture: 'culture',
}
function typeVariant(entityType: string): string {
  return TYPE_VARIANT[entityType] ?? 'default'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return d.toLocaleDateString('zh-CN')
}

export function ResearchLibraryView({
  onSelect,
  // Stateful props for testability
  items = [] as SavedResearch[],
  onDelete = (_id: string) => {},
}: ResearchLibraryProps & {
  items?: SavedResearch[]
  onDelete?: (id: string) => void
}) {
  return (
    <div className="rlib">
      <div className="rlib-head">
        <Icon name="book" size={20} className="rlib-head-icon" />
        <h3 className="rlib-title">研究库</h3>
        <span className="rlib-count">{items.length} 项</span>
      </div>

      {items.length === 0 ? (
        <div className="rlib-empty">
          <Icon name="scroll" size={24} className="rlib-empty-icon" />
          <p>暂无保存的研究。完成一次研究后，点击"收藏"即可保存到这里。</p>
        </div>
      ) : (
        <div className="rlib-grid">
          {items.map((r) => (
            <article
              key={r.id}
              className={`rlib-card rlib-card--${typeVariant(r.entityType)}`}
            >
              <div className="rlib-card-rail" aria-hidden="true" />
              <div className="rlib-card-body">
                <div className="rlib-card-header">
                  <span className="rlib-card-type">{r.entityType}</span>
                  {r.bookmarked && (
                    <Icon name="star" size={16} className="rlib-card-star" filled />
                  )}
                </div>
                <h4 className="rlib-card-name">{r.entityName}</h4>
                {r.comparedNames.length > 0 && (
                  <p className="rlib-card-compare">
                    <Icon name="compare" size={16} className="rlib-card-compare-icon" />
                    vs {r.comparedNames.join(' · ')}
                  </p>
                )}
                <div className="rlib-card-meta">
                  <span className="rlib-meta-chip">
                    {r.dimensions.filter((d) => d.status === 'success').length}/{r.dimensions.length} 维度
                  </span>
                  <span className="rlib-meta-chip">
                    {r.dimensions.reduce((sum, d) => sum + d.citationCount, 0)} 条引用
                  </span>
                  <span className="rlib-meta-chip rlib-meta-chip--time">
                    {formatDate(r.createdAt)}
                  </span>
                </div>
                <div className="rlib-card-actions">
                  <button
                    type="button"
                    className="rlib-card-open"
                    onClick={() => onSelect?.(r)}
                  >
                    <Icon name="book" size={16} />
                    打开
                  </button>
                  <button
                    type="button"
                    className="rlib-card-delete"
                    aria-label={`删除 ${r.entityName} 的研究`}
                    onClick={() => onDelete(r.id)}
                  >
                    <Icon name="close" size={16} />
                    删除
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ResearchLibrary(props: ResearchLibraryProps) {
  // Local store renders synchronously (always available, works offline);
  // the backend merge lands right after and replaces it.
  const [items, setItems] = useState<SavedResearch[]>(() => listResearch())

  useEffect(() => {
    let cancelled = false
    setItems(listResearch())
    listResearchMerged().then((merged) => {
      if (!cancelled) setItems(merged)
    })
    return () => { cancelled = true }
  }, [props.refreshKey])

  async function handleDelete(id: string) {
    await deleteResearchRemote(id)
    setItems(await listResearchMerged())
  }

  return (
    <ResearchLibraryView
      {...props}
      items={items}
      onDelete={handleDelete}
    />
  )
}
