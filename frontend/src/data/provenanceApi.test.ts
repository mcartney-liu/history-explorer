import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  getProvenance,
  ProvenanceDisabledError,
  type ProvenanceResponse,
} from './provenanceApi'

function mockFetch(body: string | null, status = 200, ok = true) {
  const json = vi.fn().mockResolvedValue(body ? JSON.parse(body) : null)
  const fetchMock = vi.fn().mockResolvedValue({ status, ok, json })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, json }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('getProvenance', () => {
  it('returns records on 200 with provenance array', async () => {
    const resp: ProvenanceResponse = {
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
    mockFetch(JSON.stringify(resp))
    const rows = await getProvenance('person-ashoka')
    expect(rows).toHaveLength(1)
    expect(rows[0].claim_id).toBe('claim-1')
  })

  it('returns empty array on 200 with empty provenance', async () => {
    mockFetch(JSON.stringify({ entity_id: 'x', provenance: [] }))
    const rows = await getProvenance('x')
    expect(rows).toEqual([])
  })

  it('throws ProvenanceDisabledError on 404', async () => {
    mockFetch(null, 404, false)
    await expect(getProvenance('x')).rejects.toBeInstanceOf(ProvenanceDisabledError)
  })

  it('throws on 500', async () => {
    mockFetch(null, 500, false)
    await expect(getProvenance('x')).rejects.toThrow(/Provenance request failed/)
  })

  it('throws on malformed json', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockRejectedValue(new SyntaxError('bad json')),
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(getProvenance('x')).rejects.toThrow()
  })
})
