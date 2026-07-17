"""GlobalGraph: the unified, cross-topic knowledge graph (M3.5-001).

`KnowledgeGraph` (graph.py) is *per-topic*: it resolves each relationship
endpoint to a LOCAL id and drops cross-topic (`global_id`) edges as
"dangling-by-design". `GlobalGraph` complements it: it resolves every endpoint
to its CANONICAL `global_id` through the shared `KnowledgeRegistry`, so
cross-topic edges are **included** rather than discarded. The result is one
unified adjacency over the entire interconnected world.

Design rules (M3.5-000 freeze):
- Lives in the Knowledge Layer (core/); it is NOT a standalone Service.
- Reuses the existing `KnowledgeRegistry` + global_id index — no new storage,
  no duplicate indexing.
- Nodes are keyed by `global_id` (the canonical id). Entities that somehow
  lack a `global_id` fall back to `topic:local_id` (never happens in the
  M3-003 interconnected dataset, where every entity is global_id'd).
- No AI / GIS / Neo4j / third-party graph library — pure stdlib.
- Pure graph structure ONLY: NO ranking, NO recommendation, NO exploration
  ordering. Those belong to M3.5-002 / M3.5-003.

It delegates adjacency, BFS and shortest-path to the existing `DirectedGraph`
(graph.py) rather than re-implementing traversal — `GlobalGraph` is a thin,
cross-topic-aware layer over it.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .graph import DirectedGraph, Edge
from .registry import KnowledgeRegistry


@dataclass
class GlobalNode:
    """One entity in the unified global graph, keyed by its `global_id`."""

    global_id: str
    topic: str
    local_id: str
    type: str
    name: str
    entity: dict


class GlobalGraph:
    """A single unified, cross-topic directed graph over all topics."""

    def __init__(self, topic_datasets: list[tuple[str, dict]], registry: KnowledgeRegistry):
        self._registry = registry
        self._g = DirectedGraph()
        self._nodes: dict[str, GlobalNode] = {}
        self._build(topic_datasets, registry)

    # --- construction -------------------------------------------------------
    @classmethod
    def _empty(cls, registry: KnowledgeRegistry) -> "GlobalGraph":
        """Build an uninitialized shell (used by `subgraph`)."""
        obj = cls.__new__(cls)
        obj._registry = registry
        obj._g = DirectedGraph()
        obj._nodes = {}
        return obj

    def _canonical_key(self, topic: str, local_id: str) -> str:
        ent = self._registry.get_entity(topic, local_id)
        gid = ent.get("global_id") if isinstance(ent, dict) else None
        if gid:
            return gid
        return f"{topic}:{local_id}"

    def _register_node(self, topic: str, local_id: str) -> None:
        key = self._canonical_key(topic, local_id)
        if key in self._nodes:
            return
        ent = self._registry.get_entity(topic, local_id) or {}
        self._nodes[key] = GlobalNode(
            global_id=key,
            topic=topic,
            local_id=local_id,
            type=ent.get("type", ""),
            name=ent.get("name", ""),
            entity=ent,
        )
        self._g.nodes.add(key)

    def _build(self, topic_datasets: list[tuple[str, dict]], registry: KnowledgeRegistry) -> None:
        # 1) Global node registration: every entity becomes a node, regardless
        #    of whether it participates in any relationship.
        for topic, data in topic_datasets:
            if not isinstance(data, dict):
                continue
            for ent in data.get("entities") or []:
                if not isinstance(ent, dict) or not ent.get("id"):
                    continue
                self._register_node(topic, ent["id"])

        # 2) Every relationship becomes an edge. Endpoints are resolved through
        #    the registry to their canonical global_id — so cross-topic
        #    (namespace:id) edges are included, unlike the per-topic graph.
        for topic, data in topic_datasets:
            if not isinstance(data, dict):
                continue
            for rel in data.get("relationships") or []:
                if not isinstance(rel, dict):
                    continue
                src_ref = registry.resolve(rel.get("source"))
                tgt_ref = registry.resolve(rel.get("target"))
                if src_ref is None or tgt_ref is None:
                    # Dangling endpoint: a validation concern, not a graph one.
                    continue
                self._register_node(src_ref.topic, src_ref.local_id)
                self._register_node(tgt_ref.topic, tgt_ref.local_id)
                src_key = self._canonical_key(src_ref.topic, src_ref.local_id)
                tgt_key = self._canonical_key(tgt_ref.topic, tgt_ref.local_id)
                self._g.add_edge(Edge(src_key, tgt_key, rel.get("type", "related_to")))

    # --- node access --------------------------------------------------------
    def get_node(self, global_id: str) -> Optional[GlobalNode]:
        return self._nodes.get(global_id)

    def all_nodes(self) -> list[GlobalNode]:
        return list(self._nodes.values())

    @property
    def node_count(self) -> int:
        return len(self._nodes)

    @property
    def edge_count(self) -> int:
        return sum(len(edges) for edges in self._g.out.values())

    # --- adjacency (out / in) ----------------------------------------------
    def neighbors(self, global_id: str, direction: str = "both") -> list[Edge]:
        """Edges touching `global_id`. direction: 'outgoing' | 'incoming' | 'both'."""
        return self._g.neighbors(global_id, direction)

    def out_neighbors(self, global_id: str) -> list[Edge]:
        return self._g.neighbors(global_id, "outgoing")

    def in_neighbors(self, global_id: str) -> list[Edge]:
        return self._g.neighbors(global_id, "incoming")

    # --- path ---------------------------------------------------------------
    def find_path(self, src: str, tgt: str) -> Optional[list[str]]:
        """Shortest path (by edges) of global_ids from src to tgt, or None."""
        return self._g.find_path(src, tgt)

    # --- subgraph -----------------------------------------------------------
    def subgraph(self, roots: list[str], max_depth: int = 2) -> "GlobalGraph":
        """Return a new GlobalGraph containing `roots` and every node reachable
        within `max_depth` BFS hops, plus the edges between those nodes.

        Used by M3.5-002/003 to scope exploration to a neighborhood without
        copying the entire world graph.
        """
        visited: set[str] = set()
        for root in roots:
            if root not in self._g.nodes:
                continue
            visited.add(root)
            for _, node in self._g.bfs(root, max_depth):
                visited.add(node)

        sub = self._empty(self._registry)
        for node_key in visited:
            sub._g.nodes.add(node_key)
            node = self._nodes.get(node_key)
            if node is not None:
                sub._nodes[node_key] = node
        # Re-add only the edges whose both ends are in the visited set.
        seen_edges: set[tuple[str, str, str]] = set()
        for src, edges in self._g.out.items():
            if src not in visited:
                continue
            for edge in edges:
                if edge.target not in visited:
                    continue
                key = (edge.source, edge.target, edge.type)
                if key in seen_edges:
                    continue
                seen_edges.add(key)
                sub._g.add_edge(edge)
        return sub
