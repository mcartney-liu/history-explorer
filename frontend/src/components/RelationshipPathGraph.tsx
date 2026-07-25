// M21-A1 (Relationship Path Graph Visualization): pure SVG visualization of
// EXISTING relationship paths computed by the M20 findRelationshipPaths() helper.
//
// SCOPE (frozen): this component is a PURE VIEW. It receives an already-computed
// RelationshipPath[] in which EVERY node global_id and EVERY edge relation_type
// comes from EXISTING relationship edges. There is NO `new RelationshipEdge()`,
// NO edge creation, NO edge reversal, NO guessed connection, NO inference, NO
// causal reasoning, NO fetch, NO API call, and NO AI invocation. The component
// performs only layout + rendering + hover interaction. It never recomputes a
// path, queries data, calls an endpoint, or touches the AI pipeline.
//
// Relationship Layer position: Visualization Only.

import { useState } from 'react'
import type { RelationshipPath } from '../data/relationshipUtils'

export type RelationshipPathGraphProps = {
  /** Pre-computed paths (nodes + edges) over EXISTING relationship edges. */
  paths: RelationshipPath[]
  /** global_id -> friendly display name. Never fabricated; falls back to gid. */
  nameByGlobalId: Record<string, string>
}

// Layout constants (SVG user units). Paths are drawn as horizontal chains and
// stacked vertically; shared nodes across paths are simply re-drawn per path.
const NODE_W = 130
const NODE_H = 38
const X_GAP = 96 // horizontal gap left for the edge + its label
const STEP = NODE_W + X_GAP
const MARGIN = 16
const ROW_H = 78

const NODE_FILL = '#f4f4f5'
const NODE_STROKE = '#52525b'
const TEXT_FILL = '#18181b'
const EDGE_STROKE = '#a1a1aa'
const EDGE_TEXT_FILL = '#3f3f46'

export default function RelationshipPathGraph({
  paths,
  nameByGlobalId,
}: RelationshipPathGraphProps) {
  // Hover state is a VIEW-ONLY selection of which path to emphasise; it is
  // component-local, never persisted, and never alters the underlying data.
  const [hovered, setHovered] = useState<number | null>(null)

  if (!paths || paths.length === 0) {
    return <p className="rpg-empty">No relationship path available</p>
  }

  const maxNodes = paths.reduce((m, p) => Math.max(m, p.nodes.length), 0)
  const svgWidth = MARGIN * 2 + (maxNodes - 1) * STEP + NODE_W
  const svgHeight = MARGIN * 2 + (paths.length - 1) * ROW_H + NODE_H

  const labelOf = (gid: string): string => nameByGlobalId[gid] ?? gid

  return (
    <svg
      className="rpg-svg"
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      role="img"
      aria-label="Relationship path graph"
    >
      {paths.map((path, pi) => {
        const baseY = MARGIN + pi * ROW_H
        const nodeCenterY = baseY + NODE_H / 2
        const dimmed = hovered !== null && hovered !== pi
        return (
          <g
            key={pi}
            className="rpg-path"
            data-path-index={pi}
            onMouseEnter={() => setHovered(pi)}
            onMouseLeave={() => setHovered(null)}
            style={dimmed ? { opacity: 0.25 } : undefined}
          >
            {/* Edges first so nodes paint on top of the line endpoints. */}
            {path.edges.map((relType, j) => {
              const x1 = MARGIN + j * STEP + NODE_W
              const x2 = MARGIN + (j + 1) * STEP
              const midX = (x1 + x2) / 2
              return (
                <g key={`e${j}`} className="rpg-edge">
                  <line
                    className="rpg-edge-line"
                    x1={x1}
                    y1={nodeCenterY}
                    x2={x2}
                    y2={nodeCenterY}
                    stroke={EDGE_STROKE}
                    strokeWidth={2}
                  />
                  <text
                    className="rpg-edge-label"
                    x={midX}
                    y={nodeCenterY - 6}
                    textAnchor="middle"
                    fontSize={12}
                    fill={EDGE_TEXT_FILL}
                  >
                    {relType}
                  </text>
                </g>
              )
            })}
            {path.nodes.map((gid, j) => {
              const x = MARGIN + j * STEP
              return (
                <g key={`n${j}`} className="rpg-node">
                  <rect
                    className="rpg-node-rect"
                    x={x}
                    y={baseY}
                    width={NODE_W}
                    height={NODE_H}
                    rx={6}
                    ry={6}
                    fill={NODE_FILL}
                    stroke={NODE_STROKE}
                    strokeWidth={1.5}
                  />
                  <text
                    className="rpg-node-label"
                    x={x + NODE_W / 2}
                    y={nodeCenterY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={13}
                    fill={TEXT_FILL}
                  >
                    {labelOf(gid)}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}
