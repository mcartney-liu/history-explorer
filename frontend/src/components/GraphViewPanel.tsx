import {
  computeGraphLayout,
  MAX_NODES,
  MAX_EDGES,
  type GraphNode,
  type GraphEdge,
} from '../lib/graphLayout'

// M34-A2 (Knowledge Graph Visualization MVP) — a self-drawn SVG renderer.
//
// NO external graph/visualization library is used (freeze invariant: deps stay
// react + react-dom). The graph is plain SVG: <line> edges + <circle>/<text>
// nodes, positioned by the pure computeGraphLayout(). It consumes the SAME data
// the panels already receive from GET /explore and GET /entity — the main entity
// plus its DIRECT neighbours — so there is no new API endpoint and no backend
// change. MVP caps (≤30 nodes / ≤60 edges) are enforced inside the layout.

type RelatedForGraph = {
  id: string
  type: string
  relationship: string
  name?: string
}

type GraphViewPanelProps = {
  mainEntity: { id: string; name: string; type: string }
  relatedEntities: RelatedForGraph[]
  // Resolves a display name for a neighbour id (the explore/entity views build
  // this from the entity list / relationship `other` info).
  nameById?: Record<string, string>
  // Opens a neighbour. Receives the neighbour's LOCAL id, matching how
  // RelationshipView's onEntityClick is wired by App/EntityPage.
  onEntityClick?: (id: string) => void
  title?: string
}

// The 8 frozen entity types (backend/app/validation.py ENTITY_TYPES) → a stable,
// readable palette on the app's light background (#f7f5f0). Unknown types fall
// back to a neutral slate. No new types are introduced here.
const TYPE_COLORS: Record<string, string> = {
  Event: '#dc2626',
  Person: '#2563eb',
  Civilization: '#7c3aed',
  Location: '#059669',
  'Time Period': '#d97706',
  Technology: '#0891b2',
  Religion: '#db2777',
  Idea: '#4b5563',
}
const FALLBACK_COLOR = '#6b7280'

function colorFor(type: string): string {
  return TYPE_COLORS[type] ?? FALLBACK_COLOR
}

// Keep node labels short on screen; the full name stays in the title/aria-label.
function shorten(name: string, max = 16): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

function GraphViewPanel({
  mainEntity,
  relatedEntities,
  nameById = {},
  onEntityClick,
  title = 'Knowledge Graph',
}: GraphViewPanelProps) {
  if (!mainEntity?.id) return null

  // Build the graph inputs from data already on the client. Neighbour display
  // names come from the neighbour itself, then nameById, then the id.
  const nodes: GraphNode[] = [
    { id: mainEntity.id, name: mainEntity.name, type: mainEntity.type },
    ...relatedEntities.map((re) => ({
      id: re.id,
      name: re.name ?? nameById[re.id] ?? re.id,
      type: re.type,
    })),
  ]
  const edges: GraphEdge[] = relatedEntities.map((re) => ({
    source: mainEntity.id,
    target: re.id,
    type: re.relationship,
  }))

  const layout = computeGraphLayout(mainEntity.id, nodes, edges, {
    width: 600,
    height: 420,
  })

  const neighbourCount = layout.nodes.filter((n) => !n.isMain).length
  // Only label edges when the graph is sparse enough to stay readable.
  const showEdgeLabels = layout.edges.length > 0 && layout.edges.length <= 8

  return (
    <div className="result-section graph-view">
      <h3>{title}</h3>
      <p className="graph-view-caption">
        {neighbourCount > 0
          ? `${mainEntity.name} and ${neighbourCount} direct connection${
              neighbourCount === 1 ? '' : 's'
            }.`
          : `${mainEntity.name} has no direct connections to graph yet.`}
        {layout.truncated
          ? ` Showing the first ${MAX_NODES} entities / ${MAX_EDGES} links (MVP cap).`
          : ''}
      </p>

      <svg
        className="graph-view-svg"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width="100%"
        role="img"
        aria-label={`Knowledge graph for ${mainEntity.name}`}
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        <rect
          x={0}
          y={0}
          width={layout.width}
          height={layout.height}
          rx={12}
          fill="#fdfcfa"
          stroke="#e7e3da"
        />

        {/* Edges first so nodes render on top. */}
        <g className="graph-edges">
          {layout.edges.map((e, i) => (
            <g key={`edge-${i}`}>
              <line
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke="#c3bcae"
                strokeWidth={1.5}
              />
              {showEdgeLabels ? (
                <text
                  x={e.mx}
                  y={e.my - 3}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#8a8478"
                >
                  {e.type.replace(/_/g, ' ')}
                </text>
              ) : null}
            </g>
          ))}
        </g>

        {/* Nodes. */}
        <g className="graph-nodes">
          {layout.nodes.map((n) => {
            const r = n.isMain ? 26 : 18
            const fill = colorFor(n.type)
            const label = shorten(n.name)
            const clickable = !n.isMain && Boolean(onEntityClick)
            return (
              <g
                key={`node-${n.id}`}
                transform={`translate(${n.x} ${n.y})`}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                aria-label={clickable ? `Open ${n.name}` : undefined}
                style={clickable ? { cursor: 'pointer' } : undefined}
                onClick={clickable ? () => onEntityClick!(n.id) : undefined}
                onKeyDown={
                  clickable
                    ? (ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault()
                          onEntityClick!(n.id)
                        }
                      }
                    : undefined
                }
              >
                <circle r={r} fill={fill} stroke="#ffffff" strokeWidth={2} />
                <title>{`${n.name} (${n.type})`}</title>
                <text
                  y={r + 13}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={n.isMain ? 700 : 500}
                  fill="#1a1a1a"
                >
                  {label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

export default GraphViewPanel
