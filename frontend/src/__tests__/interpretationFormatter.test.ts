import { describe, it, expect } from 'vitest'
import { ConnectionExplained } from '../components/ConnectionsExplainedPanel'
import {
  toInterpretationViewModel,
  toInterpretationViewModels,
  InterpretationViewModel,
} from '../data/interpretationFormatter'

// M5-A-6: the formatter is a PURE deterministic field mapping. These tests
// assert it preserves the backend's `explanation` verbatim, derives localName
// only from global_id, and never invents content (no relationshipHint, no AI).

const base: ConnectionExplained = {
  global_id: 'silk_road:han_dynasty',
  depth: 2,
  path: ['roman_empire:rome', 'silk_road:han_dynasty'],
  steps: [{ from_global_id: 'roman_empire:rome', to_global_id: 'silk_road:han_dynasty' }],
  score: 0.81,
  score_breakdown: { relationship: 0.35 },
  explanation: 'Connected through overland trade routes.',
}

describe('interpretationFormatter (M5-A-6)', () => {
  it('preserves explanation verbatim', () => {
    const vm = toInterpretationViewModel(base)
    expect(vm.explanation).toBe('Connected through overland trade routes.')
  })

  it('derives localName from the segment after ":"', () => {
    expect(toInterpretationViewModel(base).localName).toBe('han_dynasty')
    // no colon -> returned as-is
    expect(
      toInterpretationViewModel({ ...base, global_id: 'rome' }).localName,
    ).toBe('rome')
  })

  it('maps depth and score field-for-field', () => {
    const vm = toInterpretationViewModel(base)
    expect(vm.depth).toBe(2)
    expect(vm.score).toBe(0.81)
    expect(vm.global_id).toBe('silk_road:han_dynasty')
  })

  it('handles empty explanation safely (kept verbatim, not invented)', () => {
    const vm = toInterpretationViewModel({ ...base, explanation: '' })
    expect(vm.explanation).toBe('')
    expect(vm.localName).toBe('han_dynasty')
  })

  it('handles empty path and empty steps without throwing', () => {
    const vm = toInterpretationViewModel({ ...base, path: [], steps: [] })
    expect(vm.global_id).toBe('silk_road:han_dynasty')
    expect(vm.explanation).toBe('Connected through overland trade routes.')
  })

  it('produces the exact expected view model (toStrictEqual, deterministic)', () => {
    const expected: InterpretationViewModel = {
      global_id: 'silk_road:han_dynasty',
      localName: 'han_dynasty',
      depth: 2,
      score: 0.81,
      explanation: 'Connected through overland trade routes.',
    }
    expect(toInterpretationViewModel(base)).toStrictEqual(expected)
    // same input -> same output (no randomness / time dependence)
    expect(toInterpretationViewModel(base)).toStrictEqual(
      toInterpretationViewModel(base),
    )
  })

  it('returns an empty list for absent or empty input', () => {
    expect(toInterpretationViewModels()).toStrictEqual([])
    expect(toInterpretationViewModels([])).toStrictEqual([])
  })

  it('maps a list preserving order', () => {
    const a = { ...base, global_id: 'roman_empire:rome' }
    const b = { ...base, global_id: 'silk_road:han_dynasty' }
    const vms = toInterpretationViewModels([a, b])
    expect(vms.map((v) => v.global_id)).toStrictEqual([
      'roman_empire:rome',
      'silk_road:han_dynasty',
    ])
  })
})
