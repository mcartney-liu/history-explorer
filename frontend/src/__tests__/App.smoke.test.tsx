// ============================================================
// Explorer Shell smoke test (M90.3, realigned by Wave2-#141(3))
//
// History:
//  - M65: tested ExplorationShell (three-area layout).
//  - M85.11: rails became collapsed-by-default; test realigned to
//    the collapsed default + expanded four-area layout.
//  - Wave2-#141(3): ExplorationShell was an orphan — production App
//    renders ExplorerShell (M90.3 six-region slot shell), yet the
//    smoke test kept covering the dead component. Coverage is moved
//    to the shipped shell; ExplorationShell is deleted.
//  - P5-S4 (PO 2026-08-09): both rails are now COLLAPSED by default;
//    toggles expose "展开" and the canvas gets full width.
//
// Coverage: default collapsed rails, collapse toggles, and the
// shell skeleton (global bar / context rail / canvas / companion dock).
// Question + Mode 已收敛至 UnderstandingCanvas（L0 真问题行 + 四视角 tab），
// 不再作为 ExplorerShell 的独立插槽。
// Repo style: react-dom/server renderToStaticMarkup only — no jsdom,
// no @testing-library (frozen deps), hence no click-driven assertions.
// ============================================================

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ExplorerShell } from '../components/shell/ExplorerShell'

const shell = (props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    <ExplorerShell
      globalBar={<div>brand</div>}
      contextRail={<div>rail</div>}
      companionDock={<div>companion</div>}
      {...props}
    >
      <div>content</div>
    </ExplorerShell>,
  )

describe('Explorer Shell — skeleton (M90.3)', () => {
  it('renders global bar slot', () => {
    const html = shell()
    expect(html).toContain('explorer-shell')
    expect(html).toContain('explorer-global-bar')
    expect(html).toContain('brand')
  })

  it('renders canvas full-width with both rails collapsed by default', () => {
    const html = shell()
    expect(html).not.toContain('explorer-context-rail')
    expect(html).not.toContain('>rail<')
    expect(html).toContain('explorer-canvas')
    expect(html).toContain('content')
    expect(html).not.toContain('explorer-companion-dock')
    expect(html).not.toContain('>companion<')
  })

  it('exposes both expand toggles in the collapsed state', () => {
    const html = shell()
    expect(html).toContain('explorer-rail-toggle')
    expect(html).toContain('展开探索工作台')
    expect(html).toContain('explorer-companion-toggle')
    expect(html).toContain('展开 AI 历史学家')
  })
})

describe('Explorer Shell — fallback placeholders when slots are empty', () => {
  it('renders branded global-bar placeholder; rails hidden when collapsed', () => {
    const html = renderToStaticMarkup(
      <ExplorerShell>
        <div>content</div>
      </ExplorerShell>,
    )
    expect(html).toContain('explorer-global-title')
    expect(html).toContain('History Explorer')
    expect(html).not.toContain('explorer-context-placeholder')
    expect(html).not.toContain('explorer-companion-placeholder')
    expect(html).toContain('content')
  })
})
