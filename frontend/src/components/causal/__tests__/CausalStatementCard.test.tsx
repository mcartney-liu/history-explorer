/** M82 P1.6 — CausalStatementCard unit tests.

NOTE: renderToStaticMarkup does NOT provide React Context, so useLocale()
falls back to the default t(k)=>k (returns i18n keys, not translations).
We assert key presence, not translated text — same pattern as GuidePanel tests.
*/
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CausalStatementCard from '../CausalStatementCard'
import type { CausalStatementData } from '../../../data/causalStatement'

function cs(overrides: Partial<CausalStatementData> = {}): CausalStatementData {
  return {
    cause_id: 'test:a',
    effect_id: 'test:b',
    mechanism: 'A caused B through process X.',
    consequence: 'B led to long-term outcome Y.',
    confidence: 'high',
    evidence_refs: ['ec-test-001', 'ec-test-002'],
    ...overrides,
  }
}

describe('CausalStatementCard', () => {
  it('renders mechanism and consequence sections', () => {
    const html = renderToStaticMarkup(<CausalStatementCard cs={cs()} />)
    expect(html).toContain('A caused B through process X.')
    expect(html).toContain('B led to long-term outcome Y.')
    // i18n keys (not translations — renderToStaticMarkup has no Context)
    expect(html).toContain('causal.mechanism')
    expect(html).toContain('causal.consequence')
  })

  it('renders confidence as human-readable label key (not raw enum)', () => {
    const html = renderToStaticMarkup(<CausalStatementCard cs={cs({ confidence: 'high' })} />)
    expect(html).toContain('causal.confidenceHigh')
    expect(html).not.toContain('"high"')
  })

  it('renders low confidence label key', () => {
    const html = renderToStaticMarkup(
      <CausalStatementCard cs={cs({ confidence: 'low', mechanism: 'Possibly...' })} />,
    )
    expect(html).toContain('causal.confidenceLow')
    expect(html).toContain('Possibly...')
  })

  it('renders null confidence as unknown label key', () => {
    const html = renderToStaticMarkup(
      <CausalStatementCard cs={cs({ confidence: null })} />,
    )
    expect(html).toContain('causal.confidenceUnknown')
  })

  it('renders evidence refs as disabled buttons', () => {
    const html = renderToStaticMarkup(<CausalStatementCard cs={cs()} />)
    expect(html).toContain('causal.evidence')
    expect(html).toContain('ec-test-001')
    expect(html).toContain('ec-test-002')
    expect(html).toContain('disabled')
  })

  it('evidence refs are clickable with onEvidenceClick (P1.7 ready)', () => {
    const html = renderToStaticMarkup(
      <CausalStatementCard cs={cs()} onEvidenceClick={() => {}} />,
    )
    expect(html).not.toContain('disabled')
  })

  it('renders without mechanism (null)', () => {
    const html = renderToStaticMarkup(
      <CausalStatementCard cs={cs({ mechanism: null, consequence: 'Still has consequence.' })} />,
    )
    expect(html).not.toContain('causal.mechanism')
    expect(html).toContain('Still has consequence.')
  })

  it('renders without consequence (null)', () => {
    const html = renderToStaticMarkup(
      <CausalStatementCard cs={cs({ consequence: null, mechanism: 'Still has mechanism.' })} />,
    )
    expect(html).toContain('Still has mechanism.')
    expect(html).not.toContain('causal.consequence')
  })

  it('renders without evidence_refs (empty)', () => {
    const html = renderToStaticMarkup(
      <CausalStatementCard cs={cs({ evidence_refs: [] })} />,
    )
    expect(html).not.toContain('causal.evidence')
  })

  it('has data-testid and data-confidence attrs', () => {
    const html = renderToStaticMarkup(<CausalStatementCard cs={cs()} />)
    expect(html).toContain('data-testid="causal-statement-card"')
    expect(html).toContain('data-confidence="high"')
  })

  // M82 P3 — LayerBadge integration
  it('renders LayerBadge with causal label', () => {
    const html = renderToStaticMarkup(<CausalStatementCard cs={cs()} />)
    expect(html).toContain('layer.causal')
    expect(html).toContain('layer-badge--causal')
  })
})
