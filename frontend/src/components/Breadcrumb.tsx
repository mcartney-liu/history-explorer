// Breadcrumb navigation (M2-003, requirement 1).
// Home > Topic > Entity > Event ... — clicking any crumb returns to that
// level. Index 0 is the synthetic "Home" root; the rest map to history
// entries. Pure presentational component; App owns the click logic.

type Crumb = { key: string; label: string; index: number }

type BreadcrumbProps = {
  crumbs: Crumb[]
  onCrumbClick: (index: number) => void
}

function Breadcrumb({ crumbs, onCrumbClick }: BreadcrumbProps) {
  if (crumbs.length <= 1) return null
  return (
    <nav className="he-breadcrumb" aria-label="Breadcrumb">
      <ol className="he-breadcrumb-list">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <li key={c.key} className="he-breadcrumb-item">
              {isLast ? (
                <span className="he-breadcrumb-current" aria-current="page">
                  {c.label}
                </span>
              ) : (
                <button
                  type="button"
                  className="he-breadcrumb-link"
                  onClick={() => onCrumbClick(c.index)}
                >
                  {c.label}
                </button>
              )}
              {!isLast && (
                <span className="he-breadcrumb-sep" aria-hidden="true">
                  {'›'}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumb
