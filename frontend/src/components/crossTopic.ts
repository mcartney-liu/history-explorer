// M4-003 (additive): pure helpers for the cross-topic UI.
//
// This module holds NO API requests, NO state, and NO navigation — it only
// shapes data and maps raw keys to display labels, mirroring the established
// `navigation.ts` pure-module pattern (Node-testable, no React, no DOM).

export type RelatedTopic = {
  topic: string
  cross_topic_edge_count: number
}

export type CrossTopicRelated = {
  id: string | null
  name: string | null
  type: string | null
  global_id: string | null
  topic: string | null
  relationship: string | null
  direction: string | null
}

// Prettify a topic / relationship key into a human-readable label,
// e.g. "roman_empire" -> "Roman Empire". Keeps the same rule as App's
// `prettifyTopic` so labels stay consistent across the app.
export function formatTopicLabel(topic: string): string {
  return topic
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// Human-readable label for a relationship type. Falls back to a neutral
// "Related" when the value is missing so the UI never shows a raw token.
export function formatRelationship(rel: string | null): string {
  if (!rel) return 'Related'
  return formatTopicLabel(rel)
}
