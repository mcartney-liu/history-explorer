import { useState } from 'react'
import { MainEntity } from './MainEntityCard'
import { RelatedEntity } from './RelatedEntityList'
import EmptyState from './EmptyState'
import AIExplanationPanel from './AIExplanationPanel'
import RelationshipEvidence from './RelationshipEvidence'
import { relationshipContext } from '../data/aiContext'
import { useLocale } from '../data/locale'
import { usePreferences, getDisplayName } from '../lib/preferences'
import { getEntityLabel } from '../data/entity/entityLabels'

type RelationshipViewProps = {
  mainEntity: MainEntity
  relatedEntities: RelatedEntity[]
  // Optional id -> display name lookup, sourced from the response `entities`.
  // Falls back to the raw id when a name is unavailable.
  nameById?: Record<string, string>
  // M2-003: clicking a relationship branch navigates straight to the other
  // entity, so every relationship is a continuation point in the loop.
  onEntityClick?: (id: string) => void
  // M10-2 (cross-panel focus): RelationshipView is the sole PRODUCER of focus.
  // Focus identity is a global_id ("topic:localid"), so branches resolve their
  // own global id from this local->global map (the same map App already builds
  // for navigation). Focus is a VIEW STATE lightweight highlight — it never
  // navigates and never touches history/persistence.
  globalIdById?: Record<string, string>
  // The currently focused entity's global_id; the matching branch is-focused.
  focusedId?: string
  // Emits a related entity's global_id to focus it (App stores it as VIEW
  // STATE). Distinct from onEntityClick (navigation) — focusing does NOT move.
  onEntityFocus?: (globalId: string) => void
  // M12-2: optional gid -> openEntity handler so the relationship explanation
  // panel's citations can navigate (reuses App's onNodeClick).
  onNodeClick?: (globalId: string) => void
}

// Lightweight relationship visualization prototype (S5-003).
// Pure CSS tree: current main entity at the root, connected entities branching
// below it. No graph engine, SVG, D3, canvas, or animation library.
// RESPONSIBILITY (M4-005 C2): relationship explanation via a lightweight CSS
// tree rooted at the main entity, showing how connected entities branch off
// (relationship type per branch). It is the structured/explanation view — NOT
// a duplicate of RelatedEntityList. For flat quick-browse, see
// RelatedEntityList. No graph engine / SVG / D3; pure CSS, per S5-003.
function RelationshipView({
  mainEntity,
  relatedEntities,
  nameById,
  onEntityClick,
  globalIdById,
  focusedId,
  onEntityFocus,
  onNodeClick,
}: RelationshipViewProps) {
  const [evidenceFor, setEvidenceFor] = useState<string | null>(null)
  const { t, locale } = useLocale()
  const [prefs] = usePreferences()

  if (!mainEntity?.id) {
    return null
  }

  return (
    <div className="result-section">
      <h3>{t('relationship.network')}</h3>
      <div className="rel-network">
        <div className="rel-root">
          <span className="rel-root-name">{getDisplayName(mainEntity.name, locale, prefs.properNameMode)}</span>
          <span className="rel-root-type">{getEntityLabel(mainEntity.type, locale)}</span>
        </div>
        {relatedEntities.length > 0 ? (
          <ul className="rel-branches">
            {relatedEntities.map((item) => {
              const displayName = getDisplayName(nameById?.[item.id] ?? item.id, locale, prefs.properNameMode)
              const clickable = typeof onEntityClick === 'function'
              // M10-2: resolve this branch's global_id so it can (a) act as a
              // focus producer and (b) mirror the focused state. Falls back to
              // the raw local id when no mapping is supplied (still safe — it
              // simply won't match an external global_id focus).
              const branchGlobalId = globalIdById?.[item.id] ?? item.id
              const isFocused = typeof focusedId === 'string' && focusedId === branchGlobalId
              const focusable = typeof onEntityFocus === 'function'
              const className =
                `rel-branch${clickable ? ' is-clickable' : ''}${isFocused ? ' is-focused' : ''}`
              const content = (
                <>
                  <span className="rel-target-name">{displayName}</span>
                  <span className="rel-target-type">{getEntityLabel(item.type, locale)}</span>
                  <span className="rel-edge">{item.relationship}</span>
                  {focusable && (
                    <button
                      type="button"
                      className="rel-focus-btn"
                      aria-label={t('relationship.focusAria', { name: displayName })}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEntityFocus!(branchGlobalId)
                      }}
                    >
                      {t('relationship.focus')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="explore-button rel-evidence-btn"
                    aria-label={t('relationship.viewEvidenceAria', { name: displayName })}
                    onClick={(e) => {
                      e.stopPropagation()
                      setEvidenceFor((prev) => (prev === item.id ? null : item.id))
                    }}
                  >
                    {t('relationship.viewEvidence')}
                  </button>
                </>
              )
              return clickable ? (
                <li
                  key={item.id}
                  className={className}
                  role="button"
                  tabIndex={0}
                  aria-label={t('entity.exploreAria', { name: displayName })}
                  onClick={() => onEntityClick!(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onEntityClick!(item.id)
                    }
                  }}
                >
                  {content}
                  {evidenceFor === item.id && (
                    <RelationshipEvidence entityId={item.id} entityName={displayName} />
                  )}
                </li>
              ) : (
                <li key={item.id} className={className}>
                  {content}
                  {evidenceFor === item.id && (
                    <RelationshipEvidence entityId={item.id} entityName={displayName} />
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState message={t('relationship.noConnected')} />
        )}
      </div>

      {mainEntity.global_id && focusedId ? (
        <AIExplanationPanel
          contextGlobalIds={relationshipContext(mainEntity.global_id, focusedId)}
          onCitationClick={onNodeClick}
        />
      ) : null}
    </div>
  )
}

export default RelationshipView
