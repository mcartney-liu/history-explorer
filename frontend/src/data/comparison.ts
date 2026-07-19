// M5-C (additive): pure data helpers for the Cross-Topic Comparison view.
//
// This module holds NO API requests, NO state, and NO navigation — it only
// shapes / filters the existing `cross_topic_related` payload so the
// TopicComparisonPanel can render a structured "compare A with B" view.
//
// Per Design Freeze: ONLY filter / map / transform are used. NO scoring,
// ranking, similarity, or recommendation.

import { CrossTopicRelated } from '../components/crossTopic'

// Derive the list of comparison target topics from A's cross-topic edges.
// Order-preserving de-duplication of the `topic` field. Pure transform.
export function pickComparisonTargets(
  crossTopicRelated: CrossTopicRelated[] | undefined,
): string[] {
  if (!crossTopicRelated || crossTopicRelated.length === 0) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const edge of crossTopicRelated) {
    const t = edge.topic
    if (t && !seen.has(t)) {
      seen.add(t)
      out.push(t)
    }
  }
  return out
}

// Given A's cross-topic edges and a selected target topic, return the bridging
// entities — the cross-topic records whose `topic` equals targetTopic. These
// are the records that connect A to B; clicking one opens the entity in B.
// Pure filter — no scoring / ranking / similarity.
export function deriveBridgedEntities(
  crossTopicRelated: CrossTopicRelated[] | undefined,
  targetTopic: string | null,
): CrossTopicRelated[] {
  if (!crossTopicRelated || !targetTopic) return []
  return crossTopicRelated.filter((e) => e.topic === targetTopic)
}

// Extract the owning topic from a global_id ("topic:localid"). Used to offer a
// "explore this topic" continuity action. Pure transform.
export function extractTopicFromGlobalId(
  globalId: string | null | undefined,
): string | null {
  if (!globalId) return null
  const idx = globalId.indexOf(':')
  if (idx <= 0) return null
  return globalId.slice(0, idx)
}
