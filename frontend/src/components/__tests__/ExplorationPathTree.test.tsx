import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ExplorationPathTree, {
  ExplorationPathTreeView,
  buildPathTree,
  type PathTreeEntry,
} from '../ExplorationPathTree'
import type { NavNode } from '../navigation'
import type { JourneyWhyPayload } from '../ExplorationJourney'

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
    relationPath: [],
    reasons: ['Same dynasty successor.'],
    score: 0.82,
    candidateSource: 'direct',
    capturedAt: '2026-07-22T00:00:00.000Z',
  }
}

// --- buildPathTree (pure) ---

describe('buildPathTree (M10-1 pure derivation)', () => {
  it('returns an empty array for empty history', () => {
    expect(buildPathTree([], 0, new Map())).toEqual([])
  })

  it('maps every history node 1:1 — never invents navigation nodes', () => {
    const history = [topicNode(), entityNode()]
    const out = buildPathTree(history, 1, new Map())
    expect(out).toHaveLength(history.length)
    expect(out[0].type).toBe('topic')
    expect(out[1].type).toBe('entity')
    expect(out[1].id).toBe('roman_empire:augustus')
  })

  it('marks the node at cursor as current', () => {
    const out = buildPathTree([topicNode(), entityNode()], 1, new Map())
    expect(out[0].isCurrent).toBe(false)
    expect(out[1].isCurrent).toBe(true)
  })

  it('attaches the why annotation only when the gid is present', () => {
    const reasons = new Map<string, JourneyWhyPayload>([['roman_empire:augustus', whyPayload()]])
    const out = buildPathTree([topicNode(), entityNode()], 1, reasons)
    expect(out[0].incomingWhy).toBeNull()
    expect(out[1].incomingWhy?.reasons).toEqual(['Same dynasty successor.'])
  })

  it('is pure: does not mutate the input history or reasons map', () => {
    const history = [topicNode(), entityNode()]
    const reasons = new Map<string, JourneyWhyPayload>([['roman_empire:augustus', whyPayload()]])
    const snap = JSON.stringify(history)
    const rSnap = JSON.stringify([...reasons.entries()])
    buildPathTree(history, 1, reasons)
    expect(JSON.stringify(history)).toBe(snap)
    expect(JSON.stringify([...reasons.entries()])).toBe(rSnap)
  })
})

// --- ExplorationPathTreeView (presentational) ---

describe('ExplorationPathTreeView (M10-1 presentational)', () => {
  it('renders nothing for a single node (empty / no-path state)', () => {
    const html = renderToStaticMarkup(
      <ExplorationPathTreeView entries={[buildPathTree([entityNode()], 0, new Map())[0]]} />,
    )
    expect(html).not.toContain('he-pathtree-list')
  })

  it('renders the full path with current marker and no why when no annotation', () => {
    const html = renderToStaticMarkup(
      <ExplorationPathTreeView entries={buildPathTree([topicNode(), entityNode()], 1, new Map())} />,
    )
    expect(html).toContain('he-pathtree-list')
    expect(html).toContain('Roman Empire')
    expect(html).toContain('Augustus')
    expect(html).toContain('is-current')
    expect(html).toContain('Current: Augustus')
    expect(html).not.toContain('he-pathtree-why')
  })

  it('injects the arrival reason (via + reasons) into the path', () => {
    const reasons = new Map<string, JourneyWhyPayload>([['roman_empire:augustus', whyPayload()]])
    const html = renderToStaticMarkup(
      <ExplorationPathTreeView entries={buildPathTree([topicNode(), entityNode()], 1, reasons)} />,
    )
    expect(html).toContain('he-pathtree-why')
    expect(html).toContain('Same dynasty successor.')
    expect(html).toContain('via Augustus')
  })

  // --- CORE INVARIANT: Trail != Knowledge Graph ---
  it('renders ONLY the navigation trail — never a knowledge graph', () => {
    const html = renderToStaticMarkup(
      <ExplorationPathTreeView entries={buildPathTree([topicNode(), entityNode()], 1, new Map())} />,
    )
    // No graph markup: no SVG edges, no relationship/recommendation graph classes.
    expect(html).not.toContain('<svg')
    expect(html).not.toContain('he-relationship')
    expect(html).not.toContain('he-recommendation-graph')
    expect(html).not.toContain('he-entity-graph')
    // Exactly one traversal-list container, no second navigation tree.
    expect(html.match(/he-pathtree-list/g) ?? []).toHaveLength(1)
  })
})

// --- Container (no navigation ownership) ---

describe('ExplorationPathTree container (M10-1 navigation ownership)', () => {
  it('renders exactly one button per history node — never a second navigation tree', () => {
    const history = [
      topicNode(),
      entityNode(),
      { type: 'entity', id: 'roman_empire:tiberius', name: 'Tiberius' },
    ]
    const html = renderToStaticMarkup(
      <ExplorationPathTree history={history} cursor={2} journeyReasons={new Map()} onStepClick={() => {}} />,
    )
    const buttons = html.match(/class="he-pathtree-node/g) ?? []
    expect(buttons).toHaveLength(history.length)
  })

  it('delegates clicks to onStepClick(index) — owns no nav state', () => {
    const history = [topicNode(), entityNode()]
    const html = renderToStaticMarkup(
      <ExplorationPathTree history={history} cursor={1} journeyReasons={new Map()} onStepClick={() => {}} />,
    )
    expect(html).toContain('Return to Roman Empire')
    expect(html).toContain('Current: Augustus')
  })
})
