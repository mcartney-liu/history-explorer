import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProvenancePanelView } from './ProvenancePanel'
import { LocaleProvider } from '../data/locale'
import type { ProvenanceRecord } from '../data/provenanceApi'

const records: ProvenanceRecord[] = [
  {
    subject_id: 'person-ashoka',
    source_id: 'src-1',
    claim_id: 'claim-1',
    reference: 'ref-1',
  },
  {
    subject_id: 'person-ashoka',
    source_id: 'src-2',
    claim_id: 'claim-2',
    reference: 'ref-2',
  },
]

describe('ProvenancePanelView', () => {
  it('renders loading skeleton', () => {
    const html = renderToStaticMarkup(
      <ProvenancePanelView status="loading" records={[]} />,
    )
    expect(html).toContain('读取事实溯源')
  })

  it('renders empty state', () => {
    const html = renderToStaticMarkup(
      <ProvenancePanelView status="empty" records={[]} />,
    )
    expect(html).toContain('暂无策展的事实溯源记录')
  })

  it('renders disabled state', () => {
    const html = renderToStaticMarkup(
      <ProvenancePanelView status="disabled" records={[]} />,
    )
    expect(html).toContain('PROVENANCE_PROJECTION=false')
  })

  it('renders error card with retry', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <ProvenancePanelView
          status="error"
          records={[]}
          errorKind="network"
          onRetry={() => {}}
        />
      </LocaleProvider>,
    )
    expect(html).toContain('重试')
  })

  it('renders records on success and hides subject_id', () => {
    const html = renderToStaticMarkup(
      <ProvenancePanelView status="success" records={records} />,
    )
    expect(html).toContain('claim-1')
    expect(html).toContain('src-1')
    expect(html).toContain('ref-2')
    // Per design, subject_id is an internal index key and must NOT be shown.
    expect(html).not.toContain('person-ashoka')
  })

  it('groups records by source_id on success (S4)', () => {
    const grouped: ProvenanceRecord[] = [
      { subject_id: 'person-ashoka', source_id: 'src-1', claim_id: 'claim-1', reference: 'ref-1' },
      { subject_id: 'person-ashoka', source_id: 'src-1', claim_id: 'claim-2', reference: 'ref-2' },
      { subject_id: 'person-ashoka', source_id: 'src-2', claim_id: 'claim-3', reference: 'ref-3' },
    ]
    const html = renderToStaticMarkup(
      <ProvenancePanelView status="success" records={grouped} />,
    )
    expect(html).toContain('provenance-group')
    // Two distinct sources => exactly two group headers.
    const heads = html.match(/provenance-group-head/g) || []
    expect(heads.length).toBe(2)
    expect(html).toContain('claim-1')
    expect(html).toContain('claim-3')
    // subject_id still hidden after grouping.
    expect(html).not.toContain('person-ashoka')
  })
})
