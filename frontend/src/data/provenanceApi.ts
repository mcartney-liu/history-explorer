// M30-A: thin data layer over the provenance projection endpoint (M29.1).
// HTTP ONLY — no UI, no judgement. Mirrors aiClient.ts conventions.
const API_BASE: string = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export type ProvenanceRecord = {
  subject_id: string
  source_id: string
  claim_id: string
  reference: string
}

export type ProvenanceResponse = {
  entity_id: string
  provenance: ProvenanceRecord[]
}

// Thrown when the backend returns 404 (PROVENANCE_PROJECTION=false).
// Lets the UI show a friendly "disabled" state instead of a hard error.
export class ProvenanceDisabledError extends Error {
  constructor() {
    super('Provenance projection is disabled')
    this.name = 'ProvenanceDisabledError'
  }
}

export async function getProvenance(
  entityId: string,
  signal?: AbortSignal,
): Promise<ProvenanceRecord[]> {
  // NOTE: entityId MUST be the LOCAL entity id (e.g. "person-ashoka"), NOT the
  // global_id ("ancient_india:person-ashoka"). backend provenance_index.resolve()
  // matches claim.subject_id verbatim, which is stored as the local id.
  const resp = await fetch(
    `${API_BASE}/api/v1/provenance/${encodeURIComponent(entityId)}`,
    { signal },
  )
  if (resp.status === 404) throw new ProvenanceDisabledError()
  if (!resp.ok) throw new Error(`Provenance request failed (${resp.status})`)
  const data = (await resp.json()) as ProvenanceResponse
  return data.provenance ?? []
}
