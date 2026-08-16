// M21-A1 (Relationship Path Graph Visualization): pure SVG visualization of
// EXISTING relationship paths computed by the M20 findRelationshipPaths() helper.
//
// M22-A4 (Layout Toggle): adds a view-only layout switch — Horizontal Chain
// (default) and Compact Grid. The toggle ONLY changes SVG coordinates; the
// RelationshipPath[] data, findRelationshipPaths(), and every existing edge are
// NEVER recomputed, created, reversed, inferred, or connected.
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
import { useLocale } from '../data/locale'
import { Icon } from './ui/Icon'
import type { IconName } from './ui/Icon'
import { getEntityIcon, entityTypeFromGlobalId } from '../data/entity/entityLabels'

export type RelationshipPathGraphProps = {
  /** Pre-computed paths (nodes + edges) over EXISTING relationship edges. */
  paths: RelationshipPath[]
  /** global_id -> friendly display name. Never fabricated; falls back to gid. */
  nameByGlobalId: Record<string, string>
  /** Seed the initial layout (test/dev convenience). Defaults to 'horizontal'. */
  defaultLayout?: 'horizontal' | 'grid'
}

type LayoutMode = 'horizontal' | 'grid'

// Layout constants (SVG user units). Paths are drawn as horizontal chains and
// stacked vertically; shared nodes across paths are simply re-drawn per path.
const NODE_W = 130
const NODE_H = 38
const MARGIN = 16
const X_GAP = 96 // horizontal gap left for the edge + its label
const STEP = NODE_W + X_GAP
const ROW_H = 78

// Compact Grid layout constants. Nodes wrap into a fixed column grid per path;
// consecutive nodes are still joined by a straight line (no new edge semantics).
const GRID_COLS = 3
const GRID_STEP_X = NODE_W + 46
const GRID_STEP_Y = NODE_H + 46
const GRID_PATH_GAP = 40

const NODE_FILL = 'var(--color-paper-200)'
const NODE_STROKE = 'var(--color-paper-300)'
const TEXT_FILL = 'var(--color-ink-900)'
const EDGE_STROKE = 'var(--color-paper-300)'
const EDGE_TEXT_FILL = 'var(--color-ink-500)'

/** Top-left (x, y) of node `j` within path `pi`, for the active layout. */
function gridPathTop(pi: number, paths: RelationshipPath[]): number {
  let top = MARGIN
  for (let k = 0; k < pi; k++) {
    const rows = Math.ceil((paths[k].nodes?.length ?? 0) / GRID_COLS)
    top += rows * GRID_STEP_Y + GRID_PATH_GAP
  }
  return top
}

