import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TemporalComparisonPanel, {
  type TemporalEntity,
} from '../components/TemporalComparisonPanel'

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
    const html = renderToStaticMarkup(
      <TemporalComparisonPanel entities={[rome, han]} />,
    )
    expect(html).toContain('Temporal Comparison')
    // Deterministic engine output: overlap = 422, start gap = 551, duration diff = 807.
    expect(html).toContain('Rome and Han Dynasty overlapped for 422 years.')
    expect(html).toContain('Rome began 551 years before Han Dynasty.')
    expect(html).toContain('Rome lasted 807 years longer than Han Dynasty.')
  })

  it('renders empty state when fewer than 2 entities are available', () => {
    const one = renderToStaticMarkup(
      <TemporalComparisonPanel entities={[rome]} />,
    )
    expect(one).toContain(
      'Not enough entities with temporal data for comparison.',
    )

    const none = renderToStaticMarkup(
      <TemporalComparisonPanel entities={[]} />,
    )
    expect(none).toContain(
      'Not enough entities with temporal data for comparison.',
    )
  })

  it('compares a different selected pair and updates the result', () => {
    // Default selection: A = first dated (Rome), B = first different dated
    // (Ancient Egypt); Han Dynasty is now the third option and must NOT be
    // the active comparison target.
    const html = renderToStaticMarkup(
      <TemporalComparisonPanel entities={[rome, egypt, han]} />,
    )
    expect(html).not.toContain('Rome began 551 years before Han Dynasty.')
    expect(html).toContain('Rome began 2347 years after Ancient Egypt.')
    expect(html).toContain('Rome and Ancient Egypt overlapped for 723 years.')
  })

  it('does not crash when a selected entity has no date data', () => {
    const html = renderToStaticMarkup(
      <TemporalComparisonPanel entities={[rome, undated]} />,
    )
    // Engine reports comparable=false -> graceful empty state, no throw.
    expect(html).toContain(
      'Selected entities lack sufficient date data for comparison.',
    )
  })

  it('freeze-compliant: emits no AI / interpretation / ranking language', () => {
    const html = renderToStaticMarkup(
      <TemporalComparisonPanel entities={[rome, han]} />,
    )
    expect(html).not.toMatch(/influence|important|cause|recommendation|ranking/i)
  })
})
