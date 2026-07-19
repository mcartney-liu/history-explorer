// M5-A-6: deterministic field mapping ConnectionExplained -> InterpretationViewModel.
//
// This is a PURE, additive mapping. It does NOT generate any text, does NOT
// invent history, does NOT produce relationshipHint, and does NOT call any AI /
// LLM / API. `explanation` is preserved VERBATIM from the backend's
// deterministic exploration data. `localName` is derived solely from the
// global_id (last segment after ':'), matching the existing resolveLocalName
// rule used by ConnectionsExplainedPanel / ExplorationPathsPanel — no other
// data source is consulted.
import { ConnectionExplained } from '../components/ConnectionsExplainedPanel'

export type InterpretationViewModel = {
  global_id: string
  localName: string
  depth: number
  score: number
  explanation: string
}

function localName(globalId: string): string {
  if (!globalId || !globalId.includes(':')) return globalId
  return globalId.split(':').slice(1).join(':') || globalId
}

// Map a single ConnectionExplained to its view model. Field-for-field only.
export function toInterpretationViewModel(
  conn: ConnectionExplained,
): InterpretationViewModel {
  return {
    global_id: conn.global_id,
    localName: localName(conn.global_id),
    depth: conn.depth,
    score: conn.score,
    explanation: conn.explanation,
  }
}

// Map a list; absent/empty input yields an empty list (panel then renders nothing).
export function toInterpretationViewModels(
  connections?: ConnectionExplained[],
): InterpretationViewModel[] {
  if (!connections || connections.length === 0) return []
  return connections.map(toInterpretationViewModel)
}
