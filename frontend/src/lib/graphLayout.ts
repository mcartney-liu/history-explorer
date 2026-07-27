// M34-A2 (Knowledge Graph Visualization MVP) — pure, deterministic radial layout.
//
// This module holds NO React and does NO I/O: it turns an already-fetched set of
// nodes + edges (from GET /explore or GET /entity) into 2D coordinates the SVG
// renderer can draw. Keeping the math pure makes it fully unit-testable without a
// DOM (matching the repo's environment:'node' test style).
//
// MVP SCOPE (M34 Scope Freeze): the graph shows the current topic's MAIN entity
// plus its DIRECT neighbours only. Hard caps are enforced HERE so the renderer
// can never be handed an unbounded graph:
//   - nodes ≤ MAX_NODES (30)
//   - edges ≤ MAX_EDGES (60)
// Anything beyond the caps is clipped and `truncated` is set so the UI can say so.

export const MAX_NODES = 30
export const MAX_EDGES = 60

export type GraphNode = { id: string; name: string; type: string }
export type GraphEdge = { source: string; target: string; type: string }

export type LaidOutNode = GraphNode & {
  x: number
  y: number
  isMain: boolean
}

export type LaidOutEdge = GraphEdge & {
  x1: number
  y1: number
  x2: number
  y2: number
  mx: number // midpoint (for an optional edge label)
  my: number
}

export type GraphLayout = {
  width: number
  height: number
  nodes: LaidOutNode[]
  edges: LaidOutEdge[]
  truncated: boolean
}

export type LayoutOptions = {
  width?: number
  height?: number
  // Fraction of the smaller dimension used as the neighbour ring radius.
  radiusRatio?: number
}

const DEFAULT_WIDTH = 600
const DEFAULT_HEIGHT = 420
const DEFAULT_RADIUS_RATIO = 0.38

// Compute a radial layout: the main entity sits at the centre; its direct
// neighbours are evenly distributed on a ring around it. Deterministic — the
// same input always yields the same coordinates (no randomness), which keeps the
// render stable and the unit tests exact.
export function computeGraphLayout(
  mainId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  opts: LayoutOptions = {},
): GraphLayout {
  const width = opts.width ?? DEFAULT_WIDTH
  const height = opts.height ?? DEFAULT_HEIGHT
  const radiusRatio = opts.radiusRatio ?? DEFAULT_RADIUS_RATIO

  // 1) De-duplicate nodes by id, preserving first-seen order.
  const byId = new Map<string, GraphNode>()
  for (const n of nodes) {
    if (n && n.id && !byId.has(n.id)) byId.set(n.id, n)
  }

  // 2) Order: main entity first (if present), then the rest in insertion order.
  const ordered: GraphNode[] = []
  const main = byId.get(mainId)
  if (main) ordered.push(main)
  for (const n of byId.values()) {
    if (n.id !== mainId) ordered.push(n)
  }

  // 3) Apply the node cap (main is always kept because it is first).
  const nodeOverCap = ordered.length > MAX_NODES
  const capped = ordered.slice(0, MAX_NODES)
  const keptIds = new Set(capped.map((n) => n.id))

  // 4) Position: main at centre, neighbours on a ring.
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) * radiusRatio
  const neighbours = capped.filter((n) => n.id !== mainId)

  const pos = new Map<string, { x: number; y: number }>()
  const laidOutNodes: LaidOutNode[] = capped.map((n) => {
    if (n.id === mainId) {
      pos.set(n.id, { x: cx, y: cy })
      return { ...n, x: cx, y: cy, isMain: true }
    }
    const i = neighbours.findIndex((m) => m.id === n.id)
    // Start at the top (-90°) and go clockwise for a stable, readable ring.
    const angle = (2 * Math.PI * i) / Math.max(neighbours.length, 1) - Math.PI / 2
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    pos.set(n.id, { x, y })
    return { ...n, x, y, isMain: false }
  })

  // 5) Keep only edges whose BOTH endpoints survived the node cap, then apply
  //    the edge cap. Drop self-loops (source === target) — they add no signal.
  const validEdges = edges.filter(
    (e) =>
      e &&
      e.source !== e.target &&
      keptIds.has(e.source) &&
      keptIds.has(e.target),
  )
  const edgeOverCap = validEdges.length > MAX_EDGES
  const cappedEdges = validEdges.slice(0, MAX_EDGES)

  const laidOutEdges: LaidOutEdge[] = cappedEdges.map((e) => {
    const s = pos.get(e.source)!
    const t = pos.get(e.target)!
    return {
      ...e,
      x1: s.x,
      y1: s.y,
      x2: t.x,
      y2: t.y,
      mx: (s.x + t.x) / 2,
      my: (s.y + t.y) / 2,
    }
  })

  return {
    width,
    height,
    nodes: laidOutNodes,
    edges: laidOutEdges,
    truncated: nodeOverCap || edgeOverCap,
  }
}
