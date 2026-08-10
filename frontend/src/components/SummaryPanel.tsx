import { EvidenceBlock } from './primitives/EvidenceBlock'

type SummaryPanelProps = {
  title: string
  summary: string
}

/**
 * SummaryPanel — migrated to EvidenceBlock (M90.3 Stage D-1).
 *
 * Previously rendered raw <h2> + <p> tags. Now uses the EvidenceBlock
 * Explorer Primitive with type="curator" to signal curated narrative
 * (not raw facts or AI-generated text).
 *
 * The component signature is unchanged — all callers in App.tsx and
 * EntityPage remain compatible. This is the migration pattern for
 * all 26 Panels: keep the public API, replace internals with
 * Explorer Primitives.
 */
function SummaryPanel({ title, summary }: SummaryPanelProps) {
  return (
    <EvidenceBlock type="curator" title={title}>
      {summary}
    </EvidenceBlock>
  )
}

export default SummaryPanel
