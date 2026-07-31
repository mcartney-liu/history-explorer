import {
  getEntityDisplayName,
  type ExplorationPackage,
  type Locale,
} from '../../data/explorationPackages'

interface RecommendedNextProps {
  pkg: ExplorationPackage
  locale?: Locale
  onOpenPackage?: (slug: string) => void
  onEntityClick?: (gid: string) => void
}

// Recommended Next Exploration. Pointers are STABLE IDs (per PO adjustment B):
// kind=entity resolves to a global_id, kind=package to a package slug. Display
// text is a hint only; the runtime acts on `ref`, never on the label.
export default function RecommendedNext({
  pkg,
  locale = 'zh',
  onOpenPackage,
  onEntityClick,
}: RecommendedNextProps) {
  if (pkg.recommended_next_exploration.length === 0) return null

  return (
    <div className="recommended-next" data-testid="recommended-next">
      <ul className="recommended-next-list">
        {pkg.recommended_next_exploration.map((rec, i) => {
          const label =
            rec.label?.[locale] ??
            (rec.kind === 'entity' ? getEntityDisplayName(rec.ref, locale) : rec.ref)

          if (rec.kind === 'package') {
            return (
              <li key={i}>
                <button
                  type="button"
                  className="recommended-next-btn"
                  onClick={() => onOpenPackage?.(rec.ref)}
                >
                  <span className="recommended-next-kind">探索包</span>
                  {label} →
                </button>
              </li>
            )
          }

          return (
            <li key={i}>
              <button
                type="button"
                className="recommended-next-btn"
                onClick={() => onEntityClick?.(rec.ref)}
              >
                <span className="recommended-next-kind">实体</span>
                {label} →
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
