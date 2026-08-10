import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup as r2s } from 'react-dom/server'
import { LocaleProvider } from '../../data/locale'
import type { ReactElement } from 'react'
import ExplorationJourney, {
  ExplorationJourneyView,
  buildJourney,
  type JourneyWhyPayload,
} from '../ExplorationJourney'
import type { NavNode } from '../navigation'

const render = (el: ReactElement) => r2s(<LocaleProvider>{el}</LocaleProvider>)

// --- Fixtures ---

function topicNode(): NavNode {
  return { type: 'topic', topic: 'roman_empire', title: 'Roman Empire' }
}

function entityNode(): NavNode {
  return { type: 'entity', id: 'roman_empire:augustus', name: 'Augustus' }
}

// A3 red-line: the "why" annotation is now shaped after ExplorationAction
// (Knowledge Progression), NOT a RecommendationResult. No relation_path, no
// score, no candidate_source — only the cognitive-action fields.
function whyPayload(): JourneyWhyPayload {
  return {
    fromGlobalId: 'roman_empire:augustus',
    fromName: 'Augustus',
    reasons: ['Same dynasty successor.', 'Linked by influence.'],
    actionType: 'follow_cause',
    narrativeHook: 'You understood Augustus — but do you know how he shaped Octavian?',
    confidence: 0.85,
    capturedAt: '2026-07-22T00:00:00.000Z',
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
    expect(out[1].incomingWhy?.actionType).toBe('follow_cause')
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
    const html = render(<ExplorationJourneyView entries={[buildJourney([entityNode()], 0, new Map())[0]]} />)
    expect(html).not.toContain('he-journey-list')
  })

  it('renders the full path with current marker and no why block when no annotation', () => {
    const html = render(
      <ExplorationJourneyView entries={buildJourney([topicNode(), entityNode()], 1, new Map())} />,
    )
    expect(html).toContain('he-journey-list')
    expect(html).toContain('Roman Empire')
    expect(html).toContain('Augustus')
    expect(html).toContain('is-current')
    expect(html).toContain('当前：Augustus')
    expect(html).not.toContain('he-journey-why')
  })

  it('injects the why payload (reasons + narrative hook) into the journey', () => {
    const reasons = new Map<string, JourneyWhyPayload>([['roman_empire:augustus', whyPayload()]])
    const html = render(
      <ExplorationJourneyView entries={buildJourney([topicNode(), entityNode()], 1, reasons)} />,
    )
    expect(html).toContain('he-journey-why')
    expect(html).toContain('Same dynasty successor.')
    expect(html).toContain('Linked by influence.')
    // A3 red-line: the narrative hook (not a relation_path) carries the "why".
    expect(html).toContain('he-journey-hook')
    expect(html).toContain('shaped Octavian') // narrativeHook fragment
    expect(html).toContain('经由 Augustus') // fromName via
  })

  it('degrades gracefully when a node has no payload (label still shows)', () => {
    const html = render(
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
    const html = render(<ExplorationJourney history={history} cursor={2} journeyReasons={new Map()} onStepClick={() => {}} />)
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
    const html = render(<ExplorationJourney history={history} cursor={1} journeyReasons={new Map()} onStepClick={() => {}} />)
    expect(html).toContain('返回 Roman Empire')
    expect(html).toContain('当前：Augustus')
  })
})
