import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ExplorationShell } from '../components/shell/ExplorationShell'
import { CompanionPlaceholder } from '../components/shell/CompanionPlaceholder'

describe('M65 — Exploration Shell smoke test', () => {
  it('renders the four-area spatial layout', () => {
    const html = renderToStaticMarkup(
      <ExplorationShell
        workspace={<div>ws</div>}
        companion={<CompanionPlaceholder />}
        timeline={<div>tl</div>}
      >
        <div>content</div>
      </ExplorationShell>
    )
    expect(html).toContain('exploration-space')
    expect(html).toContain('ws-rail')
    expect(html).toContain('explore-canvas')
    expect(html).toContain('companion-panel')
    expect(html).toContain('timeline-strip')
    expect(html).toContain('AI 历史学家')
    expect(html).toContain('content')
  })

  it('renders CompanionPlaceholder without logic', () => {
    const html = renderToStaticMarkup(<CompanionPlaceholder />)
    expect(html).toContain('AI 历史学家')
    expect(html).toContain('即将上线')
  })
})

describe('M65 — Exploration Shell smoke test', () => {
  it('renders the four-area spatial layout', () => {
    const html = renderToStaticMarkup(
      <ExplorationShell
        workspace={<div>ws</div>}
        companion={<CompanionPlaceholder />}
        timeline={<div>tl</div>}
      >
        <div>content</div>
      </ExplorationShell>
    )
    expect(html).toContain('exploration-space')
    expect(html).toContain('ws-rail')
    expect(html).toContain('explore-canvas')
    expect(html).toContain('companion-panel')
    expect(html).toContain('timeline-strip')
    expect(html).toContain('AI 历史学家')
    expect(html).toContain('content')
  })

  it('renders CompanionPlaceholder without logic', () => {
    const html = renderToStaticMarkup(<CompanionPlaceholder />)
    expect(html).toContain('AI 历史学家')
    expect(html).toContain('即将上线')
  })
})
