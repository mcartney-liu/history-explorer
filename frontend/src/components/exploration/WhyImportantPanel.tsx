// M35 — WhyImportantPanel (presentational).
// M90.3 Stage D-1 — migrated to EvidenceBlock Explorer Primitive.
//
// Renders the curated "why it matters" copy for a node. Copy comes ONLY from
// data/narrative.ts (hand-authored, grounded in real data — NOT AI generated).
// Pure component: looks up the block by narrativeKey and renders. Unknown /
// uncovered keys render nothing (null).

import { getNarrative } from '../../data/narrative'
import { EvidenceBlock } from '../primitives/EvidenceBlock'

type WhyImportantPanelProps = {
  // Global id (entity) or topic slug — must match a key in NARRATIVE.
  narrativeKey: string
}

export function WhyImportantPanel({ narrativeKey }: WhyImportantPanelProps) {
  const block = getNarrative(narrativeKey)
  if (!block || !block.whyImportant) return null

  return (
    <EvidenceBlock type="curator" title="为什么重要 · Why It Matters">
      {block.whyImportant}
    </EvidenceBlock>
  )
}

export default WhyImportantPanel
