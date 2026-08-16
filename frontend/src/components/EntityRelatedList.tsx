// ============================================================
// M9-001 family — EntityRelatedList
//
// Entity-page Research tab: "what else can I study" list.
// Pulls deterministic, explainable related entities from the graph engine
// (GET /api/v1/related-entities?gid= -> generate_candidates). No AI, no DB.
//
// Resilience (FRW): on mount we show nothing until data arrives; on error or
// empty result we render NOTHING (no broken shell, no empty placeholder that
// pretends to be content). The list only appears when it actually has entries.
// ============================================================

import { useEffect, useState } from 'react'
import { API_BASE } from '../config/api'
import CollapsibleList from './ui/CollapsibleList'
import { getEntityIcon } from '../data/entity/entityLabels'
import { Icon } from '../components/ui/Icon'
import type { IconName } from '../components/ui/Icon'

type EntityRelatedListProps = {
  /** Global id of the current entity, e.g. "roman_empire:civ-roman". */
  gid: string
  /** Navigate to a related entity (lands on its default tab; user can open Research). */
  onEntityClick: (gid: string, name?: string) => void
}


// Chinese labels for entity types. Covers both lowercase abbreviations
// (person/civ/religion…) and PascalCase (Person/Civilization/Religion…) as
// they appear in the graph, so the UI never shows a raw English type token.
const ENTITY_TYPE_LABELS_ZH: Record<string, string> = {
  person: '人物',
  people: '人物',
  event: '事件',
  location: '地点',
  loc: '地点',
  organization: '组织',
  org: '组织',
  concept: '概念',
  idea: '思想',
  artifact: '器物',
  tech: '技术',
  technology: '技术',
  civilization: '文明',
  civ: '文明',
  religion: '宗教',
  // PascalCase variants actually emitted by the graph
  Person: '人物',
  Event: '事件',
  Location: '地点',
  Organization: '组织',
  Concept: '概念',
  Idea: '思想',
  Artifact: '器物',
  Tech: '技术',
  Technology: '技术',
  Civilization: '文明',
  Religion: '宗教',
}

function typeLabel(type: string): string {
  return ENTITY_TYPE_LABELS_ZH[type] || type || '实体'
}

type RelatedItem = {
  global_id: string
  name: string
  type: string
  reason?: string
}

function toRelatedItem(raw: unknown): RelatedItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const te = (r.target_entity ?? {}) as Record<string, unknown>
  const gid = typeof te.global_id === 'string' ? te.global_id : ''
  const name = typeof te.name === 'string' ? te.name : ''
  if (!gid || !name) return null
  const reasons = Array.isArray(r.reasons) ? (r.reasons as unknown[]) : []
  const reason = typeof reasons[0] === 'string' ? (reasons[0] as string) : undefined
  return {
    global_id: gid,
    name,
    type: typeof te.type === 'string' ? te.type : '',
    reason,
  }
}

export function EntityRelatedList({ gid, onEntityClick }: EntityRelatedListProps) {
  const [items, setItems] = useState<RelatedItem[] | null>(null) // null = loading
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!gid) return
    let cancelled = false
    setItems(null)
    setFailed(false)

    fetch(`${API_BASE}/api/v1/related-entities?gid=${encodeURIComponent(gid)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { recommendations?: unknown[] } | null) => {
        if (cancelled) return
        const recs = data?.recommendations || []
        const parsed = recs
          .map(toRelatedItem)
          .filter((x): x is RelatedItem => x !== null)
        if (parsed.length === 0) {
          setItems([]) // empty -> render nothing
        } else {
          setItems(parsed)
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [gid])

  // Resilience: only render when we have real entries. Loading / error / empty
  // all collapse to "no block" — never a broken shell.
  if (failed || items === null || items.length === 0) return null

  return (
    <section className="he-related" aria-label="相关实体">
      <h3 className="he-related-head">相关实体 · 可以继续追问</h3>
      <CollapsibleList className="he-related-list" visible={5}>
        {items.map((it) => (
          <li key={it.global_id} className="he-related-item">
              <button
                type="button"
                className="he-related-btn"
                onClick={() => onEntityClick(it.global_id, it.name)}
              >
                <span className="he-related-type">{typeLabel(it.type)}</span>
                <Icon name={getEntityIcon(it.type) as IconName} size={16} className="he-related-name-icon" />
                <span className="he-related-name">{it.name}</span>
                {it.reason ? (
                  <span className="he-related-reason">{it.reason}</span>
                ) : null}
              </button>
            </li>
        ))}
      </CollapsibleList>
    </section>
  )
}

export default EntityRelatedList
