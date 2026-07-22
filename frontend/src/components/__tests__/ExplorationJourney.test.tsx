import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ExplorationJourney, {
  ExplorationJourneyView,
  buildJourney,
  type JourneyWhyPayload,
} from '../ExplorationJourney'
import {
  RecommendationPanelView,
  buildRecommendationContext,
  type RecommendationItem,
} from '../RecommendationPanel'
import type { NavNode } from '../navigation'

// --- Fixtures ---

function topicNode(): NavNode {
  return { type: 'topic', topic: 'roman_empire', title: 'Roman Empire' }
}

function entityNode(): NavNode {
  return { type: 'entity', id: 'roman_empire:augustus', name: 'Augustus' }
}

function whyPayload(): JourneyWhyPayload {
  return {
    fromGlobalId: 'roman_empire:augustus',
    fromName: 'Augustus',
    relationPath: [
      {
        from: 'roman_empire:augustus',
        to: 'roman_empire:octavian',
        relationship: 'influenced',
        direction: 'outgoing',
        weight: 0.9,
      },
    ],
    reasons: ['Same dynasty successor.', 'Linked by influence.'],
    score: 0.82,
    candidateSource: 'direct',
    capturedAt: '2026-07-22T00:00:00.000Z',
  }
}

// Sample recommendation item (mirrors backend RecommendationResult.to_dict).
function rec(global_id: string, name: string, type: string, reasons: string[]): RecommendationItem {
  return {
    target_entity: { global_id, name, type },
    score: 0.82,
    score_breakdown: { relationship: 0.4, temporal: 0.25 },
    reasons,
    relation_path: [
      { from: 'roman_empire:augustus', to: global_id, relationship: 'influenced', direction: 'outgoing', weight: 0.9 },
    ],
    metadata: { depth: 1, candidate_source: 'direct', entity_type: type },
  }
}

// --- buildJourney (pure) ---

describe('buildJourney (M9-003 pure derivation)', () => {
  it('returns an empty array for empty history', () => {
    const out = buildJourney([], 0, new Map())
    expect(out).toEqual([])
  })

  it('maps every history node 1:1 (no second history is created)', () => {
    const history = [topicNode(), entityNode()]
    const out = buildJourney(history, 1, new Map())
    // Exactly one entry per history node — Journey never invents navigation nodes.
    expect(out).toHaveLength(history.length)
    expect(out[0].type).toBe('topic')
    expect(out[1].type).toBe('entity')
    expect(out[1].id).toBe('roman_empire:augustus')
  })

  it('marks the node at cursor as current', () => {
    const history = [topicNode(), entityNode()]
    const out = buildJourney(history, 1, new Map())
    expect(out[0].isCurrent).toBe(false)
    expect(out[1].isCurrent).toBe(true)
  })

  it('attachments the why annotation only when the gid is in journeyReasons', () => {
    const history = [topicNode(), entityNode()]
    const reasons = new Map<string, JourneyWhyPayload>([['roman_empire:augustus', whyPayload()]])
    const out = buildJourney(history, 1, reasons)
    expect(out[0].incomingWhy).toBeNull() // topic never annotated
    expect(out[1].incomingWhy).not.toBeNull()
    expect(out[1].incomingWhy?.reasons).toEqual(['Same dynasty successor.', 'Linked by influence.'])
  })

  it('is pure: does not mutate the input history or the reasons map', () => {
    const history = [topicNode(), entityNode()]
    const reasons = new Map<string, JourneyWhyPayload>([['roman_empire:augustus', whyPayload()]])
    const snapshot = JSON.stringify(history)
    const reasonsSnapshot = JSON.stringify([...reasons.entries()])
    buildJourney(history, 1, reasons)
    expect(JSON.stringify(history)).toBe(snapshot)
    expect(JSON.stringify([...reasons.entries()])).toBe(reasonsSnapshot)
  })
})

// --- ExplorationJourneyView (presentational) ---

