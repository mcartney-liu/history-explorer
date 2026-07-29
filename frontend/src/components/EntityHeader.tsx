// M34-A1 (Exploration UX Hardening): the entity-page header block extracted out
// of EntityPage.tsx. Purely presentational — it renders exactly the markup
// EntityPage inlined before (`result-section entity-page-head` → an "Entity"
// label + the entity's type badge), so behavior and the existing DOM contract
// are unchanged. Extracting it shrinks the entity view and gives the header its
// own unit test.
import { useLocale } from '../data/locale'
import { getTermLabel } from '../locales/terminology'
import { getEntityLabel } from '../data/entity/entityLabels'

type EntityHeaderProps = {
  type: string
}

function EntityHeader({ type }: EntityHeaderProps) {
  const { locale } = useLocale()
  return (
    <div className="result-section entity-page-head">
      <h3>{getTermLabel('Entity', locale)}</h3>
      <span className="re-type">{getEntityLabel(type, locale)}</span>
    </div>
  )
}

export default EntityHeader
