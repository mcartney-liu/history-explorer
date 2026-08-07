/** M82 P1.7 — Evidence traceability unit tests. */
import { describe, it, expect } from 'vitest'
import { resolveEvidenceRefs, lookupEvidenceClaim } from '../evidenceTrace'

describe('evidenceTrace', () => {
  // ------------------------------------------------------------------
  // Test 1: resolveEvidenceRefs with valid claim IDs
  // ------------------------------------------------------------------
  it('resolves valid evidence_refs to structured claims', () => {
    // ec-cn-001 and ec-cn-002 exist in evidence_claims.json
    const result = resolveEvidenceRefs(['ec-cn-001', 'ec-cn-002'])
    expect(result.length).toBe(2)
    expect(result[0].claim).toBeDefined()
    expect(result[0].sources.length).toBeGreaterThanOrEqual(1)
    expect(result[1].claim).toBeDefined()
    expect(result[1].sources.length).toBeGreaterThanOrEqual(1)
  })

  // ------------------------------------------------------------------
  // Test 2: resolveEvidenceRefs with empty array
  // ------------------------------------------------------------------
  it('returns empty array for empty evidence_refs', () => {
    const result = resolveEvidenceRefs([])
    expect(result).toEqual([])
  })

  // ------------------------------------------------------------------
  // Test 3: resolveEvidenceRefs with non-existent claim ID
  // ------------------------------------------------------------------
  it('degrades gracefully for non-existent claim IDs', () => {
    const result = resolveEvidenceRefs(['ec-nonexistent-999'])
    expect(result.length).toBe(1)
    // getEvidenceWithSources returns a record even for unknown claims
    // (source list will be empty but the claim field carries the id)
    expect(result[0].claim).toBeDefined()
  })

  // ------------------------------------------------------------------
  // Test 4: lookupEvidenceClaim — existing claim
  // ------------------------------------------------------------------
  it('looks up an existing evidence claim', () => {
    const claim = lookupEvidenceClaim('ec-cn-001')
    expect(claim).toBeDefined()
    expect(claim!.id).toBe('ec-cn-001')
    expect(typeof claim!.claim).toBe('string')
  })

  // ------------------------------------------------------------------
  // Test 5: lookupEvidenceClaim — non-existent claim
  // ------------------------------------------------------------------
  it('returns null for non-existent evidence claim', () => {
    const claim = lookupEvidenceClaim('ec-nonexistent-999')
    expect(claim).toBeNull()
  })
})
