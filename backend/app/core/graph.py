"""Graph + traversal capabilities for the Knowledge Layer (M3-001).

`DirectedGraph` is a small, dependency-free adjacency structure (out/in edges,
BFS neighbors, shortest path, orphan + cycle detection). `KnowledgeGraph`
builds one `DirectedGraph` per topic from its relationships, resolving each
endpoint to a local id (local id or `topic:local_id` global_id form). Dangling
endpoints are skipped from the graph — dangling references are a validation
concern, not a graph concern.

Traversal is intentionally kept in the Knowledge Layer: API handlers only
project the results, they never re-implement adjacency logic.
"""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Optional


@dataclass
class Edge:
    source: str
    target: str
    type: str


class DirectedGraph:
    def __init__(self) -> None:
        self.out: dict[str, list[Edge]] = defaultdict(list)
        self.in_: dict[str, list[Edge]] = defaultdict(list)
        self.nodes: set[str] = set()

    def add_edge(self, edge: Edge) -> None:
        self.out[edge.source].append(edge)
        self.in_[edge.target].append(edge)
        self.nodes.add(edge.source)
        self.nodes.add(edge.target)

    def neighbors(self, node: str, direction: str = "both") -> list[Edge]:
        """Edges touching `node`. direction: 'outgoing' | 'incoming' | 'both'."""
        result: list[Edge] = []
        if direction in ("outgoing", "both"):
            result.extend(self.out.get(node, []))
        if direction in ("incoming", "both"):
            result.extend(self.in_.get(node, []))
        return result

    def bfs(self, start: str, max_depth: int = 2) -> list[tuple[int, str]]:
        """Breadth-first traversal returning (depth, node) pairs."""
        if start not in self.nodes:
            return []
        seen: set[str] = {start}
        order: list[tuple[int, str]] = [(0, start)]
        queue: deque[tuple[int, str]] = deque([(0, start)])
        while queue:
            depth, node = queue.popleft()
            if depth >= max_depth:
                continue
            for edge in self.out.get(node, []) + self.in_.get(node, []):
                nxt = edge.target if edge.source == node else edge.source
                if nxt not in seen:
                    seen.add(nxt)
                    order.append((depth + 1, nxt))
                    queue.append((depth + 1, nxt))
        return order

    def find_path(self, src: str, tgt: str) -> Optional[list[str]]:
        """Shortest path (by edges) from src to tgt, or None."""
        if src not in self.nodes or tgt not in self.nodes:
            return None
        if src == tgt:
            return [src]
        prev: dict[str, Optional[str]] = {src: None}
        queue: deque[str] = deque([src])
        while queue:
            node = queue.popleft()
            for edge in self.out.get(node, []) + self.in_.get(node, []):
                nxt = edge.target if edge.source == node else edge.source
                if nxt not in prev:
                    prev[nxt] = node
                    if nxt == tgt:
                        path = [tgt]
                        cur: Optional[str] = node
                        while cur is not None:
                            path.append(cur)
                            cur = prev[cur]
                        return list(reversed(path))
                    queue.append(nxt)
        return None

    def orphans(self) -> list[str]:
        return [n for n in self.nodes if not self.out[n] and not self.in_[n]]

    def cycles(self) -> list[list[str]]:
        """De-duplicated directed cycles as node lists (each ends where starts)."""
        WHITE, GRAY, BLACK = 0, 1, 2
        color: dict[str, int] = {n: WHITE for n in self.nodes}
        stack: list[str] = []
        raw: list[list[str]] = []

        def dfs(u: str) -> None:
            color[u] = GRAY
            stack.append(u)
            for edge in self.out.get(u, []):
                v = edge.target
                if color.get(v, WHITE) == GRAY:
                    idx = stack.index(v)
                    raw.append(stack[idx:] + [v])
                elif color.get(v, WHITE) == WHITE:
                    dfs(v)
            stack.pop()
            color[u] = BLACK

        for n in list(self.nodes):
            if color[n] == WHITE:
                dfs(n)

        seen: set[frozenset[str]] = set()
        unique: list[list[str]] = []
        for cyc in raw:
            key = frozenset(cyc)
            if key not in seen:
                seen.add(key)
                unique.append(cyc)
        return unique


class KnowledgeGraph:
    """One `DirectedGraph` per topic, built from relationships."""

    def __init__(self, topic_datasets: list[tuple[str, dict]]):
        self._graphs: dict[str, DirectedGraph] = {}
        self._build(topic_datasets)

    def _build(self, topic_datasets: list[tuple[str, dict]]) -> None:
        for topic, data in topic_datasets:
            if not isinstance(data, dict):
                data = {}
            g = DirectedGraph()
            entities = [e for e in (data.get("entities") or []) if isinstance(e, dict)]
            id_set = {e.get("id") for e in entities if e.get("id")}
            gid_map = {
                e.get("global_id"): e.get("id")
                for e in entities
                if e.get("global_id")
            }

            def _resolve(ref):
                if ref is None:
                    return None
                if ref in id_set:
                    return ref
                return gid_map.get(ref)  # global_id of an entity in this topic

            for eid in id_set:
                g.nodes.add(eid)
            for rel in data.get("relationships") or []:
                if not isinstance(rel, dict):
                    continue
                src = _resolve(rel.get("source"))
                tgt = _resolve(rel.get("target"))
                if src is None or tgt is None:
                    # Dangling endpoint: a validation concern, not graphed.
                    continue
                g.add_edge(Edge(src, tgt, rel.get("type", "related_to")))
            self._graphs[topic] = g

    def get_graph(self, topic: str) -> DirectedGraph:
        return self._graphs.get(topic, DirectedGraph())
