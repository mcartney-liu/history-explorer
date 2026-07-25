// M21-A1 (Relationship Path Graph Visualization) — component presentation tests.
// Mirrors the project convention: renderToStaticMarkup (no jsdom), assert on
// static HTML. The component is a PURE VIEW over an already-computed
// RelationshipPath[] (EXISTING edges only). It must never fabricate an edge and
// must not surface 推断 / 发现 / 因果 language.

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RelationshipPathGraph from './RelationshipPathGraph'
import type { RelationshipPath } from '../data/relationshipUtils'

const nameByGlobalId: Record<string, string> = {
  'rome:empire': '罗马帝国',
  'greece:alex': '亚历山大',
  'persia:cyrus': '居鲁士',
}

describe('RelationshipPathGraph (M21-A1)', () => {
  it('renders an SVG with node names for a single existing-edge path', () => {
    const paths: RelationshipPath[] = [
      { nodes: ['rome:empire', 'greece:alex'], edges: ['conquered'] },
    ]
    const html = renderToStaticMarkup(
      <RelationshipPathGraph paths={paths} nameByGlobalId={nameByGlobalId} />,
    )
    expect(html).toContain('rpg-svg')
    expect(html).toContain('<svg')
    // Both resolved node labels are present.
    expect(html).toContain('罗马帝国')
    expect(html).toContain('亚历山大')
    // Node group markers render one per path node.
    const nodeGroups = html.match(/class="rpg-node"/g) ?? []
    expect(nodeGroups).toHaveLength(2)
  })

  it('displays the relationship type on every edge', () => {
    const paths: RelationshipPath[] = [
      { nodes: ['rome:empire', 'greece:alex'], edges: ['conquered'] },
    ]
    const html = renderToStaticMarkup(
      <RelationshipPathGraph paths={paths} nameByGlobalId={nameByGlobalId} />,
    )
    expect(html).toContain('rpg-edge-label')
    expect(html).toContain('conquered')
    const edgeGroups = html.match(/class="rpg-edge"/g) ?? []
    expect(edgeGroups).toHaveLength(1)
  })

  it('renders a multi-hop chain (node —relation→ node —relation→ node)', () => {
    const paths: RelationshipPath[] = [
      { nodes: ['rome:empire', 'greece:alex', 'persia:cyrus'], edges: ['conquered', 'traded_with'] },
    ]
    const html = renderToStaticMarkup(
      <RelationshipPathGraph paths={paths} nameByGlobalId={nameByGlobalId} />,
    )
    expect(html).toContain('罗马帝国')
    expect(html).toContain('亚历山大')
    expect(html).toContain('居鲁士')
    expect(html).toContain('conquered')
    expect(html).toContain('traded_with')
    const nodeGroups = html.match(/class="rpg-node"/g) ?? []
    expect(nodeGroups).toHaveLength(3)
    const edgeGroups = html.match(/class="rpg-edge"/g) ?? []
    expect(edgeGroups).toHaveLength(2)
  })

  it('renders every path when multiple distinct paths exist', () => {
    const paths: RelationshipPath[] = [
      { nodes: ['rome:empire', 'greece:alex'], edges: ['conquered'] },
      { nodes: ['rome:empire', 'persia:cyrus'], edges: ['traded_with'] },
    ]
    const html = renderToStaticMarkup(
      <RelationshipPathGraph paths={paths} nameByGlobalId={nameByGlobalId} />,
    )
    // Two independent path groups, each carrying a data-path-index.
    expect(html).toContain('data-path-index="0"')
    expect(html).toContain('data-path-index="1"')
    const pathGroups = html.match(/class="rpg-path"/g) ?? []
    expect(pathGroups).toHaveLength(2)
  })

  it('shows the empty state when no path is supplied', () => {
    const html = renderToStaticMarkup(
      <RelationshipPathGraph paths={[]} nameByGlobalId={nameByGlobalId} />,
    )
    expect(html).toContain('No relationship path available')
    // No SVG is rendered for the empty state.
    expect(html).not.toContain('rpg-svg')
  })

  it('never emits 推断 / 发现 / 因果 in the rendered output', () => {
    const paths: RelationshipPath[] = [
      { nodes: ['rome:empire', 'greece:alex'], edges: ['conquered'] },
    ]
    const html = renderToStaticMarkup(
      <RelationshipPathGraph paths={paths} nameByGlobalId={nameByGlobalId} />,
    )
    expect(html).not.toContain('推断')
    expect(html).not.toContain('发现')
    expect(html).not.toContain('因果')
  })
})

// ---------------------------------------------------------------------------
// M22-A4 (RelationshipPathGraph Layout Toggle) — layout is VIEW-ONLY: it only
// changes SVG coordinates. The RelationshipPath[] data, findRelationshipPaths(),
// and every existing edge are never recomputed, created, or inferred.
// ---------------------------------------------------------------------------