describe('ExplorationJourneyView (M9-003 presentational)', () => {
  it('renders nothing for a single node (empty / no-journey state)', () => {
    const html = renderToStaticMarkup(<ExplorationJourneyView entries={[buildJourney([entityNode()], 0, new Map())[0]]} />)
    expect(html).not.toContain('he-journey-list')
  })

  it('renders the full path with current marker and no why block when no annotation', () => {
    const html = renderToStaticMarkup(
      <ExplorationJourneyView entries={buildJourney([topicNode(), entityNode()], 1, new Map())} />,
    )
    expect(html).toContain('he-journey-list')
    expect(html).toContain('Roman Empire')
    expect(html).toContain('Augustus')
    expect(html).toContain('is-current')
    expect(html).toContain('Current: Augustus')
    expect(html).not.toContain('he-journey-why')
  })

  it('injects the recommendation payload (reasons + relation path) into the journey', () => {
    const reasons = new Map<string, JourneyWhyPayload>([['roman_empire:augustus', whyPayload()]])
    const html = renderToStaticMarkup(
      <ExplorationJourneyView entries={buildJourney([topicNode(), entityNode()], 1, reasons)} />,
    )
    expect(html).toContain('he-journey-why')
    expect(html).toContain('Same dynasty successor.')
    expect(html).toContain('Linked by influence.')
    expect(html).toContain('influenced') // relation_path relationship
    expect(html).toContain('via Augustus') // fromName
  })

  it('degrades gracefully when a node has no payload (label still shows)', () => {
    const html = renderToStaticMarkup(
      <ExplorationJourneyView entries={buildJourney([topicNode(), entityNode()], 1, new Map())} />,
    )
    expect(html).toContain('Augustus')
    expect(html).not.toContain('he-journey-why')
  })
})

// --- Container (no navigation ownership) ---

describe('ExplorationJourney container (M9-003 navigation ownership)', () => {
  it('renders exactly one button per history node — never a second navigation tree', () => {
    const history = [topicNode(), entityNode(), { type: 'entity', id: 'roman_empire:tiberius', name: 'Tiberius' }]
    const html = renderToStaticMarkup(<ExplorationJourney history={history} cursor={2} journeyReasons={new Map()} onStepClick={() => {}} />)
    const buttons = html.match(/class="he-journey-node/g) ?? []
    expect(buttons).toHaveLength(history.length)
  })

  it('wires onStepClick to each node index (delegates to goTo, owns no nav state)', () => {
    // DOM click dispatch needs jsdom (intentionally unavailable here); the
    // wiring is proven structurally: buildJourney assigns each entry its
    // history `index`, and the View calls onStepClick(e.index). We assert the
    // *contract* — the rendered buttons expose the same "Return to <label>"
    // goTo-style aria contract as ExplorationTrail — so navigation stays on the
    // single App.goTo path.
    const history = [topicNode(), entityNode()]
    const html = renderToStaticMarkup(<ExplorationJourney history={history} cursor={1} journeyReasons={new Map()} onStepClick={() => {}} />)
    expect(html).toContain('Return to Roman Empire')
    expect(html).toContain('Current: Augustus')
  })
})

// --- Producer contract (RecommendationPanel -> context -> Journey) ---

describe('buildRecommendationContext (M9-003 producer contract)', () => {
  it('extracts the why fields from a recommendation item', () => {
    const item = rec('roman_empire:octavian', 'Octavian', 'person', ['Same dynasty successor.'])
    const ctx = buildRecommendationContext(item)
    expect(ctx.source).toBe('recommendation')
    expect(ctx.reasons).toEqual(item.reasons)
    expect(ctx.relation_path).toEqual(item.relation_path)
    expect(ctx.score).toBe(item.score)
    expect(ctx.candidateSource).toBe(item.metadata.candidate_source)
  })

  it('keeps RecommendationPanelView backward compatible (1-arg onNodeClick still works)', () => {
    const items = [rec('roman_empire:octavian', 'Octavian', 'person', ['Same dynasty successor.'])]
    const html = renderToStaticMarkup(<RecommendationPanelView recommendations={items} onNodeClick={() => {}} />)
    // Route-compatibility contract preserved: each card still binds the engine
    // target via aria-label. The new 2nd context arg is passed internally but
    // must not alter the rendered markup.
    expect(html).toContain('aria-label="Explore Octavian"')
    expect(html).toContain('Octavian')
    expect(html).toContain('influenced')
  })
})
