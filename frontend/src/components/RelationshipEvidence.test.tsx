import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RelationshipEvidenceView } from './RelationshipEvidence'
import { LocaleProvider } from '../data/locale'
import { getProvenance, type ProvenanceRecord } from '../data/provenanceApi'

const records: ProvenanceRecord[] = [
  {
    subject_id: 'person-ashoka',
    source_id: 'src-1',
    claim_id: 'claim-1',
    claim_text: '阿育王推崇佛教',
    reference: 'ref-1',
  },
  {
    subject_id: 'person-ashoka',
    source_id: 'src-2',
    claim_id: 'claim-2',
    claim_text: '阿育王颁布石刻诏令',
    reference: 'ref-2',
  },
]

describe('RelationshipEvidenceView', () => {
  it('renders loading skeleton', () => {
    const html = renderToStaticMarkup(
      <RelationshipEvidenceView status="loading" records={[]} />,
    )
    expect(html).toContain('读取事实溯源')
  })

  it('renders empty state', () => {
    const html = renderToStaticMarkup(
      <RelationshipEvidenceView status="empty" records={[]} />,
    )
    expect(html).toContain('暂无策展的事实溯源记录')
  })

  it('renders disabled state', () => {
    const html = renderToStaticMarkup(
      <RelationshipEvidenceView status="disabled" records={[]} />,
    )
    expect(html).toContain('PROVENANCE_PROJECTION=false')
  })

  it('renders error card with retry', () => {
    const html = renderToStaticMarkup(
      <LocaleProvider>
        <RelationshipEvidenceView
          status="error"
          records={[]}
          errorKind="network"
          onRetry={() => {}}
        />
      </LocaleProvider>,
    )
    expect(html).toContain('重试')
  })

  it('renders records on success (reuses provenance list, hides subject_id)', () => {
    const html = renderToStaticMarkup(
      <RelationshipEvidenceView
        status="success"
        records={records}
        entityName="Ashoka"
      />,
    )
    expect(html).toContain('claim-1')
    expect(html).toContain('src-1')
    expect(html).toContain('ref-2')
    // subject_id is an internal index key and must NOT be shown.
    expect(html).not.toContain('person-ashoka')
  })
})

// Local-id contract: provenance resolution is keyed by LOCAL id. The container
// always forwards RelationshipView's relatedEntities[].id (a LOCAL id) to
// getProvenance, which encodes the rule. This test locks the contract at the
// API layer: the request URL must contain the LOCAL id and must NOT contain a
// global_id colon separator.
describe('local id contract (provenance resolution)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('resolves provenance using the LOCAL id "person-ashoka" (no global_id colon)', async () => {
    const resp = {
      entity_id: 'person-ashoka',
      provenance: [
        {
          subject_id: 'person-ashoka',
          source_id: 'src-1',
          claim_id: 'claim-1',
          claim_text: '阿育王推崇佛教',
          reference: 'ref-1',
        },
      ],
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ status: 200, ok: true, json: vi.fn().mockResolvedValue(resp) })
    vi.stubGlobal('fetch', fetchMock)

    const rows = await getProvenance('person-ashoka')
    expect(rows).toHaveLength(1)
    const url = fetchMock.mock.calls[0][0] as string
    // The entity id is encoded verbatim in the path. A LOCAL id has no colon;
    // a global_id ("topic:localid") would surface the colon here, so we assert
    // the id segment is exactly the LOCAL id with no colon separator.
    const idSegment = url.split('/provenance/')[1]
    expect(idSegment).toBe('person-ashoka')
  })
})
