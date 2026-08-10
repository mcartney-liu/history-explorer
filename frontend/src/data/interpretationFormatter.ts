// M5-A-6: deterministic field mapping ConnectionExplained -> InterpretationViewModel.
//
// PURE, additive mapping. Bilingual via the data-layer labels
// (explorationPackages.getEntityDisplayName, driven by the active locale) and a
// locally-assembled `explanation` built from `steps`
// (from_global_id / relationship / to_global_id). This keeps entity names AND
// the "why" sentence in the SAME locale — no backend English prose, no AI text,
// no invented history. `explanation` verbatim from the backend is only used as
// a fallback when a connection has no structured `steps`.
import { ConnectionExplained } from '../components/ConnectionsExplainedPanel'
import { getEntityDisplayName, type Locale } from './explorationPackages'
import { getRelationshipLabel } from './entity/entityLabels'

export type InterpretationViewModel = {
  global_id: string
  localName: string
  depth: number
  score: number
  explanation: string
}

interface PathStep {
  from_global_id: string
  to_global_id: string
  relationship: string
  direction?: string
}

// Assemble a bilingual "why" sentence from the structured path. Each hop reads
// the data-layer label for the current locale, so zh/en/ja stay consistent with
// the entity names rendered elsewhere.
function buildBilingualExplanation(conn: ConnectionExplained, locale: Locale): string {
  const steps = Array.isArray(conn.steps) ? (conn.steps as PathStep[]) : []
  if (steps.length === 0) return conn.explanation || ''
  return steps
    .map((s) => {
      const from = getEntityDisplayName(s.from_global_id, locale)
      const to = getEntityDisplayName(s.to_global_id, locale)
      const rel = s.relationship ? getRelationshipLabel(s.relationship, locale) : ''
      return rel ? `${from} ${rel} ${to}` : `${from} ${to}`
    })
    .join('；')
}

// Map a single ConnectionExplained to its view model. Field-for-field only.
// locale defaults to 'zh' — caller passes the active locale for bilingual output.
export function toInterpretationViewModel(
  conn: ConnectionExplained,
  locale: string = 'zh',
): InterpretationViewModel {
  const loc: Locale = locale === 'en' || locale === 'ja' ? locale : 'zh'
  return {
    global_id: conn.global_id,
    localName: getEntityDisplayName(conn.global_id, loc),
    depth: conn.depth,
    score: conn.score,
    explanation: buildBilingualExplanation(conn, loc),
  }
}

// Map a list; absent/empty input yields an empty list (panel then renders nothing).
export function toInterpretationViewModels(
  connections?: ConnectionExplained[],
  locale: string = 'zh',
): InterpretationViewModel[] {
  if (!connections || connections.length === 0) return []
  return connections.map((c) => toInterpretationViewModel(c, locale))
}
