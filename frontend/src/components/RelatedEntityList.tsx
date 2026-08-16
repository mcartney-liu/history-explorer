import EmptyState from './EmptyState'
import { useLocale } from '../data/locale'
import { usePreferences, getDisplayName } from '../lib/preferences'
import { getEntityLabel, getEntityIcon, getRelationshipLabel } from '../data/entity/entityLabels'
import { Icon } from './ui/Icon'
import type { IconName } from './ui/Icon'

export type RelatedEntity = {
  id: string
  type: string
  relationship: string
}

type RelatedEntityListProps = {
  relatedEntities: RelatedEntity[]
  // Optional id -> display name lookup, sourced from the response `entities`.
  // Falls back to the raw id when a name is unavailable.
  nameById?: Record<string, string>
  // Name of the current main entity, used to express the connection explicitly
  // (answers "what relationships connect them").
  mainEntityName?: string
  // Click handler so a related entity can be explored further, closing the
  // Explore -> Connect -> Continue loop (M-H1 / M1-005 A1).
  onEntityClick?: (id: string) => void
}

// RESPONSIBILITY (M4-005 C2): quick browsing of related entities with simple
// click-to-explore navigation. Renders a flat, lightweight list — it does NOT
// attempt relationship explanation/structure. For the structured relationship
// tree, see RelationshipView. The two components are intentionally distinct
// presentations of the same data, not duplicated logic.
function RelatedEntityList({
  relatedEntities,
  nameById,
  mainEntityName,
  onEntityClick,
}: RelatedEntityListProps) {
  const { t, locale } = useLocale()
  const [prefs] = usePreferences()
  return (
    <div className="result-section">
      <h3>{t('entity.relatedExploration')}</h3>
      {relatedEntities.length > 0 ? (
        <ul className="related-list">
          {relatedEntities.map((item) => {
            const displayName = getDisplayName(nameById?.[item.id] ?? item.id, locale, prefs.properNameMode)
            return (
            <li
              key={`${item.id}::${item.relationship}`}
              className="is-clickable"
              role="button"
              tabIndex={0}
              aria-label={t('entity.exploreAria', { name: displayName })}
              onClick={() => onEntityClick?.(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onEntityClick?.(item.id)
                }
              }}
            >
              <span className="re-name"><Icon name={getEntityIcon(item.type) as IconName} size={16} className="re-icon" />{displayName}</span>
              <span className="re-type">{getEntityLabel(item.type, locale)}</span>
              <span className="re-rel">
                {mainEntityName
                  ? t('relationship.connectedVia', { rel: getRelationshipLabel(item.relationship, locale) })
                  : getRelationshipLabel(item.relationship, locale)}
              </span>
            </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState message={t('entity.noRelated')} />
      )}
    </div>
  )
}

export default RelatedEntityList
