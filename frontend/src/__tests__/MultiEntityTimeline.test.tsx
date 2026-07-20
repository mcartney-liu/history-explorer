import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import MultiEntityTimeline from '../components/MultiEntityTimeline'

// Same test environment as the M7 panel tests: react-dom/server
// renderToStaticMarkup (no jsdom, no @testing-library — frozen deps).
const entities = [
  { name: 'Rome', start_date: { value: -753 }, end_date: { value: 476 } },
  { name: 'Han Dynasty', start_date: { value: -202 }, end_date: { value: 220 } },
  { name: 'Ancient Egypt', start_date: { value: -3100 }, end_date: { value: -30 } },
]

describe('MultiEntityTimeline', () => {
  it('renders one row per named entity', () => {
    const html = renderToStaticMarkup(<MultiEntityTimeline entities={entities} />)
    expect(html).toContain('Rome')
    expect(html).toContain('Han Dynasty')
    expect(html).toContain('Ancient Egypt')
    const rows = html.split('class="multi-entity-row"').length - 1
    expect(rows).toBe(3)
  })

  it('preserves input order (no sorting / ranking)', () => {
    const html = renderToStaticMarkup(<MultiEntityTimeline entities={entities} />)
    expect(html.indexOf('Rome')).toBeLessThan(html.indexOf('Han Dynasty'))
    expect(html.indexOf('Han Dynasty')).toBeLessThan(html.indexOf('Ancient Egypt'))
  })

  it('renders deterministic date-range labels', () => {
    const html = renderToStaticMarkup(<MultiEntityTimeline entities={entities} />)
    expect(html).toContain('753 BC - 476 CE')
  })

  it('shows "No date data" for an undated entity without crashing', () => {
    const html = renderToStaticMarkup(
      <MultiEntityTimeline entities={[...entities, { name: 'Mystery' }]} />,
    )
    expect(html).toContain('Mystery')
    expect(html).toContain('No date data')
  })

  it('renders an empty state for an empty array', () => {
    const html = renderToStaticMarkup(<MultiEntityTimeline entities={[]} />)
    expect(html).toContain('No entities with temporal data')
  })

  it('renders an empty state when no entity has any date', () => {
    const html = renderToStaticMarkup(
      <MultiEntityTimeline entities={[{ name: 'A' }, { name: 'B' }]} />,
    )
    expect(html).toContain('No entities with temporal data')
  })

  it('renders reused mechanical overlap facts', () => {
    const html = renderToStaticMarkup(<MultiEntityTimeline entities={entities} />)
    expect(html).toContain('overlapped for 422 years')
  })

  it('contains no forbidden interpretive vocabulary', () => {
    const html = renderToStaticMarkup(
      <MultiEntityTimeline entities={entities} />,
    ).toLowerCase()
    for (const banned of [
      'influence',
      'cause',
      'important',
      'recommendation',
      'ranking',
      'similarity',
      'confidence',
      'era',
    ]) {
      expect(html).not.toContain(banned)
    }
  })
})