export default function RelationshipPathGraph({
  paths,
  nameByGlobalId,
  defaultLayout = 'horizontal',
}: RelationshipPathGraphProps) {
  const { t } = useLocale()
  // Hover state is a VIEW-ONLY selection of which path to emphasise; it is
  // component-local, never persisted, and never alters the underlying data.
  const [hovered, setHovered] = useState<number | null>(null)
  // Layout state is VIEW-ONLY: it only changes how the SAME already-computed
  // data is drawn. It never recomputes paths, creates edges, or infers links.
  const [layout, setLayout] = useState<LayoutMode>(defaultLayout)

  if (!paths || paths.length === 0) {
    return <p className="rpg-empty">{t('rpg.empty')}</p>
  }

  const maxNodes = paths.reduce((m, p) => Math.max(m, p.nodes?.length ?? 0), 0)

  const nodeTopLeft = (pi: number, j: number): { x: number; y: number } => {
    if (layout === 'grid') {
      const col = j % GRID_COLS
      const row = Math.floor(j / GRID_COLS)
      return { x: MARGIN + col * GRID_STEP_X, y: gridPathTop(pi, paths) + row * GRID_STEP_Y }
    }
    return { x: MARGIN + j * STEP, y: MARGIN + pi * ROW_H }
  }

  let svgWidth: number
  let svgHeight: number
  if (layout === 'grid') {
    const gridWidth = MARGIN * 2 + (GRID_COLS - 1) * GRID_STEP_X + NODE_W
    svgWidth = Math.max(gridWidth, MARGIN * 2 + (maxNodes - 1) * STEP + NODE_W)
    let h = MARGIN
    for (const p of paths) {
      const rows = Math.ceil((p.nodes?.length ?? 0) / GRID_COLS)
      h += rows * GRID_STEP_Y + GRID_PATH_GAP
    }
    svgHeight = h - GRID_PATH_GAP + NODE_H + MARGIN
  } else {
    svgWidth = MARGIN * 2 + (maxNodes - 1) * STEP + NODE_W
    svgHeight = MARGIN * 2 + (paths.length - 1) * ROW_H + NODE_H
  }

  const labelOf = (gid: string): string => nameByGlobalId[gid] ?? gid

  return (
    <div className="rpg-wrap" data-layout={layout}>
      <div className="rpg-layout-toggle" role="group" aria-label={t('rpg.layoutToggleAria')}>
        <button
          type="button"
          className="rpg-layout-btn"
          aria-pressed={layout === 'horizontal'}
          onClick={() => setLayout('horizontal')}
        >
          {t('rpg.layoutHorizontal')}
        </button>
        <button
          type="button"
          className="rpg-layout-btn"
          aria-pressed={layout === 'grid'}
          onClick={() => setLayout('grid')}
        >
          {t('rpg.layoutGrid')}
        </button>
      </div>
      <svg
        className="rpg-svg"
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        role="img"
        aria-label={t('rpg.ariaLabel')}
      >
        {paths.map((path, pi) => {
          const positions = (path.nodes ?? []).map((_, j) => nodeTopLeft(pi, j))
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
              {(path.edges ?? []).map((relType, j) => {
                const a = positions[j]
                const b = positions[j + 1]
                const aCx = a.x + NODE_W / 2
                const aCy = a.y + NODE_H / 2
                const bCx = b.x + NODE_W / 2
                const bCy = b.y + NODE_H / 2
                const midX = (aCx + bCx) / 2
                const midY = (aCy + bCy) / 2
                return (
                  <g key={`e${j}`} className="rpg-edge">
                    <line
                      className="rpg-edge-line"
                      x1={aCx}
                      y1={aCy}
                      x2={bCx}
                      y2={bCy}
                      style={{ stroke: EDGE_STROKE }}
                      strokeWidth={2}
                    />
                    <text
                      className="rpg-edge-label"
                      x={midX}
                      y={midY - 6}
                      textAnchor="middle"
                      fontSize={12}
                      style={{ fill: EDGE_TEXT_FILL }}
                    >
                      {relType}
                    </text>
                  </g>
                )
              })}
              {(path.nodes ?? []).map((gid, j) => {
                const { x, y } = positions[j]
                const nodeCenterX = x + NODE_W / 2
                const nodeCenterY = y + NODE_H / 2
                return (
                  <g key={`n${j}`} className="rpg-node">
                    <rect
                      className="rpg-node-rect"
                      x={x}
                      y={y}
                      width={NODE_W}
                      height={NODE_H}
                      rx={6}
                      ry={6}
                      style={{ fill: NODE_FILL, stroke: NODE_STROKE }}
                      strokeWidth={1.5}
                    />
                    <g transform={`translate(${x + 4}, ${nodeCenterY - 8})`}>
                      <Icon
                        name={getEntityIcon(entityTypeFromGlobalId(gid)) as IconName}
                        size={16}
                        className="rpg-node-label-icon"
                      />
                    </g>
                    <text
                      className="rpg-node-label"
                      x={nodeCenterX}
                      y={nodeCenterY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={13}
                      style={{ fill: TEXT_FILL }}
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
    </div>
  )
}
