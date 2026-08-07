/** M82 P1.5/1.6 — CausalStatement API type and UI helpers.
 * M84 — CausalObject type added.
 */

export interface CausalStatementData {
  cause_id: string
  effect_id: string
  mechanism: string | null
  consequence: string | null
  confidence: 'high' | 'medium' | 'low' | null
  evidence_refs: string[]
}

/** M84 — CausalObject: CausalStatement super-set with exploration context.
 * M85 — adds related_causal_objects for Semantic Relationship. */
export interface CausalObjectData extends CausalStatementData {
  id: string
  object_type: 'causal'
  related_entities: string[]
  exploration_paths: ExplorationPathRefData[]
  /** M85 — curator-authored semantic links to other CausalObjects. */
  related_causal_objects?: RelatedCausalObjectRefData[]
}

/** M84 — A recommended exploration path from a CausalObject. */
export interface ExplorationPathRefData {
  from: string
  to: string
  relationship: string
  label: string
}

/** M85 — A curator-authored semantic link between two CausalObjects.
 *  NOT a graph edge, NOT AI-generated, NOT a recommendation. */
export interface RelatedCausalObjectRefData {
  target_id: string
  relation_type: 'institutional_evolution' | 'technological_chain' | 'civilization_contrast' | 'ideological_influence'
  explanation: string
}

/**
 * Map a C-7 confidence value to a user-facing label key.
 * Used by CausalStatementCard for i18n.
 */
export function confidenceLabelKey(
  confidence: CausalStatementData['confidence'],
): string {
  switch (confidence) {
    case 'high':
      return 'causal.confidenceHigh'
    case 'medium':
      return 'causal.confidenceMedium'
    case 'low':
      return 'causal.confidenceLow'
    default:
      return 'causal.confidenceUnknown'
  }
}
