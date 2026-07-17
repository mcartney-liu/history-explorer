// M2-002.5: pure keyboard-navigation helper for search results.
//
// Kept dependency-free and side-effect-free so it can be unit-tested in a
// plain Node environment (no jsdom / testing-library, per the no-new-dependency
// constraint). The App wires real key events to these functions; the DOM
// interaction itself is covered by the pure logic below plus a TypeScript build.

// Returns the next selected index after moving by `delta` (-1 = up, +1 = down)
// within a list of `count` items.
//
// - An empty list always yields -1 (nothing selectable).
// - A `current` of <0 (nothing selected yet) starts at the top on a downward
//   move and at the bottom on an upward move.
// - Selection is clamped to [0, count-1]; it never wraps or escapes bounds.
export function nextSelectionIndex(current: number, delta: number, count: number): number {
  if (count <= 0) return -1
  let next = current
  if (next < 0) {
    next = delta > 0 ? 0 : count - 1
  } else {
    next = next + delta
  }
  if (next < 0) next = 0
  if (next > count - 1) next = count - 1
  return next
}
