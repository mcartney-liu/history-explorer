// ============================================================
// M59-007 — ExplorationCardModel
// Universal data shape for all entity display cards.
// Decouples UI (ExplorationCard) from data (EntityViewModel).
// Same model serves: Search, Timeline, Graph, Map, AI, Homepage.
// M90.x (PO 实测): 构建"继续探索"卡时 summary 之前硬编码英文
// "Connected via ${rel.label}" + rel.label 英文——改为 i18n + locale 翻译。
// ============================================================

import { getRelationshipLabel } from './entityLabels'
import { getEntityDisplayName } from '../explorationPackages'
import type { Locale } from '../../data/locale'

export interface ExplorationCardModel {
  id: string
  /** Display title — entity name, event label, search result name */
  title: string
  /** Subtitle — type label, date, relationship type */
  subtitle: string
  /** Entity type for icon + color */
  entityType: string
  /** Emoji or SVG icon */
  icon: string
  /** Short description (1-2 lines) */
  summary: string
  /** Metadata tags */
  badges: string[]
  /** Structured metadata */
  meta: Record<string, string>
  /** Thumbnail / avatar image URL (optional) */
  thumbnail?: string
  /** Static generated entity portrait URL (optional) — e.g. /entity-logos/<globalId>.png.
   *  When set, the card renders this image in the icon slot and falls back to the
   *  type Icon on load error. Populated by callers that have a global_id. */
  image?: string
  /** Click target — entity id, global id, topic slug */
  target: string
  /** Relationship context (if card represents a relation) */
  relation?: string
}

/** Build cards from EntityViewModel's graph + relations.
 *  Produces one card per connected entity in the graph.
 *  M90.x: summary 由调用方提供的 t()/locale 走 i18n + rel 翻译（不再是英文硬编码）。
 */
export function buildCardsFromViewModel(
  graphNodes: { id: string; name: string; type: string }[],
  graphEdges: { source: string; target: string; relation: string; label: string }[],
  getLabel: (type: string) => string,
  getIcon: (type: string) => string,
  locale: Locale,
  t: (key: string, vars?: Record<string, string>) => string,
): ExplorationCardModel[] {
  return graphNodes.map((node) => {
    const rel = graphEdges.find(
      (e) => (e.source === node.id || e.target === node.id),
    )
    return {
      id: node.id,
      title: getEntityDisplayName(node.id, locale),
      subtitle: getLabel(node.type),
      entityType: node.type,
      icon: getIcon(node.type),
      summary: rel
        ? t('relationship.connectedVia', { rel: getRelationshipLabel(rel.relation, locale) })
        : '',
      badges: [getLabel(node.type)],
      meta: { type: node.type },
      target: node.id,
      relation: rel?.relation,
    }
  })
}
