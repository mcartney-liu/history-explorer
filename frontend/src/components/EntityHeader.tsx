// M34-A1 (Exploration UX Hardening): the entity-page header block extracted out
// of EntityPage.tsx. Purely presentational — it renders exactly the markup
// EntityPage inlined before (`result-section entity-page-head` → an "Entity"
// label + the entity's type badge), so behavior and the existing DOM contract
// are unchanged. Extracting it shrinks the entity view and gives the header its
// own unit test.
type EntityHeaderProps = {
  type: string
}

function EntityHeader({ type }: EntityHeaderProps) {
  return (
    <div className="result-section entity-page-head">
      <h3>Entity</h3>
      <span className="re-type">{type}</span>
    </div>
  )
}

export default EntityHeader
