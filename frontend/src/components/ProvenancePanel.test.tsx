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
    claim_text: '阿育王在羯陵伽之战后转向宣扬佛教',
    reference: 'ref-1',
  },
  {
    subject_id: 'person-ashoka',
    source_id: 'src-2',
    claim_id: 'claim-2',
    claim_text: '阿育王颁布石刻诏令以宣达政令',
    reference: 'ref-2',
  },
]

describe('ProvenancePanelView', () => {
  it('renders nothing while loading (silent per A3 / P4)', () => {
    const html = renderToStaticMarkup(
      <ProvenancePanelView status="loading" records={[]} />,
    )
    expect(html).toBe('')
  })

  it('renders nothing when empty (silent per A3 / P4)', () => {
    const html = renderToStaticMarkup(
      <ProvenancePanelView status="empty" records={[]} />,
    )
    expect(html).toBe('')
  })

  it('renders nothing when disabled (silent per A3 / P4)', () => {
    const html = renderToStaticMarkup(
      <ProvenancePanelView status="disabled" records={[]} />,
    )
    expect(html).toBe('')
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

  it('renders the curated claim text as primary content and hides subject_id', () => {
    const html = renderToStaticMarkup(
      <ProvenancePanelView status="success" records={records} />,
    )
    // The human-readable assertion is now the main content.
    expect(html).toContain('阿育王在羯陵伽之战后转向宣扬佛教')
    // Source / claim ids are still present but demoted to secondary tags.
    expect(html).toContain('src-1')
    expect(html).toContain('claim-1')
    expect(html).toContain('ref-2')
    // Per design, subject_id is an internal index key and must NOT be shown.
    expect(html).not.toContain('person-ashoka')
  })

  it('shows a trust summary with source and claim counts', () => {
    const html = renderToStaticMarkup(
      <ProvenancePanelView status="success" records={records} />,
    )
    expect(html).toContain('个来源')
    expect(html).toContain('条论断')
    expect(html).toContain('关于它，哪些事实可证')   // 视角副标题：可溯源事实
  })

  it('labels the claims section with a "论断" heading and ordinal indices', () => {
    const grouped: ProvenanceRecord[] = [
      { subject_id: 'person-ashoka', source_id: 'src-1', claim_id: 'claim-1', claim_text: '论断一', reference: 'ref-1' },
      { subject_id: 'person-ashoka', source_id: 'src-1', claim_id: 'claim-2', claim_text: '论断二', reference: 'ref-1' },
      { subject_id: 'person-ashoka', source_id: 'src-2', claim_id: 'claim-3', claim_text: '论断三', reference: 'ref-3' },
    ]
    const html = renderToStaticMarkup(
      <ProvenancePanelView status="success" records={grouped} />,
    )
    // The claims list now carries its own heading + first/second ordinal labels.
    expect(html).toContain('prov-claims__label')
    expect(html).toContain('第一')
    expect(html).toContain('第二')
  })

  it('groups records by source_id into source cards (S4)', () => {
    const grouped: ProvenanceRecord[] = [
      { subject_id: 'person-ashoka', source_id: 'src-1', claim_id: 'claim-1', claim_text: '论断一', reference: 'ref-1' },
      { subject_id: 'person-ashoka', source_id: 'src-1', claim_id: 'claim-2', claim_text: '论断二', reference: 'ref-1' },
      { subject_id: 'person-ashoka', source_id: 'src-2', claim_id: 'claim-3', claim_text: '论断三', reference: 'ref-3' },
    ]
    const html = renderToStaticMarkup(
      <ProvenancePanelView status="success" records={grouped} />,
    )
    expect(html).toContain('prov-source')
    // Two distinct sources => exactly two source cards.
    const heads = html.match(/prov-source__head/g) || []
    expect(heads.length).toBe(2)
    expect(html).toContain('论断一')
    expect(html).toContain('论断三')
    // The shared reference is shown once per source card, not per claim.
    expect(html).toContain('ref-1')
    // subject_id still hidden after grouping.
    expect(html).not.toContain('person-ashoka')
  })
})
