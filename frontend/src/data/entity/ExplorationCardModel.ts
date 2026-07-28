// ============================================================
// M59-007 — ExplorationCardModel
// Universal data shape for all entity display cards.
// Decouples UI (ExplorationCard) from data (EntityViewModel).
// Same model serves: Search, Timeline, Graph, Map, AI, Homepage.
// ============================================================

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
  /** Click target — entity id, global id, topic slug */
  target: string
  /** Relationship context (if card represents a relation) */
  relation?: string
}

/** Build cards from EntityViewModel's graph + relations.
 *  Produces one card per connected entity in the graph.
 */
export function buildCardsFromViewModel(
  graphNodes: { id: string; name: string; type: string }[],
  graphEdges: { source: string; target: string; relation: string; label: string }[],
  getLabel: (type: string) => string,
  getIcon: (type: string) => string,
): ExplorationCardModel[] {
  return graphNodes.map((node) => {
    const rel = graphEdges.find(
      (e) => (e.source === node.id || e.target === node.id),
    )
    return {
      id: node.id,
      title: node.name,
      subtitle: getLabel(node.type),
      entityType: node.type,
      icon: getIcon(node.type),
      summary: rel ? `Connected via ${rel.label}` : '',
      badges: [getLabel(node.type)],
      meta: { type: node.type },
      target: node.id,
      relation: rel?.relation,
    }
  })
}
