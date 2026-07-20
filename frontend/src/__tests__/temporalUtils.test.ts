import { describe, it, expect } from 'vitest'
import {
  formatTimeValue,
  formatDateRange,
  buildEntityTimeMap,
  type TimeValue,
} from '../data/temporalUtils'

// M6-P1 (Temporal Context Injection): the formatter is PURE and DETERMINISTIC.
// It only converts a backend TimeValue into a label — no era reasoning, no
// interpretation, no ranking/similarity.

describe('temporalUtils (M6-P1)', () => {
  describe('formatTimeValue', () => {
    it('BCE: prefers backend label verbatim', () => {
      const tv: TimeValue = { value: -63, label: '63 BC' }
      expect(formatTimeValue(tv)).toBe('63 BC')
    })

    it('CE: prefers backend label verbatim', () => {
      const tv: TimeValue = { value: 14, label: '14 CE' }
      expect(formatTimeValue(tv)).toBe('14 CE')
    })

    it('BCE: derives label from negative value when label absent', () => {
      expect(formatTimeValue({ value: -63 })).toBe('63 BC')
    })

    it('CE: derives label from positive value when label absent', () => {
      expect(formatTimeValue({ value: 14 })).toBe('14 CE')
    })

    it('missing date (undefined) -> null', () => {
      expect(formatTimeValue(undefined)).toBeNull()
    })

    it('missing date (empty object) -> null', () => {
      expect(formatTimeValue({})).toBeNull()
    })

    it('empty label falls back to value derivation', () => {
      expect(formatTimeValue({ value: -27, label: '' })).toBe('27 BC')
    })

    it('non-numeric / NaN value with no label -> null', () => {
      expect(formatTimeValue({ value: NaN })).toBeNull()
      expect(formatTimeValue({ value: 'x' as unknown as number })).toBeNull()
    })
  })

  describe('formatDateRange', () => {
    it('both present -> "START - END"', () => {
      expect(
        formatDateRange({ value: -63, label: '63 BC' }, { value: 14, label: '14 CE' }),
      ).toBe('63 BC - 14 CE')
    })

    it('only start present -> start', () => {
      expect(formatDateRange({ value: -63, label: '63 BC' }, null)).toBe('63 BC')
    })

    it('only end present -> end', () => {
      expect(formatDateRange(null, { value: 14, label: '14 CE' })).toBe('14 CE')
    })

    it('neither present -> null', () => {
      expect(formatDateRange(null, null)).toBeNull()
    })
  })

  describe('buildEntityTimeMap', () => {
    it('maps entity name -> formatted range', () => {
      const map = buildEntityTimeMap([
        {
          name: 'Augustus',
          start_date: { value: -63, label: '63 BC' },
          end_date: { value: 14, label: '14 CE' },
        },
      ])
      expect(map).toEqual({ Augustus: '63 BC - 14 CE' })
    })

    it('skips entities without a name', () => {
      const map = buildEntityTimeMap([
        { start_date: { value: -63 }, end_date: { value: 14 } },
        { name: 'Rome', start_date: { value: -753 }, end_date: { value: 476 } },
      ])
      expect(map).toEqual({ Rome: '753 BC - 476 CE' })
    })

    it('skips entities with no usable date', () => {
      const map = buildEntityTimeMap([
        { name: 'Nameless Polity' },
        { name: 'Dated', start_date: { value: -500 } },
      ])
      expect(map).toEqual({ Dated: '500 BC' })
    })

    it('returns empty map for empty input', () => {
      expect(buildEntityTimeMap([])).toEqual({})
    })
  })
})
