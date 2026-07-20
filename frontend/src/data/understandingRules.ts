// M5-D: Rule-based Historical Meaning Layer.
//
// This module is the deterministic, explainable "WHY does this connection
// matter" engine. It is a PURE data-layer module:
//   - only filter / map / transform operations
//   - fixed templates with variable substitution (actor / target / type / ...)
//   - NO AI / LLM / prompt / embedding / similarity / recommendation / ranking
//   - NO score / weight / confidence computation
//   - output is fully deterministic (same input -> same output)
//
// "meaning" strings are NOT generated natural language: they are pre-written
// template constants with entity names substituted in. This is the same
// technique the backend uses in exploration_engine._explain_path (structured
// template text), which is explicitly permitted by the M5-D product goal
// ("deterministic rules + templated expression").
import type { EntityRelationship } from '../components/EntityPage'
import type { ConnectionExplained } from '../components/ConnectionsExplainedPanel'

export type UnderstandingInput = {
  relationType: string
  // direction is whatever the source provides: 'forward' | 'reverse' (entity
  // relationships) or 'outgoing' | 'incoming' (connections_explained steps).
  direction: string
  actorName: string
  targetName: string
  targetType?: string
  timeContext?: string
}

export type UnderstandingViewModel = {
  relationType: string
  direction: string
  actor: string
  target: string
  targetType?: string
  timeContext?: string
  meaning: string
  perspective: string
}

// Directions that reverse the subject/object orientation of a relationship.
const REVERSE_DIRS = new Set(['reverse', 'incoming'])
function isReverse(direction: string): boolean {
  return REVERSE_DIRS.has((direction ?? '').toLowerCase())
}

// Each template returns a fixed-sentence meaning + a perspective label.
// `forward` = actor is the grammatical subject (e.g. the conqueror);
// `reverse` = the relationship is seen from the target's side.
// All text is constant except for the {actor}/{target}/{targetType} names.
type Template = {
  forward: (i: UnderstandingInput) => { meaning: string; perspective: string }
  reverse: (i: UnderstandingInput) => { meaning: string; perspective: string }
}

const ty = (t?: string) => (t ? ` ${t}` : '')

