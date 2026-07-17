// M3.5-004: derive cross-civilization "themes" entirely client-side (no
// backend change). We group the entity's relationships by relationship type
// into human themes (e.g. `conquered` -> "Imperial Conquest"), and
// additionally surface threads by the frozen ENTITY_TYPES (Civilization /
// Technology / Religion / Idea) where useful. Every member chip is
// cross-topic clickable: it carries a full global_id (from other.global_id /
// other.topic), passed straight to onNodeClick WITHOUT re-prefixing. Strictly
// additive: renders nothing when there are no relationships, so legacy UI is
// untouched.
import { EntityRelationship } from './EntityPage'
import { ConnectionExplained } from './ConnectionsExplainedPanel'

type ThemesPanelProps = {
  relationships?: EntityRelationship[]
  // Accepted for forward-compat with the backend's explainable block; the
  // relationship-type grouping is the primary driver of themes.
  connections_explained?: ConnectionExplained[]
  onNodeClick?: (globalId: string) => void
}

// Relationship type -> human, learner-facing theme name.
const RELATIONSHIP_THEME: Record<string, string> = {
  conquered: 'Imperial Conquest',
  inherited: 'Cultural Inheritance',
  spread: 'Diffusion & Spread',
  traded_with: 'Trade & Exchange',
  influenced: 'Influence',
  invented: 'Innovation',
  discovered: 'Innovation',
  practiced: 'Practice & Language',
  spoke: 'Practice & Language',
}

// Frozen ENTITY_TYPES we surface as their own threads (M3.5-000 §2).
const ENTITY_TYPE_THREADS = ['Civilization', 'Technology', 'Religion', 'Idea']

function titleCase(rel: string): string {
  return rel
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// Resolve a full global_id from a relationship `other` without re-prefixing:
// prefer other.global_id, then topic:id, then fall back to the raw local id.
function globalIdFor(other: {
  id: string
  name: string
  type: string
  global_id?: string
  topic?: string
}): string {
  if (other.global_id) return other.global_id
  if (other.topic) return `${other.topic}:${other.id}`
  return other.id
}

function ThemesPanel({ relationships, onNodeClick }: ThemesPanelProps) {
  if (!relationships || relationships.length === 0) return null

  const relThemes: Record<string, EntityRelationship[]> = {}
  const typeThreads: Record<string, EntityRelationship[]> = {}

  for (const r of relationships) {
    const other = r.other
    if (!other) continue

    const themeName = RELATIONSHIP_THEME[r.type] ?? titleCase(r.type)
    if (!relThemes[themeName]) relThemes[themeName] = []
    relThemes[themeName].push(r)

    if (other.type && ENTITY_TYPE_THREADS.includes(other.type)) {
      if (!typeThreads[other.type]) typeThreads[other.type] = []
      typeThreads[other.type].push(r)
    }
  }

  const relGroups = Object.keys(relThemes).map((name) => ({
    name,
    members: relThemes[name],
  }))
  const typeGroups = Object.keys(typeThreads).map((name) => ({
    name,
    members: typeThreads[name],
  }))

  if (relGroups.length === 0 && typeGroups.length === 0) return null

  return (
    <div className="result-section">
      <h3>Themes</h3>
      <div className="th-list">
        {relGroups.map((group) => (
          <ThemeGroup
            key={group.name}
            name={group.name}
            members={group.members}
            onNodeClick={onNodeClick}
          />
        ))}
        {typeGroups.length > 0 && (
          <div className="th-subhead">Threads by Type</div>
        )}
        {typeGroups.map((group) => (
          <ThemeGroup
            key={group.name}
            name={group.name}
            members={group.members}
            onNodeClick={onNodeClick}
          />
        ))}
      </div>
    </div>
  )
}

type ThemeGroupProps = {
  name: string
  members: EntityRelationship[]
  onNodeClick?: (globalId: string) => void
}

function ThemeGroup({ name, members, onNodeClick }: ThemeGroupProps) {
  return (
    <div className="th-group">
      <h4 className="th-head">
        <span>{name}</span>
        <span className="th-count">{members.length}</span>
      </h4>
      <div className="th-chips">
        {members.map((r, i) => {
          const other = r.other!
          const gid = globalIdFor(other)
          return (
            <button
              type="button"
              key={`${gid}-${i}`}
              className="th-chip is-clickable"
              aria-label={`Explore ${other.name}`}
              onClick={() => onNodeClick?.(gid)}
            >
              <span className="th-chip-name">{other.name}</span>
              <span className="th-chip-type">{other.type}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ThemesPanel
