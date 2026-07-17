"""KnowledgeService facade for the Knowledge Layer (M3-001).

This is the single object the REST API talks to. It *aggregates* the focused
modules (registry / graph / search / timeline / exploration) and delegates to
them — it deliberately holds no graph-building, indexing or traversal
algorithm of its own, so it never becomes a God Service.

Public surface (stable Knowledge Layer API):
    list_topics / get_topic_data / get_topic_meta / get_topic_datasets
    resolve_entity / find_by_id / find_by_global_id / find_by_alias / find_by_name
    get_graph / find_related / get_entity_relationships / get_exploration_view
    get_timeline_index
    search / get_search_index

Built once at startup from the repository. After that, every request is served
purely from memory.
"""

from __future__ import annotations

from typing import Any, Optional

from .repository import TopicRepository
from .registry import KnowledgeRegistry, EntityRef
from .graph import KnowledgeGraph, DirectedGraph
from .global_graph import GlobalGraph
from .exploration_engine import ExplorationEngine
from .search import build_search_index, SearchProvider
from .timeline import TimelineIndex
from .exploration import build_exploration_view


class KnowledgeService:
    def __init__(self, repository: TopicRepository):
        self._repository = repository
        self._topic_datasets = repository.load_all()

        # Knowledge Layer modules — each owns one concern.
        self._registry = KnowledgeRegistry(self._topic_datasets)
        self._graph = KnowledgeGraph(self._topic_datasets)
        # M3.5-001: the unified, cross-topic graph. Built once at startup from
        # the same registries — no separate Service, no new storage.
        self._global_graph = GlobalGraph(self._topic_datasets, self._registry)
        # M3.5-002: deterministic, explainable Exploration Engine over the
        # GlobalGraph. Owns ranking/scoring only; the graph stays pure structure.
        self._exploration_engine = ExplorationEngine(
            self._global_graph, self._registry, self._topic_datasets
        )
        self._search_index = build_search_index(self._registry)
        self._search_provider = SearchProvider(self._search_index)
        self._timelines: dict[str, TimelineIndex] = {
            topic: TimelineIndex(data.get("timeline", []))
            for topic, data in self._topic_datasets
        }

    # --- Topic / dataset access (delegates to repository) ----------------
    def list_topics(self) -> list[str]:
        return self._registry.list_topics()

    def get_topic_data(self, topic: str) -> Optional[dict]:
        return self._repository.load_topic(topic)

    def get_topic_meta(self, topic: str) -> Optional[dict]:
        return self._registry.get_topic_meta(topic)

    def get_topic_datasets(self) -> list[tuple[str, dict]]:
        return self._topic_datasets

    # --- Entity lookup (delegates to registry) ---------------------------
    def resolve_entity(self, ref: str) -> Optional[EntityRef]:
        """Resolve a local id OR a global_id to (topic, local_id)."""
        return self._registry.resolve(ref)

    def find_by_id(self, topic: str, local_id: str) -> Optional[dict]:
        return self._registry.get_entity(topic, local_id)

    def find_by_global_id(self, global_id: str):
        ref = self._registry.find_by_global_id(global_id)
        if ref is None:
            return None
        return (ref.topic, ref.local_id, self._registry.get_entity(ref.topic, ref.local_id))

    def find_by_alias(self, alias: str) -> list[EntityRef]:
        return self._registry.find_by_alias(alias)

    def find_by_name(self, name: str) -> Optional[EntityRef]:
        return self._registry.find_by_name(name)

    # --- Graph / traversal (delegates to graph) --------------------------
    def get_graph(self, topic: str) -> DirectedGraph:
        return self._graph.get_graph(topic)

    def find_related(
        self, topic: str, local_id: str, direction: str = "both"
    ) -> list[dict]:
        """Neighbors of `local_id` with relationship type + direction.

        direction: 'outgoing' | 'incoming' | 'both'.
        """
        g = self._graph.get_graph(topic)
        ents = self._registry.get_entities(topic)
        result: list[dict] = []
        for edge in g.neighbors(local_id, direction):
            other_id = edge.target if edge.source == local_id else edge.source
            other = ents.get(other_id, {})
            result.append(
                {
                    "id": other.get("id"),
                    "type": other.get("type"),
                    "relationship": edge.type,
                    "direction": "outgoing" if edge.source == local_id else "incoming",
                }
            )
        return result

    def get_entity_relationships(self, topic: str, local_id: str) -> list[dict]:
        """Rich relationship view for /entity: type/source/target/direction/other.

        M3.5-003 (additive): the `other` object now also carries `global_id`
        and `topic`, so the frontend can resolve cross-topic neighbors directly
        without re-deriving the canonical id. Pre-existing fields
        (`id` / `name` / `type`) are unchanged, and the endpoint is resolved
        globally so cross-topic (`namespace:id`) endpoints get correct data
        instead of an empty stub.
        """
        data = self.get_topic_data(topic)
        if not data:
            return []
        entities = data.get("entities", [])
        entity_by_id = {e.get("id"): e for e in entities}
        rel_view: list[dict] = []
        for rel in data.get("relationships", []):
            src = rel.get("source")
            tgt = rel.get("target")
            if src == local_id or tgt == local_id:
                other_id = tgt if src == local_id else src
                rel_view.append(
                    {
                        "type": rel.get("type", "related_to"),
                        "source": src,
                        "target": tgt,
                        "direction": "outgoing" if src == local_id else "incoming",
                        "other": self._other_view(other_id, topic, entity_by_id),
                    }
                )
        return rel_view

    def _other_view(
        self, ref: str, topic: str, local_entity_by_id: dict
    ) -> dict:
        """Resolve a relationship endpoint to a stable `other` view.

        Returns {id, name, type, global_id, topic}. Local endpoints use the
        current topic; cross-topic (`namespace:id`) endpoints are resolved
        through the shared registry. Unknown endpoints degrade to an id-only
        stub — never raises.
        """
        local = local_entity_by_id.get(ref)
        resolved_topic = topic
        if local is None:
            resolved = self._registry.resolve(ref)
            if resolved is not None:
                local = self._registry.get_entity(resolved.topic, resolved.local_id)
                resolved_topic = resolved.topic
        if local is None:
            return {"id": ref, "name": "", "type": "", "global_id": None, "topic": None}
        return {
            "id": local.get("id"),
            "name": local.get("name", ""),
            "type": local.get("type", ""),
            "global_id": local.get("global_id"),
            "topic": resolved_topic,
        }

    # --- Global Graph (M3.5-001): unified, cross-topic ----------------------
    # Exposes the GlobalGraph purely as a read-model. These wrappers are
    # library methods only — they do NOT add any REST endpoint, so the public
    # API contract stays frozen. Ranking / recommendation live in M3.5-002/003.
    def get_global_graph(self) -> GlobalGraph:
        return self._global_graph

    def find_global_path(self, src_gid: str, tgt_gid: str) -> Optional[list[str]]:
        """Shortest path of global_ids between two entities, or None."""
        return self._global_graph.find_path(src_gid, tgt_gid)

    def global_neighbors(self, global_id: str, direction: str = "both") -> list[dict]:
        """Raw (unranked) neighbors of a global node. Returns the other node's
        global_id / local id / topic / type / name plus the relationship type
        and direction. No scoring or ordering — that is M3.5-002's job.
        """
        result: list[dict] = []
        for edge in self._global_graph.neighbors(global_id, direction):
            other_key = edge.target if edge.source == global_id else edge.source
            node = self._global_graph.get_node(other_key)
            result.append(
                {
                    "global_id": other_key,
                    "id": node.local_id if node else None,
                    "topic": node.topic if node else None,
                    "type": node.type if node else None,
                    "name": node.name if node else None,
                    "relationship": edge.type,
                    "direction": "outgoing" if edge.source == global_id else "incoming",
                }
            )
        return result

    def global_subgraph(self, roots: list[str], max_depth: int = 2) -> GlobalGraph:
        """Unified subgraph scoped to `roots` within `max_depth` BFS hops."""
        return self._global_graph.subgraph(roots, max_depth)

    # --- M4-002: Cross-topic Enrichment (projection layer) ----------------
    # Pure projections over the existing GlobalGraph. They add NO ranking, NO
    # new storage, NO new index, and never call the ExplorationEngine — so the
    # deterministic engine (M3.5-002) and the Schema Freeze (M3.5-000) stay
    # untouched. These are library methods only (no REST endpoint added), which
    # keeps the public API contract frozen.
    def cross_topic_related(self, global_id: str) -> list[dict]:
        """Direct cross-topic neighbors of `global_id`.

        Returns the other endpoint of every edge touching `global_id` whose
        owning topic differs from `global_id`'s own topic. Sourced from
        `global_neighbors` (raw adjacency over the one-time-built GlobalGraph)
        and filtered — no rebuild, no sort, no engine call. The existing
        `global_neighbors` is unchanged.

        Stable shape:
            [{"id","name","type","global_id","topic","relationship","direction"}]
        """
        node = self._global_graph.get_node(global_id)
        if node is None:
            return []
        source_topic = node.topic
        result: list[dict] = []
        for n in self.global_neighbors(global_id, "both"):
            if n.get("topic") != source_topic:
                result.append(
                    {
                        "id": n.get("id"),
                        "name": n.get("name"),
                        "type": n.get("type"),
                        "global_id": n.get("global_id"),
                        "topic": n.get("topic"),
                        "relationship": n.get("relationship"),
                        "direction": n.get("direction"),
                    }
                )
        return result

    def related_topics_for_entity(self, global_id: str) -> list[dict]:
        """Topics connected to `global_id` via direct cross-topic edges.

        Returns [{topic, cross_topic_edge_count}], each edge counted exactly
        once (an edge has exactly one endpoint in `global_id`'s topic, so it is
        never double-counted from the source side).
        """
        node = self._global_graph.get_node(global_id)
        if node is None:
            return []
        source_topic = node.topic
        counts: dict[str, int] = {}
        for n in self.global_neighbors(global_id, "both"):
            other_topic = n.get("topic")
            if other_topic is not None and other_topic != source_topic:
                counts[other_topic] = counts.get(other_topic, 0) + 1
        return [
            {"topic": t, "cross_topic_edge_count": c}
            for t, c in sorted(counts.items())
        ]

    def related_topics_for_topic(self, topic: str) -> list[dict]:
        """Topic-level cross-topic connection statistics for `topic`.

        Counts each cross-topic edge exactly once: every such edge touches
        `topic` at exactly one node, so iterating `topic`'s nodes and their
        global neighbors sums each edge a single time. No new topic index is
        created — it reads the existing GlobalGraph directly.
        """
        counts: dict[str, int] = {}
        for node in self._global_graph.all_nodes():
            if node.topic != topic:
                continue
            for n in self.global_neighbors(node.global_id, "both"):
                other_topic = n.get("topic")
                if other_topic is not None and other_topic != topic:
                    counts[other_topic] = counts.get(other_topic, 0) + 1
        return [
            {"topic": t, "cross_topic_edge_count": c}
            for t, c in sorted(counts.items())
        ]

    # --- Exploration Engine (M3.5-002): deterministic, explainable --------
    # These wrappers delegate to the ExplorationEngine and are library methods
    # only — they add NO REST endpoint, so the public API contract stays
    # frozen. Ranking / recommendation / AI are intentionally absent here.
    def get_exploration_engine(self) -> ExplorationEngine:
        return self._exploration_engine

    def explore_connections(
        self,
        src_gid: str,
        tgt_gid: str,
        max_depth: int = 4,
        max_paths: int = 16,
    ) -> dict:
        """Ranked, explainable candidate paths answering 'why are A and B
        related'. Returns a JSON-safe dict (the future M3.5-003 API/UI seam),
        with each path keeping relation type + direction and an `explanation`
        field."""
        return self._exploration_engine.find_connections(
            src_gid, tgt_gid, max_depth, max_paths
        ).to_dict()

    def explore_from(self, gid: str, max_depth: int = 2, limit: int = 20) -> list[dict]:
        """Ranked reachable nodes from `gid` (single + multi-hop exploration),
        each with its best connecting path and an explanation seam."""
        return [
            n.to_dict() for n in self._exploration_engine.explore(gid, max_depth, limit)
        ]

    def get_exploration_view(
        self, topic: str, main_id: Optional[str] = None
    ) -> dict:
        data = self.get_topic_data(topic)
        if not data:
            return {"main_entity": {}, "related_entities": []}
        return build_exploration_view(
            data.get("entities", []), data.get("relationships", []), main_id
        )

    # --- Timeline (delegates to timeline index) --------------------------
    def get_timeline_index(self, topic: str) -> list[dict]:
        idx = self._timelines.get(topic)
        return idx.get_all() if idx else []

    # --- Search (delegates to search provider) ---------------------------
    def search(self, q: str) -> list[dict]:
        return self._search_provider.search(q)

    def get_search_index(self) -> list[dict]:
        return self._search_index
