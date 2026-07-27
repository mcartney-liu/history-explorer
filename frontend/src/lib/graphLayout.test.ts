import { describe, it, expect } from 'vitest'
import {
  computeGraphLayout,
  MAX_NODES,
  MAX_EDGES,
  type GraphNode,
  type GraphEdge,
} from './graphLayout'

// M34-A2: the layout is pure math — these tests need no DOM.
describe('computeGraphLayout (M34-A2)', () => {
  const main: GraphNode = { id: 'm', name: 'Main', type: 'Person' }

  it('places the main entity at the centre', () => {
    const layout = computeGraphLayout('m', [main], [], { width: 600, height: 400 })
    const center = layout.nodes.find((n) => n.id === 'm')!
    expect(center.isMain).toBe(true)
    expect(center.x).toBe(300)
    expect(center.y).toBe(200)
  })

  it('distributes neighbours on a ring around the centre', () => {
    const nodes: GraphNode[] = [
      main,
      { id: 'a', name: 'A', type: 'Event' },
      { id: 'b', name: 'B', type: 'Location' },
      { id: 'c', name: 'C', type: 'Idea' },
    ]
    const layout = computeGraphLayout('m', nodes, [], { width: 600, height: 400 })
    const neighbours = layout.nodes.filter((n) => !n.isMain)
    expect(neighbours).toHaveLength(3)
    // Every neighbour sits off-centre (on the ring), never on top of the main node.
    for (const n of neighbours) {
      const dist = Math.hypot(n.x - 300, n.y - 200)
      expect(dist).toBeGreaterThan(1)
    }
  })

  it('is deterministic — same input yields identical coordinates', () => {
    const nodes: GraphNode[] = [main, { id: 'a', name: 'A', type: 'Event' }]
    const a = computeGraphLayout('m', nodes, [])
    const b = computeGraphLayout('m', nodes, [])
    expect(a.nodes).toEqual(b.nodes)
  })

  it('resolves edge endpoints to node coordinates', () => {
    const nodes: GraphNode[] = [main, { id: 'a', name: 'A', type: 'Event' }]
    const edges: GraphEdge[] = [{ source: 'm', target: 'a', type: 'caused' }]
    const layout = computeGraphLayout('m', nodes, edges, { width: 600, height: 400 })
    expect(layout.edges).toHaveLength(1)
    const e = layout.edges[0]
    expect(e.x1).toBe(300)
    expect(e.y1).toBe(200)
    // Endpoint matches neighbour A's coordinates.
    const a = layout.nodes.find((n) => n.id === 'a')!
    expect(e.x2).toBeCloseTo(a.x)
    expect(e.y2).toBeCloseTo(a.y)
    // Midpoint is exposed for edge labels.
    expect(e.mx).toBeCloseTo((e.x1 + e.x2) / 2)
    expect(e.my).toBeCloseTo((e.y1 + e.y2) / 2)
  })

  it('drops edges with a missing endpoint and self-loops', () => {
    const nodes: GraphNode[] = [main, { id: 'a', name: 'A', type: 'Event' }]
    const edges: GraphEdge[] = [
      { source: 'm', target: 'ghost', type: 'caused' }, // ghost not in nodes
      { source: 'a', target: 'a', type: 'influenced' }, // self-loop
      { source: 'm', target: 'a', type: 'led_to' }, // valid
    ]
    const layout = computeGraphLayout('m', nodes, edges)
    expect(layout.edges).toHaveLength(1)
    expect(layout.edges[0].type).toBe('led_to')
  })

  it('de-duplicates nodes by id', () => {
    const nodes: GraphNode[] = [
      main,
      { id: 'a', name: 'A', type: 'Event' },
      { id: 'a', name: 'A dup', type: 'Event' },
    ]
    const layout = computeGraphLayout('m', nodes, [])
    expect(layout.nodes).toHaveLength(2)
  })

  it('enforces the node cap (≤ MAX_NODES) and flags truncation', () => {
    const nodes: GraphNode[] = [main]
    for (let i = 0; i < MAX_NODES + 10; i++) {
      nodes.push({ id: `n${i}`, name: `N${i}`, type: 'Event' })
    }
    const layout = computeGraphLayout('m', nodes, [])
    expect(layout.nodes.length).toBe(MAX_NODES)
    expect(layout.truncated).toBe(true)
    // The main entity is never dropped by the cap.
    expect(layout.nodes.some((n) => n.id === 'm' && n.isMain)).toBe(true)
  })

  it('enforces the edge cap (≤ MAX_EDGES) and flags truncation', () => {
    const nodes: GraphNode[] = [main]
    for (let i = 0; i < 20; i++) nodes.push({ id: `n${i}`, name: `N${i}`, type: 'Event' })
    const edges: GraphEdge[] = []
    // Build a dense set of valid edges well beyond the cap.
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 20; j++) {
        if (i !== j) edges.push({ source: `n${i}`, target: `n${j}`, type: 'related' })
      }
    }
    const layout = computeGraphLayout('m', nodes, edges)
    expect(layout.edges.length).toBe(MAX_EDGES)
    expect(layout.truncated).toBe(true)
  })

  it('handles the main-only graph (no neighbours, no edges)', () => {
    const layout = computeGraphLayout('m', [main], [])
    expect(layout.nodes).toHaveLength(1)
    expect(layout.edges).toHaveLength(0)
    expect(layout.truncated).toBe(false)
  })
})
