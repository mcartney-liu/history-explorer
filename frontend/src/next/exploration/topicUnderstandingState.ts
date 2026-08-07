// ============================================================
// M90.3 Stage C-3 — topicUnderstandingState
//
// Generic Understanding Workspace state builder.
// Replaces the frenchRevolution-only buildFrenchRevolutionWorkspaceState.
//
// Current evidence sets: french-revolution (hardcoded).
// Future topics register their evidence via this module.
// ============================================================

import type { UnderstandingWorkspaceState } from './UnderstandingWorkspaceState'
import { buildFrenchRevolutionWorkspaceState } from './frenchRevolution/projection'

/**
 * Topic → evidence builder mapping.
 * Extensible: when a new topic gets its own evidence set, add it here.
 */
const TOPIC_BUILDERS: Record<string, (index: number) => UnderstandingWorkspaceState> = {
  'french-revolution': buildFrenchRevolutionWorkspaceState,
}

/**
 * Build the Understanding Workspace state for a given topic.
 *
 * @param topic        the topic slug from the Router
 * @param evidenceIndex  which evidence step the user is on (0 = orientation)
 * @returns            workspace state, or null if the topic has no evidence data
 */
export function buildTopicUnderstandingState(
  topic: string | null,
  evidenceIndex: number,
): UnderstandingWorkspaceState | null {
  if (!topic) return null

  const builder = TOPIC_BUILDERS[topic]
  if (!builder) return null

  try {
    return builder(evidenceIndex)
  } catch {
    return null
  }
}

/**
 * Check whether a topic has Understanding Workspace data.
 */
export function hasUnderstandingData(topic: string | null): boolean {
  if (!topic) return false
  return topic in TOPIC_BUILDERS
}
