import { EvidenceBlock } from './primitives/EvidenceBlock'
import { getEntityIcon } from '../data/entity/entityLabels'
import { Icon } from '../components/ui/Icon'
import type { IconName } from '../components/ui/Icon'

type SummaryPanelProps = {
  title: string
  summary: string
  /** Optional entity type — when present, a type icon is shown before the title. */
  entityType?: string
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
function SummaryPanel({ title, summary, entityType }: SummaryPanelProps) {
  return (
    <>
      {entityType && (
        <Icon name={getEntityIcon(entityType) as IconName} size={16} className="summary-panel-title-icon" />
      )}
      <EvidenceBlock type="curator" title={title}>
        {summary}
      </EvidenceBlock>
    </>
  )
}

export default SummaryPanel
