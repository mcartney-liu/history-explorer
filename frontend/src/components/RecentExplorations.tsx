// Recent Explorations (M2-003, requirement 3).
// Shown on the landing (Home) screen. Lists the last visited topics and
// entities (persisted to localStorage, max 10) as clickable chips so a user
// can jump straight back into an exploration. Pure presentational component.

import { NavNode } from './navigation'
import { useLocale } from '../data/locale'
import { usePreferences, getDisplayName } from '../lib/preferences'
import { getCausalObjectName } from '../data/causalObjectNames'
import { getEntityIcon, entityTypeFromGlobalId } from '../data/entity/entityLabels'
import { Icon } from '../components/ui/Icon'
import type { IconName } from '../components/ui/Icon'

type RecentExplorationsProps = {
  items: NavNode[]
  onSelect: (node: NavNode) => void
  onClear?: () => void
}

function RecentExplorations({ items, onSelect, onClear }: RecentExplorationsProps) {
  const { t, locale } = useLocale()
  const [prefs] = usePreferences()
  if (items.length === 0) return null
  return (
    <section className="he-recent result-section" aria-label={t('common.recentAria')}>
      <div className="search-results-head">
        <h3>{t('common.recentHeading')}</h3>
        {onClear && (
          <button className="link-button" type="button" onClick={onClear}>
            {t('common.clear')}
          </button>
        )}
      </div>
      <ul className="he-recent-list">
        {items.map((node) => (
          <li key={`${node.type}:${node.type === 'topic' ? node.topic : node.type === 'causal_object' ? node.objectId : node.id}`}>
            <button
              type="button"
              className="he-recent-chip"
              onClick={() => onSelect(node)}
            >
              <span className="he-recent-kind">
                {node.type === 'topic' ? t('common.kindTopic') : node.type === 'causal_object' ? '理解' : t('common.kindEntity')}
              </span>
              <span className="he-recent-label">
                {node.type === 'entity' && (
                  <Icon name={getEntityIcon(entityTypeFromGlobalId(node.id)) as IconName} size={16} className="he-recent-label-icon" />
                )}
                {getDisplayName(
                  node.type === 'topic' ? node.title : node.type === 'causal_object' ? getCausalObjectName(node.objectId) : node.name,
                  locale,
                  prefs.properNameMode,
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default RecentExplorations
