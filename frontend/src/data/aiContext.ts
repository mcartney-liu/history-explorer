// M12-2 (AI Contextual Exploration): the frontend Context Assembly Layer.
//
// This module is the ONLY place that turns an exploration selection (an entity,
// a pair of entities, a timeline focus) into the `context_global_ids` array that
// the existing M12-1 AIExplanationPanel / aiClient send to the backend Grounded
// AI endpoints (ADR-0003).
//
// Hard constraints (M12-2 Scope Freeze):
//   - Pure functions. No state, no API/DB access, no history/persistence.
//   - Every input MUST be a real graph global_id. We reject:
//       * empty / non-string ids,
//       * timeline SYNTHETIC ids of the shape `topic:timeline:<label>` — those
//         are grounding-only citation ids minted by the backend
//         (grounding_builder.timeline_citation_id) and are NOT resolvable graph
//         nodes, so they must never be sent back as a grounding context.
//   - timelineContext accepts ONLY a real entity global_id, never a synthetic
//     `topic:timeline:xxx` id.
//
// The backend stays the single source of truth for grounding & citation
// validation; this layer only prevents obviously invalid context from being
// assembled on the client.

// A backend timeline citation id looks like `<topic>:timeline:<label>` (see
// backend/app/ai_gateway/grounding_builder.py::timeline_citation_id). The
// distinguishing feature is a literal `timeline` segment in the second slot.
const TIMELINE_SYNTHETIC_ID = /^[^:]+:timeline:/

/**
 * True only for a synthetic timeline citation id (`topic:timeline:<label>`).
 * These are grounding-only and must never be used as a context global_id.
 */
export function isTimelineSyntheticId(id: unknown): boolean {
  return typeof id === 'string' && TIMELINE_SYNTHETIC_ID.test(id.trim())
}

/**
 * A usable entity/relationship context global_id: a non-empty string that is
 * NOT a synthetic timeline id. (Local ids and fabricated ids that reach this
 * point are the caller's responsibility to source from the real graph payload;
 * this guard blocks the one synthetic shape the frontend can itself produce.)
 */
export function isValidContextGlobalId(id: unknown): id is string {
  return typeof id === 'string' && id.trim().length > 0 && !isTimelineSyntheticId(id)
}

function assertValid(id: unknown, role: string): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Error(`aiContext: ${role} must be a non-empty global_id`)
  }
  const trimmed = id.trim()
  if (isTimelineSyntheticId(trimmed)) {
    throw new Error(
      `aiContext: ${role} must be a real entity global_id, not a synthetic timeline id (${trimmed})`,
    )
  }
  return trimmed
}

/**
 * Context for explaining a single entity: `[entity.global_id]`.
 * Throws if the id is empty or a synthetic timeline id.
 */
export function entityContext(globalId: string): string[] {
  return [assertValid(globalId, 'entity globalId')]
}

/**
 * Context for explaining the relationship between two entities:
 * `[entityAGid, entityBGid]`. Both must be real, distinct entity global_ids.
 * This is a RELATIONSHIP explanation context (not causal reasoning) — the two
 * ids simply scope grounding to the pair.
 */
export function relationshipContext(entityAGid: string, entityBGid: string): string[] {
  const a = assertValid(entityAGid, 'relationship entityAGid')
  const b = assertValid(entityBGid, 'relationship entityBGid')
  if (a === b) {
    throw new Error('aiContext: relationship needs two distinct entity global_ids')
  }
  return [a, b]
}

/**
 * Context for explaining a timeline in the scope of one entity:
 * `[entityGid]`. The frontend NEVER invents a timeline citation id — grounding
 * for timeline periods is produced by the backend. So this deliberately takes
 * the focused entity's global_id and rejects any `topic:timeline:xxx` input.
 */
export function timelineContext(entityGid: string): string[] {
  return [assertValid(entityGid, 'timeline entityGid')]
}
