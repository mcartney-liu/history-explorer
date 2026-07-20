import { describe, it, expect } from 'vitest'
import {
  buildUnderstanding,
  buildUnderstandingsFromRelationships,
  buildUnderstandingsFromConnectionsExplained,
  type UnderstandingInput,
  type UnderstandingViewModel,
} from '../data/understandingRules'
import type { EntityRelationship } from '../components/EntityPage'
import type { ConnectionExplained } from '../components/ConnectionsExplainedPanel'

// M5-D (Design Freeze): the rule engine is PURE. These tests assert
// determinism, template behavior, multi-perspective (direction) flips, the
// fallback for unknown relation types, empty-input safety, and that NO
// score/ranking/similarity/AI logic is present.

function rel(
  type: string,
  direction: string,
  otherName: string,
  otherType = 'polity',
): EntityRelationship {
  return {
    type,
    source: 'a',
    target: 'b',
    direction,
    other: { id: 'b', name: otherName, type: otherType },
  }
}

describe('understandingRules (M5-D)', () => {
  it('conquered (forward): actor is conqueror, meaning names both sides', () => {
    const vm = buildUnderstanding({
      relationType: 'conquered',
      direction: 'forward',
      actorName: 'Rome',
      targetName: 'Greece',
      targetType: 'polity',
    })
    expect(vm.perspective).toBe('as conqueror')
    expect(vm.meaning).toContain('Rome')
    expect(vm.meaning).toContain('Greece')
    expect(vm.meaning).toContain('conquered')
  })

  it('conquered (reverse): perspective flips to conquered, target is subject', () => {
    const vm = buildUnderstanding({
      relationType: 'conquered',
      direction: 'reverse',
      actorName: 'Rome',
      targetName: 'Greece',
      targetType: 'polity',
    })
    expect(vm.perspective).toBe('as conquered')
    expect(vm.meaning).toContain('was conquered by')
  })

  it('direction "incoming" is treated as reverse (multi-perspective)', () => {
    const fwd = buildUnderstanding({
      relationType: 'influenced',
      direction: 'forward',
      actorName: 'A',
      targetName: 'B',
    })
    const inc = buildUnderstanding({
      relationType: 'influenced',
      direction: 'incoming',
      actorName: 'A',
      targetName: 'B',
    })
    expect(fwd.perspective).toBe('as influence')
    expect(inc.perspective).toBe('as influenced')
    expect(inc.meaning).not.toBe(fwd.meaning)
  })

  it('unknown relation type uses the deterministic fallback', () => {
    const vm = buildUnderstanding({
      relationType: 'mystery_rel',
      direction: 'forward',
      actorName: 'A',
      targetName: 'B',
    })
    expect(vm.perspective).toBe('as connected')
    expect(vm.meaning).toContain('connected to')
    expect(vm.meaning).toContain('mystery_rel')
  })

  it('empty input returns [] (relationships + connections_explained)', () => {
    expect(buildUnderstandingsFromRelationships(undefined, 'Actor')).toEqual([])
    expect(buildUnderstandingsFromRelationships([], 'Actor')).toEqual([])
    expect(buildUnderstandingsFromConnectionsExplained(undefined, 'Actor')).toEqual([])
    expect(buildUnderstandingsFromConnectionsExplained([], 'Actor')).toEqual([])
  })

  it('buildUnderstandingsFromRelationships maps each relationship', () => {
    const rels = [rel('ruled', 'forward', 'Province'), rel('traded_with', 'forward', 'Carthage')]
    const vms = buildUnderstandingsFromRelationships(rels, 'Rome')
    expect(vms).toHaveLength(2)
    expect(vms[0].actor).toBe('Rome')
    expect(vms[0].target).toBe('Province')
    expect(vms[1].meaning).toContain('traded with')
  })

  it('buildUnderstandingsFromConnectionsExplained resolves target name from map', () => {
    const conn: ConnectionExplained = {
      global_id: 'topic:b',
      depth: 1,
      path: [],
      steps: [{ relationship: 'traded_with', direction: 'outgoing', to_global_id: 'topic:b' }],
      score: 0.9,
      score_breakdown: {},
      explanation: 'x',
    }
    const vms = buildUnderstandingsFromConnectionsExplained([conn], 'Rome', { 'topic:b': 'Carthage' })
    expect(vms).toHaveLength(1)
    expect(vms[0].target).toBe('Carthage')
    expect(vms[0].meaning).toContain('traded with')
  })

  // --- M6-P1: Temporal Context Injection ---------------------------------
  it('M6-P1: relationships builder injects target timeContext when known', () => {
    const vms = buildUnderstandingsFromRelationships(
      [rel('conquered', 'forward', 'Greece')],
      'Rome',
      { Greece: '30 BC' },
    )
    expect(vms).toHaveLength(1)
    expect(vms[0].timeContext).toBe('30 BC')
  })

  it('M6-P1: relationships builder falls back to actor (centered) timeContext', () => {
    // On an entity page only the centered entity's own dates are available,
    // so the map is keyed by the actor name; the target ("Egypt") is not in it.
    const vms = buildUnderstandingsFromRelationships(
      [rel('conquered', 'forward', 'Egypt')],
      'Rome',
      { Rome: '753 BC - 476 CE' },
    )
    expect(vms).toHaveLength(1)
    expect(vms[0].timeContext).toBe('753 BC - 476 CE')
  })

  it('M6-P1: relationships builder leaves timeContext undefined when no map', () => {
    const vms = buildUnderstandingsFromRelationships(
      [rel('conquered', 'forward', 'Greece')],
      'Rome',
    )
    expect(vms).toHaveLength(1)
    expect(vms[0].timeContext).toBeUndefined()
  })

  it('M6-P1: connections_explained builder injects timeContext (4th arg)', () => {
    const conn: ConnectionExplained = {
      global_id: 'topic:b',
      depth: 1,
      path: [],
      steps: [{ relationship: 'traded_with', direction: 'outgoing', to_global_id: 'topic:b' }],
      score: 0.9,
      score_breakdown: {},
      explanation: 'x',
    }
    const vms = buildUnderstandingsFromConnectionsExplained(
      [conn],
      'Rome',
      { 'topic:b': 'Carthage' },
      { Carthage: '500 BC - 400 BC' },
    )
    expect(vms).toHaveLength(1)
    expect(vms[0].timeContext).toBe('500 BC - 400 BC')
  })

  it('M6-P1: connections_explained builder leaves timeContext undefined without 4th arg', () => {
    const conn: ConnectionExplained = {
      global_id: 'topic:b',
      depth: 1,
      path: [],
      steps: [{ relationship: 'traded_with', direction: 'outgoing', to_global_id: 'topic:b' }],
      score: 0.9,
      score_breakdown: {},
      explanation: 'x',
    }
    const vms = buildUnderstandingsFromConnectionsExplained([conn], 'Rome', { 'topic:b': 'Carthage' })
    expect(vms).toHaveLength(1)
    expect(vms[0].timeContext).toBeUndefined()
  })

  it('deterministic: same input yields identical output (no random/AI)', () => {
    const input: UnderstandingInput = {
      relationType: 'inherited',
      direction: 'forward',
      actorName: 'Byzantium',
      targetName: 'Rome',
      targetType: 'polity',
    }
    const a: UnderstandingViewModel = buildUnderstanding(input)
    const b: UnderstandingViewModel = buildUnderstanding(input)
    expect(a).toStrictEqual(b)
  })
})
