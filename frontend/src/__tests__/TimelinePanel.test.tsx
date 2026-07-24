import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TimelinePanel from '../components/TimelinePanel'

describe('M6-P4 TimelinePanel — sorting & time buckets', () => {
  it('sorts BCE before CE and renders fixed time-bucket headers in order', () => {
    const timeline = [
      { period: '14 CE', event: 'Augustus dies', date: { value: 14, label: '14 CE' } },
      { period: '63 BC', event: 'Augustus born', date: { value: -63, label: '63 BC' } },
      { period: '27 BC', event: 'Empire founded', date: { value: -27, label: '27 BC' } },
    ]
    const html = renderToStaticMarkup(<TimelinePanel timeline={timeline} />)
    // Bucket headers present and in fixed chronological order.
    expect(html).toContain('500 BCE – 1 CE')
    expect(html).toContain('1 – 500 CE')
    // Events appear in ascending year order (document order).
    const born = html.indexOf('Augustus born')
    const founded = html.indexOf('Empire founded')
    const died = html.indexOf('Augustus dies')
    expect(born).toBeGreaterThanOrEqual(0)
    expect(founded).toBeGreaterThan(born)
    expect(died).toBeGreaterThan(founded)
  })

  it('places items in distinct buckets under separate headers, in order', () => {
    const timeline = [
      { period: '2000 CE', event: 'Modern event', date: { value: 2000, label: '2000 CE' } },
      { period: '600 BC', event: 'Ancient event', date: { value: -600, label: '600 BC' } },
    ]
    const html = renderToStaticMarkup(<TimelinePanel timeline={timeline} />)
    expect(html).toContain('Before 500 BCE')
    expect(html).toContain('After 1500 CE')
    // "Before 500 BCE" header must precede "After 1500 CE" in document order.
    expect(html.indexOf('Before 500 BCE')).toBeLessThan(html.indexOf('After 1500 CE'))
  })

  it('keeps M2 behavior for items without a date (Undated bucket, period/event intact)', () => {
    const timeline = [{ period: '27 BC', event: 'Roman Empire Established' }]
    const html = renderToStaticMarkup(<TimelinePanel timeline={timeline} />)
    expect(html).toContain('Roman Empire Established') // event preserved
    expect(html).toContain('27 BC') // period preserved
    expect(html).toContain('Undated') // single group -> Undated bucket header
  })

  it('preserves clickable event navigation from M2-003', () => {
    const timeline = [
      { period: '27 BC', event: 'Roman Empire Established', date: { value: -27, label: '27 BC' } },
    ]
    const html = renderToStaticMarkup(
      <TimelinePanel
        timeline={timeline}
        nameToId={{ 'Roman Empire Established': 'event-roman-empire-established' }}
        onEventClick={() => {}}
      />,
    )
    expect(html).toContain('Open Roman Empire Established')
  })

  it('stays static (no Open button) when event is not linked to an entity', () => {
    const timeline = [
      { period: '27 BC', event: 'Roman Empire Established', date: { value: -27, label: '27 BC' } },
    ]
    const html = renderToStaticMarkup(<TimelinePanel timeline={timeline} />)
    expect(html).not.toContain('Open Roman Empire Established')
    expect(html).toContain('Roman Empire Established')
  })

  it('renders EmptyState when timeline is empty', () => {
    const html = renderToStaticMarkup(<TimelinePanel timeline={[]} />)
    expect(html).toContain('No timeline data.')
  })
})

// M10-2 (cross-panel focus, CONSUMER only): when an event resolves
// name -> local id -> global id and that global id equals the App-owned focus,
// the event is marked is-focused so the linkage set in RelationshipView is
// mirrored here. Timeline never PRODUCES focus.
describe('M10-2 TimelinePanel — cross-panel focus CONSUMER', () => {
  const timeline = [
    {
      period: '27 BC',
      event: 'Roman Empire Established',
      date: { value: -27, label: '27 BC' },
    },
  ]
  const nameToId = { 'Roman Empire Established': 'event-roman-empire-established' }
  const globalIdById = {
    'event-roman-empire-established': 'roman_empire:roman-empire-established',
  }

  it('marks a timeline event is-focused when it resolves to the focused global_id', () => {
    const html = renderToStaticMarkup(
      <TimelinePanel
        timeline={timeline}
        nameToId={nameToId}
        globalIdById={globalIdById}
        focusedId="roman_empire:roman-empire-established"
      />,
    )
    expect(html).toContain('timeline-event is-focused')
  })

  it('does NOT mark a timeline event focused when focusedId does not match', () => {
    const html = renderToStaticMarkup(
      <TimelinePanel
        timeline={timeline}
        nameToId={nameToId}
        globalIdById={globalIdById}
        focusedId="some_other:entity"
      />,
    )
    expect(html).not.toContain('is-focused')
  })

  it('does NOT mark a timeline event focused when no globalIdById map is supplied', () => {
    const html = renderToStaticMarkup(
      <TimelinePanel
        timeline={timeline}
        nameToId={nameToId}
        focusedId="roman_empire:roman-empire-established"
      />,
    )
    expect(html).not.toContain('is-focused')
  })
})
