// P1-② (Engineering Health, 2026-08-14, PO-approved): view-derived maps +
// node-open helpers extracted from App.tsx into a pure factory. Pure
// relocation — no logic change, no call-site change. App calls
//   const { exploreNameById, ... } = buildExplorationDerived({ ... })
// with the same inputs it previously closed over, so every derived value is
// byte-for-byte identical and the render tree is unchanged.

import type { ExplorationResult } from '../App'
import type { EntityDetail, EntityRelationship } from '../components/EntityPage'
import type { NavNode } from '../components/navigation'
import { buildBreadcrumb } from '../components/navigation'
import { buildEntityTimeMap } from '../data/temporalUtils'

export interface ExplorationDerivedInput {
  result: ExplorationResult | null
  entityData: EntityDetail | null
  recent: NavNode[]
  history: NavNode[]
  cursor: number
  t: (key: string) => string
  locale: string
  openEntity: (id: string, name?: string, tab?: 'info' | 'research' | 'ai') => void
}

export interface ExplorationDerived {
  exploreNameById: Record<string, string>
  exploreNameToId: Record<string, string>
  entityNameById: Record<string, string>
  entityGlobalIdById: Record<string, string>
  exploreTopic: string
  exploreEntityGlobalById: Record<string, string>
  exploreNameByGlobalId: Record<string, string>
  exploreThemesRelationships: EntityRelationship[]
  exploreEntityTimeByName: Record<string, string>
  aiContextIds: string[]
  openNode: (gid: string) => void
  openNodeNamed: (gid: string) => void
  crumbs: ReturnType<typeof buildBreadcrumb>
  seenGlobalIds: Set<string>
}

// Name lookups for the active exploration, so relationships / related
// entities / timeline events can resolve and navigate to the right entity.
export function buildExplorationDerived(input: ExplorationDerivedInput): ExplorationDerived {
  const { result, entityData, recent, history, cursor, t, locale, openEntity } = input

  const exploreNameById: Record<string, string> = result
    ? Object.fromEntries(result.entities.map((e) => [e.id, e.name]))
    : {}
  const exploreNameToId: Record<string, string> = result
    ? Object.fromEntries(result.entities.map((e) => [e.name, e.id]))
    : {}
  const entityNameById: Record<string, string> = entityData
    ? Object.fromEntries(entityData.relationships.map((r) => [r.other.id, r.other.name]))
    : {}

  // M3.5-004 cross-topic clickable (entity page): map each related entity's
  // local id to its cross-topic global_id ("topic:localid") when the backend
  // supplied one, so clicking a chip can open an entity from another topic.
  const entityGlobalIdById: Record<string, string> = entityData
    ? Object.fromEntries(
        entityData.relationships
          .filter((r) => r.other?.global_id || r.other?.topic)
          .map((r) => [
            r.other.id,
            r.other.global_id ?? `${r.other.topic}:${r.other.id}`,
          ]),
      )
    : {}

  // M3.5-004 cross-topic clickable (explore page): the explore result's
  // relationships are RAW {source, target, type} with no `other`, so the owning
  // topic comes from the main entity's global_id (falling back to result.topic).
  const exploreTopic: string =
    result?.exploration?.main_entity?.global_id?.split(':')[0] || result?.topic || ''

  // M3.5-004 (explore page): the raw `result.relationships` have no `other`, so
  // we project the main entity's direct neighbors (exploration.related_entities)
  // into EntityRelationship[] for the Themes panel, resolving names + global_ids
  // from the entity list. Each node already gets a full global_id so the new
  // panels pass it through WITHOUT re-prefixing (the legacy onEntityClick below
  // still prefixes local ids into `${exploreTopic}:${id}`).
  const exploreEntityGlobalById: Record<string, string> = result
    ? Object.fromEntries(
        result.entities.map((e) => [e.id, e.global_id ?? `${exploreTopic}:${e.id}`]),
      )
    : {}

  // M19: derive a global_id -> display name map so the RelationshipInsightPanel
  // can label target entities that are NOT in the candidate set (e.g. edges
  // pointing at entities outside the current selection). Pure frontend; built
  // only from already-fetched exploration metadata. No new API field.
  const exploreNameByGlobalId: Record<string, string> = result
    ? Object.fromEntries(
        Object.entries(exploreEntityGlobalById)
          .filter(([, gid]) => Boolean(gid))
          .map(([localId, gid]) => [gid, exploreNameById[localId] ?? gid]),
      )
    : {}

  const exploreThemesRelationships: EntityRelationship[] = result
    ? result.exploration.related_entities.map((re) => ({
        type: re.relationship,
        source: result.exploration.main_entity.id,
        target: re.id,
        direction: 'outgoing',
        other: {
          id: re.id,
          name: exploreNameById[re.id] ?? re.id,
          type: re.type,
          global_id: exploreEntityGlobalById[re.id],
          topic: exploreEntityGlobalById[re.id]
            ? exploreEntityGlobalById[re.id].split(':')[0]
            : undefined,
        },
      }))
    : []

  // M6-P1 (Temporal Context Injection, explore path): build a name -> date-range
  // map from the current topic's entities. The backend returns the full entity
  // objects at runtime (including start_date/end_date), which the relationships
  // builder consumes via the target-name key. Pure frontend; no new API field.
  const exploreEntityTimeByName: Record<string, string> = result
    ? buildEntityTimeMap(result.entities, locale)
    : {}

  // M12-1: grounded AI exploration context — built strictly from the existing
  // exploration graph (main entity + related entities' resolved global ids),
  // reusing the same exploreEntityGlobalById map as the rest of the topic view.
  // No new ids are invented; no business logic is added (Freeze Pack).
  const aiContextIds: string[] = result
    ? [
        result.exploration.main_entity.global_id,
        ...result.exploration.related_entities.map((re) => exploreEntityGlobalById[re.id]),
      ].filter((gid): gid is string => Boolean(gid))
    : []

  // M34-A1: single source of truth for the navigation-following callbacks that
  // were previously duplicated inline across the topic and entity views (TD-1).
  //   openNode      — cross-topic / entity-view nodes whose display name is
  //                   derived from the global id itself.
  //   openNodeNamed — topic-view panels that resolve a display name from the
  //                   current topic's entity map (exploreNameById).
  // Bodies are byte-for-byte identical to the inline arrows they replace, so
  // navigation behavior is unchanged.
  const openNode = (gid: string) =>
    openEntity(gid, gid.includes(':') ? gid.split(':').slice(1).join(':') : gid)
  const openNodeNamed = (gid: string) =>
    openEntity(gid, exploreNameById[gid.split(':').pop() ?? gid] ?? gid)

  const crumbs = buildBreadcrumb(history, cursor, t('common.home'))

  // M5-B-1: global ids the user has already visited, derived from the recent
  // explorations list. Entity nodes carry a global_id in `.id` (that is what
  // openEntity is always called with), so this set lets the "Continue
  // Exploring" panel weakly mark already-seen next steps — WITHOUT reordering.
  const seenGlobalIds = new Set(
    recent.filter((n) => n.type === 'entity').map((n) => (n as { id: string }).id),
  )

  return {
    exploreNameById,
    exploreNameToId,
    entityNameById,
    entityGlobalIdById,
    exploreTopic,
    exploreEntityGlobalById,
    exploreNameByGlobalId,
    exploreThemesRelationships,
    exploreEntityTimeByName,
    aiContextIds,
    openNode,
    openNodeNamed,
    crumbs,
    seenGlobalIds,
  }
}
