import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import MultiEntityTimeline from '../components/MultiEntityTimeline'
import { LocaleProvider } from '../data/locale'

// M62.5: components now render localized copy via t(); wrap in LocaleProvider
// (zh default) so assertions match the rendered Chinese strings.
const render = (ui: ReactElement) =>
  renderToStaticMarkup(<LocaleProvider>{ui}</LocaleProvider>)

// Same test environment as the M7 panel tests: react-dom/server
// renderToStaticMarkup (no jsdom, no @testing-library — frozen deps).
const entities = [
  { name: 'Rome', start_date: { value: -753 }, end_date: { value: 476 } },
  { name: 'Han Dynasty', start_date: { value: -202 }, end_date: { value: 220 } },
  { name: 'Ancient Egypt', start_date: { value: -3100 }, end_date: { value: -30 } },
]

describe('MultiEntityTimeline', () => {
  it('renders one row per named entity', () => {
    const html = render(<MultiEntityTimeline entities={entities} />)
    expect(html).toContain('Rome')
    expect(html).toContain('Han Dynasty')
    expect(html).toContain('Ancient Egypt')
    const rows = html.split('class="multi-entity-row"').length - 1
    expect(rows).toBe(3)
  })

  it('preserves input order (no sorting / ranking)', () => {
    const html = render(<MultiEntityTimeline entities={entities} />)
    expect(html.indexOf('Rome')).toBeLessThan(html.indexOf('Han Dynasty'))
    expect(html.indexOf('Han Dynasty')).toBeLessThan(html.indexOf('Ancient Egypt'))
  })

  it('renders deterministic date-range labels', () => {
    const html = render(<MultiEntityTimeline entities={entities} />)
    expect(html).toContain('公元前 753 年 - 公元 476 年')
  })

  it('shows "No date data" for an undated entity without crashing', () => {
    const html = render(
      <MultiEntityTimeline entities={[...entities, { name: 'Mystery' }]} />,
    )
    expect(html).toContain('Mystery')
    expect(html).toContain('没有日期数据')
  })

  it('renders an empty state for an empty array', () => {
    const html = render(<MultiEntityTimeline entities={[]} />)
    expect(html).toContain('没有可放置于时间线的实体。')
  })

  it('renders an empty state when no entity has any date', () => {
    const html = render(
      <MultiEntityTimeline entities={[{ name: 'A' }, { name: 'B' }]} />,
    )
    expect(html).toContain('没有可放置于时间线的实体。')
  })

  it('renders reused mechanical overlap facts', () => {
    const html = render(<MultiEntityTimeline entities={entities} />)
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
