import { describe, it, expect } from 'vitest'
import { nextSelectionIndex } from '../components/searchNav'

// M2-002.5 keyboard navigation helper — pure logic, runs in a Node env so no
// jsdom / testing-library is needed (no new dependency).
describe('nextSelectionIndex (search keyboard nav)', () => {
  it('returns -1 for an empty list', () => {
    expect(nextSelectionIndex(-1, 1, 0)).toBe(-1)
    expect(nextSelectionIndex(0, 1, 0)).toBe(-1)
  })

  it('starts at the top on the first downward move from no selection', () => {
    expect(nextSelectionIndex(-1, 1, 5)).toBe(0)
  })

  it('starts at the bottom on the first upward move from no selection', () => {
    expect(nextSelectionIndex(-1, -1, 5)).toBe(4)
  })

  it('moves down and up within bounds', () => {
    expect(nextSelectionIndex(0, 1, 5)).toBe(1)
    expect(nextSelectionIndex(1, -1, 5)).toBe(0)
  })

  it('clamps at the top and bottom (no wrap)', () => {
    expect(nextSelectionIndex(0, -1, 5)).toBe(0)
    expect(nextSelectionIndex(4, 1, 5)).toBe(4)
  })

  it('clamps when jumping past the end', () => {
    expect(nextSelectionIndex(3, 5, 5)).toBe(4)
    expect(nextSelectionIndex(2, -5, 5)).toBe(0)
  })
})
