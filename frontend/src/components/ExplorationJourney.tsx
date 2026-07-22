// M9-003 (M9-003.2): ExplorationJourney — an additive, presentational
// "exploration journey" panel for the entity view.
//
// Core invariant (enforced by design + tests):
//   - This component is a CONSUMER of App's navigation history. It receives
//     `history` and `cursor` as read-only props and renders a derived view.
//   - It owns NO navigation state: no history, no cursor, no pushHistory call.
//   - Clicking a node delegates to the supplied `onStepClick` (which App wires
//     to `goTo`) — it never navigates on its own.
//   - `journeyReasons` is an ANNOTATION map (gid -> why this node was reached),
//     not a navigation stack. It never enters navigation.ts / pushHistory.
//
// Pure layering (testable under vitest node env, no jsdom):
//   buildJourney()           -> pure function (history, cursor, reasons) -> JourneyEntry[]
//   ExplorationJourneyView    -> pure presentational (renderToStaticMarkup)
//   ExplorationJourney        -> container: thin wrapper, no local nav state

import type { NavNode } from './navigation'
import type { RelationPathStep } from './RecommendationPanel'

// --- Types ---

// The "why this node was reached" annotation, captured when the user follows a
// recommendation. It is an enrichment layer over navigation — never a source
// of navigation truth.
export type JourneyWhyPayload = {
  fromGlobalId: string
  fromName: string
  relationPath: RelationPathStep[]
  reasons: string[]
  score: number
  candidateSource: string
  capturedAt: string
}

export type JourneyEntry = {
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

function nodeKey(node: NavNode): string {
  return node.type === 'entity' ? node.id : node.topic
}

function localName(globalId: string): string {
  if (!globalId || !globalId.includes(':')) return globalId
  return globalId.split(':').slice(1).join(':') || globalId
}

// Build the journey entries from App's navigation history + the why-annotation
// map. Pure & deterministic: same inputs -> same output, no side effects, no
// mutation of the inputs.
export function buildJourney(
  history: NavNode[],
  cursor: number,
  journeyReasons: Map<string, JourneyWhyPayload>,
): JourneyEntry[] {
  return history.map((node, i) => {
    const id = nodeKey(node)
    const label = node.type === 'entity' ? node.name : node.title
    return {
      key: `${node.type}:${id}:${i}`,
      type: node.type,
      id,
      label,
      index: i,
      isCurrent: i === cursor,
      // Annotations are keyed by the target entity global_id (the history
      // node's `id` for entities). Topics never carry a why (recommendations
      // are entity-only), so they gracefully resolve to null.
      incomingWhy: journeyReasons.get(id) ?? null,
    }
  })
}

// --- Pure presentational view ---

type ExplorationJourneyViewProps = {
  entries: JourneyEntry[]
  onStepClick?: (index: number) => void
}

export function ExplorationJourneyView({ entries, onStepClick }: ExplorationJourneyViewProps) {
  // A journey is only meaningful once there is more than one stop — matches
  // ExplorationTrail's "don't render a single node" rule. This is also the
  // empty / no-journey state: render nothing.
  if (!entries || entries.length < 2) return null

  return (
    <section className="he-journey result-section" aria-label="Exploration journey">
      <h3>Your Exploration Journey</h3>
      <ol className="he-journey-list">
        {entries.map((e) => (
          <li key={e.key} className="he-journey-step">
            <button
              type="button"
              className={e.isCurrent ? 'he-journey-node is-current' : 'he-journey-node'}
              aria-current={e.isCurrent ? 'step' : undefined}
              aria-label={e.isCurrent ? `Current: ${e.label}` : `Return to ${e.label}`}
              onClick={() => onStepClick?.(e.index)}
            >
              <span className="he-journey-kind">{e.type === 'topic' ? 'Topic' : 'Entity'}</span>
              <span className="he-journey-label">{e.label}</span>
            </button>

            {e.incomingWhy ? (
              <div
                className="he-journey-why"
                title={`Suggested because: ${e.incomingWhy.reasons.join(' ')}`}
              >
                <span className="he-journey-why-from">via {e.incomingWhy.fromName}</span>
                {e.incomingWhy.reasons.length > 0 ? (
                  <ul className="he-journey-reasons">
                    {e.incomingWhy.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                ) : null}
                {e.incomingWhy.relationPath.length > 0 ? (
                  <div className="he-journey-path">
                    {e.incomingWhy.relationPath.map((step, i) => (
                      <span key={i} className="he-journey-path-step">
                        <span className="he-journey-path-from">{localName(step.from)}</span>
                        <span className="he-journey-path-arrow" aria-hidden="true">
                          →
                        </span>
                        <span className="he-journey-path-rel">{step.relationship}</span>
                        <span className="he-journey-path-arrow" aria-hidden="true">
                          →
                        </span>
                        <span className="he-journey-path-to">{localName(step.to)}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {e.index < entries.length - 1 && (
              <span className="he-journey-arrow" aria-hidden="true">
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

// --- Container (no navigation state; pure derived render) ---

export type ExplorationJourneyProps = {
  history: NavNode[]
  cursor: number
  journeyReasons?: Map<string, JourneyWhyPayload>
  onStepClick?: (index: number) => void
}

function ExplorationJourney({ history, cursor, journeyReasons, onStepClick }: ExplorationJourneyProps) {
  // Derived read of App's navigation truth — no local history/cursor/nav state.
  const entries = buildJourney(history, cursor, journeyReasons ?? new Map())
  return <ExplorationJourneyView entries={entries} onStepClick={onStepClick} />
}

export default ExplorationJourney
