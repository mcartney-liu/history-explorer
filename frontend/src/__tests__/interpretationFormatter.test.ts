import { describe, it, expect } from 'vitest'
import { ConnectionExplained } from '../components/ConnectionsExplainedPanel'
import {
  toInterpretationViewModel,
  toInterpretationViewModels,
  InterpretationViewModel,
} from '../data/interpretationFormatter'

// ADR-0020 (bilingual data layer): the formatter resolves names + the "why"
// sentence from the data-layer labels (bilingual) driven by the active locale.
// `explanation` is assembled locally from `steps`
// (from_global_id / relationship / to_global_id) so it stays in the SAME
// locale as the entity names — no backend English prose. The backend's English
// `explanation` is only a fallback when a connection has no `steps`.

const base: ConnectionExplained = {
  global_id: 'silk_road:han_dynasty',
  depth: 2,
  path: ['roman_empire:civ-roman', 'silk_road:han_dynasty'],
  steps: [
    {
      from_global_id: 'roman_empire:civ-roman',
      to_global_id: 'silk_road:han_dynasty',
      relationship: 'traded_with',
    },
  ],
  score: 0.81,
  score_breakdown: { relationship: 0.35 },
  explanation: 'Connected through overland trade routes.',
}

describe('interpretationFormatter (ADR-0020 bilingual)', () => {
  it('assembles explanation locally from steps in zh', () => {
    const vm = toInterpretationViewModel(base, 'zh')
    expect(vm.explanation).toBe('罗马文明 贸易往来 汉朝')
  })

  it('assembles the SAME steps in en (locale-driven, no backend prose)', () => {
    const vm = toInterpretationViewModel(base, 'en')
    expect(vm.explanation).toBe('Roman Civilization Traded With Han Dynasty')
  })

  it('resolves localName from data-layer labels per locale', () => {
    expect(toInterpretationViewModel(base, 'zh').localName).toBe('汉朝')
    expect(toInterpretationViewModel(base, 'en').localName).toBe('Han Dynasty')
    // unknown global_id (no labels) -> returned as-is, never throws
    expect(toInterpretationViewModel({ ...base, global_id: 'rome' }, 'zh').localName).toBe('rome')
  })

  it('falls back to backend explanation only when steps are empty', () => {
    const vm = toInterpretationViewModel({ ...base, steps: [], path: [] }, 'zh')
    expect(vm.explanation).toBe('Connected through overland trade routes.')
  })

  it('assembles from steps even when the backend explanation is empty', () => {
    const vm = toInterpretationViewModel({ ...base, explanation: '' }, 'zh')
    expect(vm.explanation).toBe('罗马文明 贸易往来 汉朝')
    expect(vm.localName).toBe('汉朝')
  })

  it('maps depth and score field-for-field', () => {
    const vm = toInterpretationViewModel(base)
    expect(vm.depth).toBe(2)
    expect(vm.score).toBe(0.81)
    expect(vm.global_id).toBe('silk_road:han_dynasty')
  })

  it('produces the exact expected view model (toStrictEqual, deterministic)', () => {
    const expected: InterpretationViewModel = {
      global_id: 'silk_road:han_dynasty',
      localName: '汉朝',
      depth: 2,
      score: 0.81,
      explanation: '罗马文明 贸易往来 汉朝',
    }
    expect(toInterpretationViewModel(base)).toStrictEqual(expected)
    // same input -> same output (no randomness / time dependence)
    expect(toInterpretationViewModel(base)).toStrictEqual(toInterpretationViewModel(base))
  })

  it('returns an empty list for absent or empty input', () => {
    expect(toInterpretationViewModels()).toStrictEqual([])
    expect(toInterpretationViewModels([])).toStrictEqual([])
  })

  it('maps a list preserving order', () => {
    const a = { ...base, global_id: 'roman_empire:civ-roman' }
    const b = { ...base, global_id: 'silk_road:han_dynasty' }
    const vms = toInterpretationViewModels([a, b], 'zh')
    expect(vms.map((v) => v.global_id)).toStrictEqual([
      'roman_empire:civ-roman',
      'silk_road:han_dynasty',
    ])
  })
})
