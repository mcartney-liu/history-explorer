// M35 — StorySection (presentational).
//
// Renders the curated "story" copy for a node. Copy comes ONLY from
// data/narrative.ts (hand-authored, grounded in real data — NOT AI generated).
// The component is pure: given a narrativeKey it looks up the block and renders.
// Unknown / uncovered keys render nothing (null), so the component is safe to
// mount on any entity without changing layout.

import { getNarrative } from '../../data/narrative'

type StorySectionProps = {
  // Global id (entity) or topic slug — must match a key in NARRATIVE.
  narrativeKey: string
}

export function StorySection({ narrativeKey }: StorySectionProps) {
  const block = getNarrative(narrativeKey)
  if (!block || !block.story) return null

  return (
    <section className="story-section" data-narrative-key={narrativeKey} aria-label="Story">
      <h3 className="story-section-heading">故事 · Story</h3>
      <p className="story-section-body">{block.story}</p>
    </section>
  )
}

export default StorySection
