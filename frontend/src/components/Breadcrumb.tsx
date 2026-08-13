// Breadcrumb navigation (M2-003, requirement 1).
// Home > Topic > Entity > Event ... — clicking any crumb returns to that
// level. Index 0 is the synthetic "Home" root; the rest map to history
// entries. Pure presentational component; App owns the click logic.
import { useLocale } from '../data/locale'

type Crumb = { key: string; label: string; index: number }

type BreadcrumbProps = {
  crumbs: Crumb[]
  onCrumbClick: (index: number) => void
  /** Retained for navSlot wiring compatibility; back/forward controls were
   *  removed from this view per PO request (covered by browser / trail). */
  onBack?: () => void
  canBack?: boolean
  onForward?: () => void
  canForward?: boolean
}

function Breadcrumb({ crumbs, onCrumbClick }: BreadcrumbProps) {
  const { t } = useLocale()
  const showTrail = crumbs.length > 1
  if (!showTrail) return null
  return (
    <>
      <div className="he-breadcrumb-head">{t('discover.currentPosition')}</div>
      <nav className="he-breadcrumb" aria-label={t('common.breadcrumbAria')}>
        <ol className="he-breadcrumb-list">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1
            const label = c.label
            return (
              <li key={c.key} className="he-breadcrumb-item">
                {isLast ? (
                  <span className="he-breadcrumb-current" aria-current="page">
                    {label}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="he-breadcrumb-link"
                    onClick={() => onCrumbClick(c.index)}
                  >
                    {label}
                  </button>
                )}
                {!isLast && (
                  <span className="he-breadcrumb-arrow" aria-hidden="true">
                    {'→'}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}

export default Breadcrumb
