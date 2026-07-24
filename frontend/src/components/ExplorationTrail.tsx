// @deprecated M10-2: superseded by ExplorationPathTree for the shared
// full-journey view. This file and its tests are intentionally RETAINED (not
// deleted) per the M10-2 trail-convergence decision — App no longer renders it
// by default, but the component stays importable/testable and can be restored.
//
// M5-B-2: "Exploration Trail" — a footprint log of the user's WHOLE journey.
//
// Unlike Breadcrumb (which shows only Home -> current cursor, a hierarchical
// path that truncates at the cursor), the Trail renders the FULL visited
// history in visiting order, marking the current position, so a user can look
// back over everywhere they've been and jump back to continue from any point
// (Stage 5, Continuous Discovery). It reuses the existing history/cursor model
// and the single goTo navigation (via onStepClick) — no new navigation
// mechanism. Strictly additive & pure presentational: renders nothing until
// the journey has more than one stop (a single node is "where you are", not a
// trail); App owns all state and handlers.

// Minimal presentational node shape declared locally so this component does
// NOT import from navigation.ts. App still passes its own NavNode[]; the
// structural subset below is all the Trail renders — no navigation logic here.
// Declared as a discriminated union (same two node shapes App's NavNode uses)
// so each branch narrows to a concrete string — no `string | undefined` leaks
// into the render path.
type TrailNode =
  | { type: 'topic'; topic: string; title: string }
  | { type: 'entity'; id: string; name: string }

type ExplorationTrailProps = {
  history: TrailNode[]
  cursor: number
  onStepClick: (index: number) => void
}

function stepLabel(node: TrailNode): string {
  return node.type === 'topic' ? node.title : node.name
}

function stepKey(node: TrailNode, i: number): string {
  const id = node.type === 'topic' ? node.topic : node.id
  return `${node.type}:${id}:${i}`
}

function ExplorationTrail({ history, cursor, onStepClick }: ExplorationTrailProps) {
  // A trail is only meaningful once there is more than one stop.
  if (!history || history.length < 2) return null

  return (
    <section className="he-trail result-section" aria-label="Exploration trail">
      <h3>Your Exploration Trail</h3>
      <ol className="he-trail-list">
        {history.map((node, i) => {
          const isCurrent = i === cursor
          return (
            <li key={stepKey(node, i)} className="he-trail-step">
              <button
                type="button"
                className={isCurrent ? 'he-trail-node is-current' : 'he-trail-node'}
                aria-label={
                  isCurrent ? `Current: ${stepLabel(node)}` : `Return to ${stepLabel(node)}`
                }
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => onStepClick(i)}
              >
                <span className="he-trail-kind">
                  {node.type === 'topic' ? 'Topic' : 'Entity'}
                </span>
                <span className="he-trail-label">{stepLabel(node)}</span>
              </button>
              {i < history.length - 1 && (
                <span className="he-trail-arrow" aria-hidden="true">
                  {'→'}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default ExplorationTrail