describe('RelationshipPathGraph (M22-A4 layout toggle)', () => {
  const nameByGlobalId: Record<string, string> = {
    'rome:empire': '罗马帝国',
    'greece:alex': '亚历山大',
    'persia:cyrus': '居鲁士',
  }

  it('defaults to the horizontal chain layout (nodes laid out left-to-right)', () => {
    const paths: RelationshipPath[] = [
      { nodes: ['rome:empire', 'greece:alex'], edges: ['conquered'] },
    ]
    const html = renderToStaticMarkup(
      <RelationshipPathGraph paths={paths} nameByGlobalId={nameByGlobalId} />,
    )
    expect(html).toContain('data-layout="horizontal"')
    // Node 0 at MARGIN x=16, node 1 one STEP (226) to the right at x=242.
    expect(html).toContain('x="16"')
    expect(html).toContain('x="242"')
  })

  it('renders the compact grid layout when seeded (nodes wrap into a grid column)', () => {
    const paths: RelationshipPath[] = [
      { nodes: ['rome:empire', 'greece:alex', 'persia:cyrus', 'x:d'], edges: ['conquered', 'traded_with', 'r'] },
    ]
    const html = renderToStaticMarkup(
      <RelationshipPathGraph paths={paths} nameByGlobalId={nameByGlobalId} defaultLayout="grid" />,
    )
    expect(html).toContain('data-layout="grid"')
    // In a 3-column grid, the 4th node wraps to row 1 (y = 16 + 84 = 100).
    expect(html).toContain('y="100"')
  })

  it('toggle control reflects the active layout and is wired (two buttons, pressed state matches layout)', () => {
    const horizontal = renderToStaticMarkup(
      <RelationshipPathGraph
        paths={[{ nodes: ['rome:empire', 'greece:alex'], edges: ['conquered'] }]}
        nameByGlobalId={nameByGlobalId}
      />,
    )
    const grid = renderToStaticMarkup(
      <RelationshipPathGraph
        paths={[{ nodes: ['rome:empire', 'greece:alex'], edges: ['conquered'] }]}
        nameByGlobalId={nameByGlobalId}
        defaultLayout="grid"
      />,
    )
    // Both modes render the toggle with two labelled buttons.
    for (const html of [horizontal, grid]) {
      const btns = html.match(/class="rpg-layout-btn"/g) ?? []
      expect(btns).toHaveLength(2)
      expect(html).toContain('横向链')
      expect(html).toContain('紧凑网格')
    }
    // Default (horizontal) => horizontal pressed, grid not.
    expect(horizontal).toContain('aria-pressed="true"')
    // Seeded grid => grid pressed, horizontal not.
    expect(grid).toContain('aria-pressed="true"')
    // The horizontal render must NOT have two aria-pressed="true" (exactly one active).
    expect((horizontal.match(/aria-pressed="true"/g) ?? []).length).toBe(1)
  })

  it('keeps node/edge counts identical across layouts (data is never altered by layout)', () => {
    const paths: RelationshipPath[] = [
      { nodes: ['rome:empire', 'greece:alex', 'persia:cyrus'], edges: ['conquered', 'traded_with'] },
    ]
    const horizontal = renderToStaticMarkup(
      <RelationshipPathGraph paths={paths} nameByGlobalId={nameByGlobalId} />,
    )
    const grid = renderToStaticMarkup(
      <RelationshipPathGraph paths={paths} nameByGlobalId={nameByGlobalId} defaultLayout="grid" />,
    )
    for (const html of [horizontal, grid]) {
      expect((html.match(/class="rpg-node"/g) ?? []).length).toBe(3)
      expect((html.match(/class="rpg-edge"/g) ?? []).length).toBe(2)
    }
  })

  it('preserves hover structure (data-path-index) in both layouts', () => {
    const paths: RelationshipPath[] = [
      { nodes: ['rome:empire', 'greece:alex'], edges: ['conquered'] },
    ]
    const horizontal = renderToStaticMarkup(
      <RelationshipPathGraph paths={paths} nameByGlobalId={nameByGlobalId} />,
    )
    const grid = renderToStaticMarkup(
      <RelationshipPathGraph paths={paths} nameByGlobalId={nameByGlobalId} defaultLayout="grid" />,
    )
    expect(horizontal).toContain('data-path-index="0"')
    expect(grid).toContain('data-path-index="0"')
  })

  it('never emits 推断 / 发现 / 因果 in either layout', () => {
    const paths: RelationshipPath[] = [
      { nodes: ['rome:empire', 'greece:alex', 'persia:cyrus'], edges: ['conquered', 'traded_with'] },
    ]
    const horizontal = renderToStaticMarkup(
      <RelationshipPathGraph paths={paths} nameByGlobalId={nameByGlobalId} />,
    )
    const grid = renderToStaticMarkup(
      <RelationshipPathGraph paths={paths} nameByGlobalId={nameByGlobalId} defaultLayout="grid" />,
    )
    for (const html of [horizontal, grid]) {
      expect(html).not.toContain('推断')
      expect(html).not.toContain('发现')
      expect(html).not.toContain('因果')
    }
  })
})
