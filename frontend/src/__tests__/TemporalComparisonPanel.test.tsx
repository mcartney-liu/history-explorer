import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import TemporalComparisonPanel, {
  type TemporalEntity,
} from '../components/TemporalComparisonPanel'
import { LocaleProvider } from '../data/locale'

const r2s = renderToStaticMarkup
const render = (el: ReactElement) => r2s(<LocaleProvider>{el}</LocaleProvider>)

// NOTE: the project's frozen dependency set does NOT include
// @testing-library/react / jsdom (vitest runs in `node` environment, per
// vitest.config.ts). The established component-test approach is
// renderToStaticMarkup (see TimelinePanel.test.tsx). We therefore assert on
// static markup. The "switch select updates result" intent is covered by
// rendering with a different entity ordering so the deterministic default
// selection compares a different pair — no new dependency is introduced.

// Fixtures (deterministic, BCE = negative value).
const rome: TemporalEntity = {
  name: 'Rome',
  start_date: { value: -753 },
  end_date: { value: 476 },
}
const han: TemporalEntity = {
  name: 'Han Dynasty',
  start_date: { value: -202 },
  end_date: { value: 220 },
}
const egypt: TemporalEntity = {
  name: 'Ancient Egypt',
  start_date: { value: -3100 },
  end_date: { value: -30 },
}
const undated: TemporalEntity = {
  name: 'Atlantis',
  start_date: undefined,
  end_date: undefined,
}

describe('TemporalComparisonPanel', () => {
  it('shows comparison facts for two dated entities (Rome vs Han)', () => {
    const html = render(
      <TemporalComparisonPanel entities={[rome, han]} />,
    )
    expect(html).toContain('时间对比')
    // Deterministic engine output: overlap = 422, start gap = 551, duration diff = 807.
    expect(html).toContain('Rome 与 Han Dynasty 重叠共存了 422 年。')
    expect(html).toContain('Rome 比 Han Dynasty 早 551 年开始。')
    expect(html).toContain('Rome 比 Han Dynasty 存续长 807 年。')
  })

  it('renders empty state when fewer than 2 entities are available', () => {
    const one = render(
      <TemporalComparisonPanel entities={[rome]} />,
    )
    expect(one).toContain(
      '时间数据不足以进行比较。',
    )

    const none = render(
      <TemporalComparisonPanel entities={[]} />,
    )
    expect(none).toContain(
      '时间数据不足以进行比较。',
    )
  })

  it('compares a different selected pair and updates the result', () => {
    // Default selection: A = first dated (Rome), B = first different dated
    // (Ancient Egypt); Han Dynasty is now the third option and must NOT be
    // the active comparison target.
    const html = render(
      <TemporalComparisonPanel entities={[rome, egypt, han]} />,
    )
    expect(html).not.toContain('Rome 比 Han Dynasty 早 551 年开始。')
    expect(html).toContain('Rome 比 Ancient Egypt 晚 2347 年开始。')
    expect(html).toContain('Rome 与 Ancient Egypt 重叠共存了 723 年。')
  })

  it('does not crash when a selected entity has no date data', () => {
    const html = render(
      <TemporalComparisonPanel entities={[rome, undated]} />,
    )
    // Engine reports comparable=false -> graceful empty state, no throw.
    expect(html).toContain(
      '所选实体缺乏足够的时间数据用于比较。',
    )
  })

  it('freeze-compliant: emits no AI / interpretation / ranking language', () => {
    const html = render(
      <TemporalComparisonPanel entities={[rome, han]} />,
    )
    expect(html).not.toMatch(/influence|important|cause|recommendation|ranking/i)
  })
})