export const RELATIONSHIP_TEMPLATES: Record<string, Template> = {
  caused: {
    forward: (i) => ({
      meaning: `${i.actorName} caused conditions that led to ${i.targetName}${ty(i.targetType)}.`,
      perspective: 'as cause',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName}${ty(i.targetType)} was the outcome caused by ${i.actorName}.`,
      perspective: 'as effect',
    }),
  },
  influenced: {
    forward: (i) => ({
      meaning: `${i.actorName} influenced ${i.targetName}${ty(i.targetType)}, leaving a durable imprint on its development.`,
      perspective: 'as influence',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName}${ty(i.targetType)} was shaped by the influence of ${i.actorName}.`,
      perspective: 'as influenced',
    }),
  },
  participated_in: {
    forward: (i) => ({
      meaning: `${i.actorName} participated in ${i.targetName}${ty(i.targetType)}.`,
      perspective: 'as participant',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName}${ty(i.targetType)} involved ${i.actorName} as a participant.`,
      perspective: 'as context',
    }),
  },
  located_at: {
    forward: (i) => ({
      meaning: `${i.actorName} was located at ${i.targetName}${ty(i.targetType)}.`,
      perspective: 'as located place',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName}${ty(i.targetType)} was the location of ${i.actorName}.`,
      perspective: 'as location',
    }),
  },
  related_to: {
    forward: (i) => ({
      meaning: `${i.actorName} relates to ${i.targetName} within the broader historical network.`,
      perspective: 'as related',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName} relates to ${i.actorName} within the broader historical network.`,
      perspective: 'as related',
    }),
  },
  before: {
    forward: (i) => ({
      meaning: `${i.actorName} preceded ${i.targetName} in time.`,
      perspective: 'as earlier',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName} followed ${i.actorName} in time.`,
      perspective: 'as later',
    }),
  },
  after: {
    forward: (i) => ({
      meaning: `${i.actorName} followed ${i.targetName} in time.`,
      perspective: 'as later',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName} preceded ${i.actorName} in time.`,
      perspective: 'as earlier',
    }),
  },
  contemporary_with: {
    forward: (i) => ({
      meaning: `${i.actorName} was contemporary with ${i.targetName}.`,
      perspective: 'as contemporary',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName} was contemporary with ${i.actorName}.`,
      perspective: 'as contemporary',
    }),
  },
  part_of: {
    forward: (i) => ({
      meaning: `${i.actorName} was part of ${i.targetName}${ty(i.targetType)}.`,
      perspective: 'as component',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName}${ty(i.targetType)} contained ${i.actorName} as a part.`,
      perspective: 'as whole',
    }),
  },
  ruled: {
    forward: (i) => ({
      meaning: `${i.actorName} ruled ${i.targetName}${ty(i.targetType)}.`,
      perspective: 'as ruler',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName}${ty(i.targetType)} was ruled by ${i.actorName}.`,
      perspective: 'as ruled',
    }),
  },
  traded_with: {
    forward: (i) => ({
      meaning: `${i.actorName} traded with ${i.targetName}${ty(i.targetType)}.`,
      perspective: 'as trade partner',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName}${ty(i.targetType)} traded with ${i.actorName}.`,
      perspective: 'as trade partner',
    }),
  },
  invented: {
    forward: (i) => ({
      meaning: `${i.actorName} invented ${i.targetName}${ty(i.targetType)}.`,
      perspective: 'as inventor',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName}${ty(i.targetType)} was invented by ${i.actorName}.`,
      perspective: 'as invention',
    }),
  },
  discovered: {
    forward: (i) => ({
      meaning: `${i.actorName} discovered ${i.targetName}${ty(i.targetType)}.`,
      perspective: 'as discoverer',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName}${ty(i.targetType)} was discovered by ${i.actorName}.`,
      perspective: 'as discovery',
    }),
  },
  practiced: {
    forward: (i) => ({
      meaning: `${i.actorName} practiced ${i.targetName}${ty(i.targetType)}.`,
      perspective: 'as practitioner',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName}${ty(i.targetType)} was practiced by ${i.actorName}.`,
      perspective: 'as practiced',
    }),
  },
  spoke: {
    forward: (i) => ({
      meaning: `${i.actorName} spoke ${i.targetName}${ty(i.targetType)}.`,
      perspective: 'as speaker',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName}${ty(i.targetType)} was spoken by ${i.actorName}.`,
      perspective: 'as language',
    }),
  },
  inherited: {
    forward: (i) => ({
      meaning: `${i.actorName} inherited institutions from ${i.targetName}${ty(i.targetType)}, marking continuity across regimes.`,
      perspective: 'as inheritor',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName}${ty(i.targetType)} was inherited by ${i.actorName}, carrying its legacy forward.`,
      perspective: 'as legacy',
    }),
  },
  conquered: {
    forward: (i) => ({
      meaning: `${i.actorName} conquered ${i.targetName}${ty(i.targetType)}, imposing its order and reshaping it.`,
      perspective: 'as conqueror',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName}${ty(i.targetType)} was conquered by ${i.actorName}, its order remade under foreign rule.`,
      perspective: 'as conquered',
    }),
  },
  spread: {
    forward: (i) => ({
      meaning: `${i.actorName} spread to ${i.targetName}${ty(i.targetType)}, carrying practices across boundaries.`,
      perspective: 'as diffusion source',
    }),
    reverse: (i) => ({
      meaning: `${i.targetName}${ty(i.targetType)} received ${i.actorName} as it spread, absorbing external practices.`,
      perspective: 'as diffusion recipient',
    }),
  },
}

// Deterministic fallback for any relation type not covered by a template.
function fallbackUnderstanding(i: UnderstandingInput): { meaning: string; perspective: string } {
  return {
    meaning: `${i.actorName} is connected to ${i.targetName} through a ${i.relationType} relationship.`,
    perspective: 'as connected',
  }
}

// Build a single understanding view model from a normalized input.
export function buildUnderstanding(input: UnderstandingInput): UnderstandingViewModel {
  const tpl = RELATIONSHIP_TEMPLATES[input.relationType]
  const resolved = tpl
    ? isReverse(input.direction)
      ? tpl.reverse(input)
      : tpl.forward(input)
    : fallbackUnderstanding(input)
  return {
    relationType: input.relationType,
    direction: input.direction,
    actor: input.actorName,
    target: input.targetName,
    targetType: input.targetType,
    timeContext: input.timeContext,
    meaning: resolved.meaning,
    perspective: resolved.perspective,
  }
}

// Build understandings from a centered entity's relationships (EntityPage).
// `actorName` is the centered entity; each relationship's `other` is the target.
// Pure map over the relationship list — no filtering by score, no ranking.
export function buildUnderstandingsFromRelationships(
  rels: EntityRelationship[] | undefined,
  actorName: string,
  timeByTarget?: Record<string, string>,
): UnderstandingViewModel[] {
  if (!rels || rels.length === 0) return []
  return rels.map((r) => {
    const targetName = r.other?.name ?? r.target
    return buildUnderstanding({
      relationType: r.type,
      direction: r.direction,
      actorName,
      targetName,
      targetType: r.other?.type,
      // M6-P1 (Temporal Context Injection): prefer the TARGET entity's dates
      // when known; fall back to the actor (centered) entity's own dates. The
      // actor fallback is what makes the Entity-page path work, where only the
      // centered entity's own dates are available (the API does not return the
      // relationship target's dates). No date -> undefined -> no Time line.
      timeContext: timeByTarget
        ? timeByTarget[targetName] ?? timeByTarget[actorName]
        : undefined,
    })
  })
}

// A single connections_explained step carries {relationship, direction,
// from_global_id, to_global_id}. We normalize the first step of each
// connection into a rule input. `actorName` is the centered main entity;
// `globalIdToName` resolves the step's target global_id to a display name.
type ConnectionStep = {
  relationship?: string
  direction?: string
  to_global_id?: string
}

function localName(globalId: string): string {
  if (!globalId || !globalId.includes(':')) return globalId
  return globalId.split(':').slice(1).join(':') || globalId
}

export function buildUnderstandingsFromConnectionsExplained(
  connections: ConnectionExplained[] | undefined,
  actorName: string,
  globalIdToName?: Record<string, string>,
  // M6-P1 (Temporal Context Injection): name -> formatted date-range string,
  // built by the caller from result.entities (explore path). Purely additive;
  // when absent the Time line is omitted. Lookup mirrors the relationships
  // builder: prefer the resolved target name, fall back to the actor name.
  timeByTarget?: Record<string, string>,
): UnderstandingViewModel[] {
  if (!connections || connections.length === 0) return []
  const out: UnderstandingViewModel[] = []
  for (const conn of connections) {
    const steps = (conn.steps as ConnectionStep[] | undefined) ?? []
    const step = steps[0]
    if (!step || !step.relationship) continue
    const targetName =
      (step.to_global_id && globalIdToName && globalIdToName[step.to_global_id]) ||
      (step.to_global_id ? localName(step.to_global_id) : '')
    out.push(
      buildUnderstanding({
        relationType: step.relationship,
        direction: step.direction ?? 'forward',
        actorName,
        targetName,
        timeContext: timeByTarget
          ? timeByTarget[targetName] ?? timeByTarget[actorName]
          : undefined,
      }),
    )
  }
  return out
}
