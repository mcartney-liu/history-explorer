/** M82 P1.7 — Evidence traceability utilities.

Bridges CausalStatementCard evidence_refs to SourceChain's
getEvidenceWithSources() — pure functions, no state management.
*/

import {
  getEvidenceClaim,
  getEvidenceWithSources,
  type PackageEvidenceRef,
} from './explorationPackages'

/**
 * Resolve a list of CausalStatement evidence_refs (claim IDs) into
 * the structured format consumed by SourceChain.
 *
 * Degrades gracefully: unknown claim IDs are included with a
 * fallback label so the UI never throws.
 */
export function resolveEvidenceRefs(
  evidenceRefs: string[],
): PackageEvidenceRef[] {
  return getEvidenceWithSources(evidenceRefs)
}

/**
 * Look up a single evidence claim by ID.
 * Returns null when the claim does not exist — the caller decides
 * whether to show a fallback or skip rendering.
 */
export function lookupEvidenceClaim(
  evidenceId: string,
): ReturnType<typeof getEvidenceClaim> {
  return getEvidenceClaim(evidenceId)
}
