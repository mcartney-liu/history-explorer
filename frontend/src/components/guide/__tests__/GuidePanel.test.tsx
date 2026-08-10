import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getPackages } from '../../../data/explorationPackages'
import GuidePanel from '../GuidePanel'

const china = () => getPackages().find((p) => p.slug === 'china-civilization-v1')!
const noop = () => {}

// NOTE: renderToStaticMarkup does NOT provide React Context, so useLocale()
// falls back to the default t(k)=>k (returns i18n keys, not translations).
// These assertions test the key presence, not the translated text.

describe('GuidePanel (deterministic exploration navigation)', () => {
  it('renders the guide shell with title', () => {
    const html = renderToStaticMarkup(
      <GuidePanel pkg={china()} visited={[]} locale="zh" onEntityClick={noop} />,
    )
    expect(html).toContain('guide.title')
    expect(html).toContain('data-testid="exploration-guide"')
  })

  it('shows the entry position when nothing is visited', () => {
    const html = renderToStaticMarkup(
      <GuidePanel pkg={china()} visited={[]} locale="zh" onEntityClick={noop} />,
    )
    expect(html).toContain('guide.entryHint')
    expect(html).toContain('guide.positionLabel')
  })

  it('shows next steps with reasons', () => {
    const html = renderToStaticMarkup(
      <GuidePanel pkg={china()} visited={[]} locale="zh" onEntityClick={noop} />,
    )
    expect(html).toContain('guide.nextLabel')
    // Reason text comes from RELATIONSHIP_TEMPLATES (deterministic)
    expect(html).toContain('guide.nextCta')
  })

  it('shows coverage counters', () => {
    const html = renderToStaticMarkup(
      <GuidePanel pkg={china()} visited={['china_v1:idea-keju']} locale="zh" onEntityClick={noop} />,
    )
    expect(html).toContain('guide.coverageText')
  })

  it('renders "completed" state when everything is visited', () => {
    const all = china()
      .relationship_paths.flatMap((p) => [p.from, p.to])
      .filter((gid, i, arr) => arr.indexOf(gid) === i)
    const html = renderToStaticMarkup(
      <GuidePanel pkg={china()} visited={all} locale="zh" onEntityClick={noop} />,
    )
    expect(html).toContain('guide.doneText')
  })

  // M71 — onNextClick passthrough: optional prop must not change rendering.
  // The wiring itself (page layer -> recordEvent) is typed by tsc and its event
  // consumption is asserted in explorationMetrics.test.ts (Guide Interaction).
  it('renders identically when onNextClick is provided (optional passthrough)', () => {
    const html = renderToStaticMarkup(
      <GuidePanel
        pkg={china()}
        visited={[]}
        locale="zh"
        onEntityClick={noop}
        onNextClick={noop}
      />,
    )
    expect(html).toContain('guide.title')
    expect(html).toContain('guide.nextLabel')
    expect(html).toContain('guide.nextCta')
  })
})
