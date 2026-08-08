// ============================================================
// Exploration Shell smoke test (M65, realigned by Wave2-#140)
//
// Drift fixed here:
//  1. The file contained the SAME describe block twice, verbatim — a
//     copy-paste artifact that doubled every failure report.
//  2. M85.11 made both rails collapsed-by-default with edge toggles, so
//     the original single test (which asserted `ws-rail` + `companion-panel`
//     on a default render) could never pass again.
//
// Coverage is realigned, not reduced: the collapsed default and the
// expanded four-area layout are now both asserted, using the
// defaultWorkspaceOpen / defaultCompanionOpen initial-state props.
// Repo style: react-dom/server renderToStaticMarkup only — no jsdom,
// no @testing-library (frozen deps), hence no click-driven assertions.
// ============================================================

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ExplorationShell } from '../components/shell/ExplorationShell'
import { CompanionPlaceholder } from '../components/shell/CompanionPlaceholder'

const shell = (props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    <ExplorationShell
      workspace={<div>ws</div>}
      companion={<CompanionPlaceholder />}
      timeline={<div>tl</div>}
      {...props}
    >
      <div>content</div>
    </ExplorationShell>,
  )

describe('Exploration Shell — collapsed default (M85.11)', () => {
  it('renders canvas + timeline and keeps both rails collapsed', () => {
    const html = shell()
    expect(html).toContain('exploration-space')
    expect(html).toContain('exploration-space--ws-collapsed')
    expect(html).toContain('exploration-space--companion-collapsed')
    expect(html).toContain('explore-canvas')
    expect(html).toContain('timeline-strip')
    expect(html).toContain('content')
    // Rails are not mounted while collapsed.
    expect(html).not.toContain('ws-rail')
    expect(html).not.toContain('companion-panel')
  })

  it('always exposes both edge toggles so the rails stay reachable', () => {
    const html = shell()
    expect(html).toContain('workspace-toggle-btn')
    expect(html).toContain('companion-toggle-btn')
    expect(html).toContain('展开探索工作台')
    expect(html).toContain('展开 AI 历史学家')
  })
})

describe('Exploration Shell — expanded four-area layout (M65)', () => {
  it('renders rail | canvas | companion | strip when both rails start open', () => {
    const html = shell({ defaultWorkspaceOpen: true, defaultCompanionOpen: true })
    expect(html).toContain('exploration-space')
    expect(html).toContain('ws-rail')
    expect(html).toContain('explore-canvas')
    expect(html).toContain('companion-panel')
    expect(html).toContain('timeline-strip')
    expect(html).toContain('AI 历史学家')
    expect(html).toContain('content')
    expect(html).not.toContain('exploration-space--ws-collapsed')
    expect(html).not.toContain('exploration-space--companion-collapsed')
  })

  it('flips the toggle labels to the collapse action when open', () => {
    const html = shell({ defaultWorkspaceOpen: true, defaultCompanionOpen: true })
    expect(html).toContain('收起探索工作台')
    expect(html).toContain('收起 AI 历史学家')
    expect(html).toContain('workspace-toggle-btn--inside')
    expect(html).toContain('companion-toggle-btn--inside')
  })

  it('can open the rails independently', () => {
    const wsOnly = shell({ defaultWorkspaceOpen: true })
    expect(wsOnly).toContain('ws-rail')
    expect(wsOnly).not.toContain('companion-panel')

    const companionOnly = shell({ defaultCompanionOpen: true })
    expect(companionOnly).not.toContain('ws-rail')
    expect(companionOnly).toContain('companion-panel')
  })
})

describe('CompanionPlaceholder', () => {
  it('renders without logic', () => {
    const html = renderToStaticMarkup(<CompanionPlaceholder />)
    expect(html).toContain('AI 历史学家')
    expect(html).toContain('即将上线')
  })
})
