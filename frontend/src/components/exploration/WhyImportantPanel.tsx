// M35 — WhyImportantPanel (presentational).
//
// Renders the curated "why it matters" copy for a node. Copy comes ONLY from
// data/narrative.ts (hand-authored, grounded in real data — NOT AI generated).
// Pure component: looks up the block by narrativeKey and renders. Unknown /
// uncovered keys render nothing (null).

import { getNarrative } from '../../data/narrative'
import CollapsibleText from '../ui/CollapsibleText'

type WhyImportantPanelProps = {
  // Global id (entity) or topic slug — must match a key in NARRATIVE.
  narrativeKey: string
}

export function WhyImportantPanel({ narrativeKey }: WhyImportantPanelProps) {
  const block = getNarrative(narrativeKey)
  if (!block || !block.whyImportant) return null

  return (
    <section className="why-important-panel" data-narrative-key={narrativeKey} aria-label="Why this matters">
      <h3 className="why-important-heading">为什么重要 · Why It Matters</h3>
      <CollapsibleText text={block.whyImportant} lines={4} className="why-important-body" />
    </section>
  )
}

export default WhyImportantPanel
