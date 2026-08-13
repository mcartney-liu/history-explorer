// M10-1: ExplorationPathTree — a NEW, additive "exploration path" visualization.
//
// CORE INVARIANT (enforced by design + tests):
//   Trail != Knowledge Graph.
//   This component renders ONLY the user's navigation history as a traversed
//   PATH (an indented, ordered sequence of the stops the user actually visited,
//   with the current stop highlighted and each stop's "why I got here" reason
//   when one was captured). It renders NO relationship edges, NO recommendation
//   graph, NO entity graph. The Knowledge Graph (RelationshipView) remains the
//   sole source of historical relationships — this is purely a personal trail.
//
// Layering (mirrors ExplorationJourney / ExplorationTrail):
//   buildPathTree()        -> pure function (history, cursor, reasons) -> PathTreeEntry[]
//   ExplorationPathTreeView-> pure presentational (renderToStaticMarkup)
//   ExplorationPathTree    -> container: thin wrapper, no local nav state
//
// The component is a CONSUMER of App's navigation history. It receives
// `history` and `cursor` as read-only props and renders a derived view. It owns
// NO navigation state: no history, no cursor, no pushHistory call. Clicking a
// stop delegates to the supplied `onStepClick` (which App wires to `goTo`) —
// it never navigates on its own.

import type { NavNode } from './navigation'
import type { JourneyWhyPayload } from './ExplorationJourney'
import { useLocale } from '../data/locale'
import { getCausalObjectName } from '../data/causalObjectNames'

// The "why this stop was reached" annotation, captured when the user follows a
// recommendation. It is an enrichment layer over navigation — never a source
// of navigation truth. Reused from ExplorationJourney to avoid a second
// definition.
export type PathTreeEntry = {
  key: string
  type: 'topic' | 'entity'
  id: string
  label: string
  index: number
  isCurrent: boolean
  // Null when the node was reached by direct navigation (no recommendation
  // context was captured for it).
  incomingWhy: JourneyWhyPayload | null
}

// --- Pure helpers ---

// Annotation lookup key matches how App stores journeyReasons: entity nodes
// are keyed by their global_id (`node.id`); topics never carry a why
// (recommendations are entity-only) and resolve to null.
function reasonKey(node: NavNode): string {
  if (node.type === 'entity') return node.id
  if (node.type === 'causal_object') return node.objectId
  return node.topic
}

// Build the path-tree entries from App's navigation history + the why-annotation
// map. Pure & deterministic: same inputs -> same output, no side effects, no
// mutation of the inputs.
export function buildPathTree(
  history: NavNode[],
  cursor: number,
  journeyReasons: Map<string, JourneyWhyPayload>,
): PathTreeEntry[] {
  return history.map((node, i) => {
    const id = reasonKey(node)
    const label = node.type === 'entity' ? node.name : node.type === 'causal_object' ? getCausalObjectName(node.objectId) : node.title
    return {
      key: `${node.type}:${id}:${i}`,
      type: node.type as PathTreeEntry['type'],
      id,
      label,
      index: i,
      isCurrent: i === cursor,
      // Annotations are keyed by the target entity global_id for entities;
      // topics gracefully resolve to null.
      incomingWhy: journeyReasons.get(id) ?? null,
    }
  })
}

// --- Pure presentational view ---

type ExplorationPathTreeViewProps = {
  entries: PathTreeEntry[]
  onStepClick?: (index: number) => void
}

export function ExplorationPathTreeView({ entries, onStepClick }: ExplorationPathTreeViewProps) {
  const { t } = useLocale()
  // A path is only meaningful once there is more than one stop — matches
  // ExplorationTrail's "don't render a single node" rule. This is also the
  // empty / no-path state: render nothing.
  if (!entries || entries.length < 2) return null

  return (
    <section className="he-pathtree result-section" aria-label={t('discover.pathAria')}>
      <h3>{t('discover.pathHeading')}</h3>
      <ol className="he-pathtree-list">
        {entries.map((e) => (
          <li key={e.key} className="he-pathtree-step">
            <button
              type="button"
              className={e.isCurrent ? 'he-pathtree-node is-current' : 'he-pathtree-node'}
              aria-current={e.isCurrent ? 'step' : undefined}
              aria-label={t(e.isCurrent ? 'discover.currentAria' : 'discover.returnToAria', {
                label: e.label,
              })}
              onClick={() => onStepClick?.(e.index)}
            >
              <span className="he-pathtree-kind">
                {e.type === 'topic' ? t('common.kindTopic') : t('common.kindEntity')}
              </span>
              <span className="he-pathtree-label">{e.label}</span>
            </button>

            {e.incomingWhy ? (
              <div
                className="he-pathtree-why"
                title={`${t('discover.suggestedBecause')} ${e.incomingWhy.reasons.join(' ')}`}
              >
                <span className="he-pathtree-why-from">
                  {t('discover.via', { name: e.incomingWhy.fromName })}
                </span>
                {e.incomingWhy.reasons.length > 0 ? (
                  <ul className="he-pathtree-reasons">
                    {e.incomingWhy.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {e.index < entries.length - 1 && (
              <span className="he-pathtree-arrow" aria-hidden="true">
                {'→'}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

// --- Container (no navigation state; pure derived render) ---

export type ExplorationPathTreeProps = {
  history: NavNode[]
  cursor: number
  journeyReasons?: Map<string, JourneyWhyPayload>
  onStepClick?: (index: number) => void
}

function ExplorationPathTree({ history, cursor, journeyReasons, onStepClick }: ExplorationPathTreeProps) {
  // Derived read of App's navigation truth — no local history/cursor/nav state.
  const entries = buildPathTree(history, cursor, journeyReasons ?? new Map())
  return <ExplorationPathTreeView entries={entries} onStepClick={onStepClick} />
}

export default ExplorationPathTree
