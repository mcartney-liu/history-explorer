import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import DiscoverPage, {
  DISCOVER_HERO,
  FEATURED_TOPIC,
  prettifySlug,
} from './DiscoverPage'
import { TOPIC_STARTERS } from '../data/explorationStarters'

// M35 Phase 2: DiscoverPage is purely presentational; rendered with
// renderToStaticMarkup (environment:'node', no DOM) matching the repo style.
const noop = () => {}

describe('DiscoverPage (M35)', () => {
  it('renders the FIXED hero copy verbatim (Design Freeze §2)', () => {
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(DISCOVER_HERO).toBe('原来历史还能这样探索。')
    expect(html).toContain('原来历史还能这样探索。')
  })

  it('features the Silk Road by default with its existing curated starters', () => {
    expect(FEATURED_TOPIC).toBe('silk_road')
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    expect(html).toContain('data-topic="silk_road"')
    // Featured starters come verbatim from the EXISTING TOPIC_STARTERS map.
    for (const s of TOPIC_STARTERS.silk_road) {
      expect(html).toContain(`data-starter="${s.id}"`)
      expect(html).toContain(s.label)
    }
  })

  it('lists every existing TOPIC_STARTERS topic as a popular card (no new topics)', () => {
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    for (const slug of Object.keys(TOPIC_STARTERS)) {
      expect(html).toContain(`data-topic="${slug}"`)
    }
  })

  it('renders only known topic slugs (grounded in the curated starter map)', () => {
    const html = renderToStaticMarkup(
      <DiscoverPage onTopicClick={noop} onStarterClick={noop} />,
    )
    const rendered = [...html.matchAll(/data-topic="([^"]+)"/g)].map((m) => m[1])
    for (const slug of rendered) {
      expect(Object.keys(TOPIC_STARTERS)).toContain(slug)
    }
  })

  it('prettifySlug mirrors the App display rule', () => {
    expect(prettifySlug('silk_road')).toBe('Silk Road')
    expect(prettifySlug('greek_philosophy')).toBe('Greek Philosophy')
  })
})
