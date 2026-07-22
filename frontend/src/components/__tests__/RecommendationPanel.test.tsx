import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RecommendationPanel, {
  RecommendationPanelView,
  fetchRecommendations,
  type RecommendationItem,
  type RecommendationResult,
} from '../RecommendationPanel'

// --- Sample engine response (mirrors backend RecommendationResult.to_dict) ---

function rec(global_id: string, name: string, type: string, reasons: string[]): RecommendationItem {
  return {
    target_entity: { global_id, name, type },
    score: 0.82,
    score_breakdown: { relationship: 0.4, temporal: 0.25, theme: 0.2, diversity: 0.15 },
    reasons,
    relation_path: [
      { from: 'roman_empire:augustus', to: global_id, relationship: 'influenced', direction: 'outgoing', weight: 0.9 },
    ],
    metadata: { depth: 1, candidate_source: 'direct', entity_type: type },
  }
}

function result(items: RecommendationItem[]): RecommendationResult {
  return {
    current_entity: { global_id: 'roman_empire:augustus', name: 'Augustus', type: 'person' },
    recommendations: items,
    algorithm_version: 'm9-001.v1',
    parameters: { limit: 5, seen: [] },
    metadata: {},
  }
}

// --- fetch helper: mock global.fetch (node env has a real fetch; save/restore) ---

const originalFetch = global.fetch
afterEach(() => {
  global.fetch = originalFetch
})

describe('fetchRecommendations (M9-002 helper)', () => {
  it('requests the engine endpoint with limit and seen, and parses the result', async () => {
    const sample = result([
      rec('roman_empire:octavian', 'Octavian', 'person', ['Same dynasty successor.']),
    ])
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => sample,
    }))
    global.fetch = fetchMock as unknown as typeof fetch

    const seen = new Set(['roman_empire:tiberius'])
    const out = await fetchRecommendations('roman_empire:augustus', seen, 5)

    // URL is built correctly: path + ?limit=5&seen=<encoded csv>
    const url: string = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('/entity/roman_empire%3Aaugustus/recommendations?limit=5&seen=')
    // The seen global id survives URL-encoding (round-trips via decodeURIComponent).
    expect(decodeURIComponent(url)).toContain('seen=roman_empire:tiberius')
    // Response is parsed and typed.
    expect(out.recommendations).toHaveLength(1)
    expect(out.recommendations[0].target_entity.global_id).toBe('roman_empire:octavian')
    expect(out.algorithm_version).toBe('m9-001.v1')
  })

  it('maps a 404 to the notfound error kind', async () => {
    global.fetch = (async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof fetch
    await expect(fetchRecommendations('missing:id', new Set(), 5)).rejects.toMatchObject({
      kind: 'notfound',
    })
  })

  it('maps a network failure (fetch throws) to the network error kind', async () => {
    global.fetch = (async () => {
      throw new Error('connection refused')
    }) as unknown as typeof fetch
    await expect(fetchRecommendations('any:id', new Set(), 5)).rejects.toMatchObject({
      kind: 'network',
    })
  })

  it('maps a non-ok / unparseable response to the parse error kind', async () => {
    global.fetch = (async () => ({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('boom')
      },
    })) as unknown as typeof fetch
    await expect(fetchRecommendations('any:id', new Set(), 5)).rejects.toMatchObject({
      kind: 'parse',
    })
  })
})

describe('RecommendationPanelView (M9-002 presentational)', () => {
  it('renders the title, entity name, and reasons', () => {
    const items = [
      rec('roman_empire:octavian', 'Octavian', 'person', ['Same dynasty successor.', 'Linked by influence.']),
    ]
    const html = renderToStaticMarkup(<RecommendationPanelView recommendations={items} />)
    expect(html).toContain('下一站探索')
    expect(html).toContain('Octavian')
    expect(html).toContain('person')
    expect(html).toContain('Same dynasty successor.')
    // The relation path (from → relationship → to) is shown.
    expect(html).toContain('influenced')
  })

  it('preserves engine order and does NOT re-rank', () => {
    const items = [
      rec('t:first', 'First', 'person', ['a']),
      rec('t:second', 'Second', 'person', ['b']),
      rec('t:third', 'Third', 'person', ['c']),
    ]
    const html = renderToStaticMarkup(<RecommendationPanelView recommendations={items} />)
    expect(html.indexOf('First')).toBeLessThan(html.indexOf('Second'))
    expect(html.indexOf('Second')).toBeLessThan(html.indexOf('Third'))
  })

  it('weakly marks already-seen nodes without reordering them', () => {
    const items = [rec('t:seen_node', 'Seen', 'person', ['a']), rec('t:new_node', 'New', 'person', ['b'])]
    const seen = new Set(['t:seen_node'])
    const html = renderToStaticMarkup(<RecommendationPanelView recommendations={items} seenGlobalIds={seen} />)
    expect(html).toContain('is-seen')
    // Seen node stays first (no reordering by this panel).
    expect(html.indexOf('seen_node')).toBeLessThan(html.indexOf('new_node'))
  })
})

describe('RecommendationPanel route compatibility (M9-002)', () => {
  it('binds each card to the engine target via aria-label (route-compatibility contract)', () => {
    const items = [rec('roman_empire:octavian', 'Octavian', 'person', ['Same dynasty successor.'])]
    const html = renderToStaticMarkup(
      <RecommendationPanelView recommendations={items} onNodeClick={() => {}} />,
    )
    // Route-compatibility contract: each card is a clickable action whose
    // aria-label encodes the engine's target entity. The full global_id
    // (roman_empire:octavian) is bound to onNodeClick, which App wires to
    // openEntity — so a click navigates to exactly the engine's suggested node.
    // Actual DOM-click dispatch needs jsdom (intentionally unavailable here);
    // it is covered by dev-server verification per M9-002.1 Phase 5.
    expect(html).toContain('aria-label="Explore Octavian"')
    expect(html).toContain('octavian')
  })

  it('renders a loading skeleton in static markup without invoking fetch (useEffect is not run)', () => {
    const html = renderToStaticMarkup(<RecommendationPanel entityId="roman_empire:augustus" />)
    expect(html).toContain('he-skeleton')
  })
})
