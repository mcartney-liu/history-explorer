// ============================================================
// M53 — ProductIntelligenceActivation
// Activation gate: decides when the M45-M52 intelligence
// pipeline should auto-run based on event activity.
// Zero AI. Zero backend. Zero UI.
// ============================================================

import type { UserBehaviorEvent } from './UserBehaviorEvent'

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export interface ActivationDecision {
  shouldActivate: boolean
  reason: string
}

// -----------------------------------------------------------
// Throttle
// -----------------------------------------------------------

let lastActivationTime = 0
const THROTTLE_MS = 60_000

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

export function shouldActivatePipeline(events: UserBehaviorEvent[]): ActivationDecision {
  // Rule D: No data = no activation
  if (events.length === 0) {
    return { shouldActivate: false, reason: 'No events' }
  }

  // Rule C: Throttle
  const now = Date.now()
  if (now - lastActivationTime < THROTTLE_MS) {
    return { shouldActivate: false, reason: 'Throttled' }
  }

  // Rule A: Milestone events — activate immediately
  const actions = new Set(events.map((e) => e.action))
  if (actions.has('save_research')) {
    lastActivationTime = now
    return { shouldActivate: true, reason: 'Milestone: save_research' }
  }
  if (actions.has('start_comparison')) {
    lastActivationTime = now
    return { shouldActivate: true, reason: 'Milestone: start_comparison' }
  }
  if (actions.has('start_research') && actions.has('save_research')) {
    lastActivationTime = now
    return { shouldActivate: true, reason: 'Milestone: research_loop_complete' }
  }

  // Rule B: Event threshold
  if (events.length >= 5) {
    lastActivationTime = now
    return { shouldActivate: true, reason: `Event threshold: ${events.length} >= 5` }
  }

  return { shouldActivate: false, reason: `Insufficient events: ${events.length} < 5` }
}

/** Reset throttle for testing. */
export function resetActivationThrottle(): void {
  lastActivationTime = 0
}
