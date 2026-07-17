"""Deterministic Exploration Engine for the Knowledge Layer (M3.5-002).

WHAT THIS IS
------------
The Exploration Engine answers ONE question for a human explorer:

    "In the interconnected historical world, *why* are these two entities
     related, and what connects them?"

It is deliberately NOT:
  * a Search engine  — it does not match free text to entities;
  * a Recommender    — it does not model "what the user might like";
  * an AI / LLM       — every score is a fixed, explainable formula over
                        graph structure + curated historical time fields.

On top of the M3.5-001 `GlobalGraph` (the unified, cross-topic adjacency) it
adds *deterministic scoring* and *explainable* output. The graph itself stays
pure structure (per global_graph.py's contract); ranking lives here only.

DESIGN PRINCIPLES (from M3.5-000 / M3.5-002 brief)
-------------------------------------------------
1. Relationship meaning matters more than hop count. Two entities joined by a
   strong semantic link (caused / influenced / ruled) outrank a longer chain of
   weak links (located_at / related_to). We do NOT naively return "the shortest
   path" — we enumerate candidate paths and *score* them.
2. Temporal coherence: entities that were contemporary (overlapping or close
   time ranges) make a more meaningful connection than entities centuries apart.
3. Entity importance: some nodes are more central to the historical narrative
   (high graph degree + high-type salience). Used as a mild tie-breaker, never
   the dominant term.
4. Path simplicity: rewarded, but with diminishing returns, so a 2-hop story of
   strong links can beat a 3-hop chain of weak ones — and a 1-hop strong link
   beats a 2-hop weak one.
5. Every result is explainable: each path keeps its per-step relation type +
   direction, and a text `explanation` seam is preserved for the future
   API / UI (M3.5-003 / 004) without changing today's contract.

No AI / GIS / Neo4j / third-party graph library — pure stdlib, fully additive.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .global_graph import GlobalGraph
from .registry import KnowledgeRegistry


# ---------------------------------------------------------------------------
# Static, explainable scoring configuration (NOT learned, NOT AI)
# ---------------------------------------------------------------------------

# Entity-type salience: how central a kind of entity is to the narrative.
# Static, curated, centralized here so tuning is one place. `Idea` is included
# defensively for the M3.5-000 freeze plan; absent from current data, harmless.
TYPE_IMPORTANCE: dict[str, float] = {
    "Civilization": 1.00,
    "Event": 0.95,
    "Person": 0.90,
    "Religion": 0.80,
    "Idea": 0.80,
    "Technology": 0.70,
    "Location": 0.60,
    "Time Period": 0.60,
}

# Relationship "meaning" weight: how story-relevant a link type is when
# explaining a connection. Covers all 18 frozen M3.5-000 relationship types
# (the 15 inherited + additive inherited/conquered/spread for the JT-2
# inheritance/conquest/diffusion narrative). If a relationship ever carries a
# non-null `weight` field (schema-reserved), that explicit value overrides
# this map.
RELATIONSHIP_MEANING: dict[str, float] = {
    "caused": 1.00,
    "influenced": 0.95,
    "ruled": 0.90,
    "participated_in": 0.90,
    "conquered": 0.90,
    "invented": 0.85,
    "inherited": 0.80,
    "discovered": 0.80,
    "traded_with": 0.80,
    "spread": 0.75,
    "practiced": 0.75,
    "spoke": 0.70,
    "part_of": 0.70,
    "contemporary_with": 0.65,
    "before": 0.60,
    "after": 0.60,
    "located_at": 0.50,
    "related_to": 0.40,
}

# Final blended-score weights (sum to 1.0). Relationship meaning leads;
# simplicity is the smallest term so we never reward "shortest == best".
W_RELATIONSHIP = 0.35
W_TEMPORAL = 0.25
W_IMPORTANCE = 0.20
W_SIMPLICITY = 0.20

# Temporal normalization: a gap of this many years halves coherence (1.0 -> 0.5).
TEMPORAL_HALF_LIFE = 500.0


# ---------------------------------------------------------------------------
# Result structures (explainable, future-API-ready)
# ---------------------------------------------------------------------------

@dataclass
class PathStep:
    """One edge in an exploration path. Direction is relative to traversal."""
    from_global_id: str
    to_global_id: str
    relationship: str
    direction: str            # 'outgoing' | 'incoming'
    weight: float             # effective relationship-meaning weight used

    def to_dict(self) -> dict:
        return {
            "from_global_id": self.from_global_id,
            "to_global_id": self.to_global_id,
            "relationship": self.relationship,
            "direction": self.direction,
            "weight": self.weight,
        }


@dataclass
class PathCandidate:
    """A ranked candidate path connecting source -> target."""
    nodes: list[str]                    # global_ids, source .. target
    steps: list[PathStep]
    score: float
    score_breakdown: dict               # the four explainable components
    explanation: str                    # human-readable "why related" seam

    def to_dict(self) -> dict:
        return {
            "nodes": list(self.nodes),
            "steps": [s.to_dict() for s in self.steps],
            "score": self.score,
            "score_breakdown": dict(self.score_breakdown),
            "explanation": self.explanation,
        }


@dataclass
class ExploredNode:
    """One reachable node from an exploration origin, with its best path."""
    global_id: str
    depth: int
    path: list[str]
    steps: list[PathStep]
    score: float
    score_breakdown: dict
    explanation: str

    def to_dict(self) -> dict:
        return {
            "global_id": self.global_id,
            "depth": self.depth,
            "path": list(self.path),
            "steps": [s.to_dict() for s in self.steps],
            "score": self.score,
            "score_breakdown": dict(self.score_breakdown),
            "explanation": self.explanation,
        }


@dataclass
class ExplorationResult:
    source: str
    target: Optional[str]
    paths: list = field(default_factory=list)   # list[PathCandidate]
    explanation: str = ""

    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "target": self.target,
            "paths": [p.to_dict() for p in self.paths],
            "explanation": self.explanation,
        }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _rep_year(entity: Optional[dict]) -> Optional[int]:
    """A single representative year for an entity (negative = BCE).

    Prefers `start_date.value`, falls back to `end_date.value`; both are the
    v2 structured-time objects carried by the data. Returns None if unknown.
    """
    if not isinstance(entity, dict):
        return None
    for key in ("start_date", "end_date"):
        v = entity.get(key)
        if isinstance(v, dict) and isinstance(v.get("value"), int):
            return int(v["value"])
    return None


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class ExplorationEngine:
    """Deterministic, explainable path discovery over the GlobalGraph."""

    def __init__(
        self,
        global_graph: GlobalGraph,
        registry: KnowledgeRegistry,
        topic_datasets: list[tuple[str, dict]],
    ):
        self._gg = global_graph
        self._registry = registry
        # (src_gid, tgt_gid, type) -> raw relationship dict, for explicit weights.
        self._rel_lookup = self._build_rel_lookup(topic_datasets)
        # Per-entity importance, computed once from type + graph centrality.
        self._importance = self._build_importance()

    # --- indexing ----------------------------------------------------------
    def _build_rel_lookup(
        self, topic_datasets: list[tuple[str, dict]]
    ) -> dict[tuple[str, str, str], dict]:
        lookup: dict[tuple[str, str, str], dict] = {}
        for topic, data in topic_datasets:
            if not isinstance(data, dict):
                continue
            for rel in data.get("relationships") or []:
                if not isinstance(rel, dict):
                    continue
                src_ref = self._registry.resolve(rel.get("source"))
                tgt_ref = self._registry.resolve(rel.get("target"))
                if src_ref is None or tgt_ref is None:
                    continue
                src_gid = self._global_key(src_ref.topic, src_ref.local_id)
                tgt_gid = self._global_key(tgt_ref.topic, tgt_ref.local_id)
                lookup[(src_gid, tgt_gid, rel.get("type", "related_to"))] = rel
        return lookup

    def _global_key(self, topic: str, local_id: str) -> str:
        ent = self._registry.get_entity(topic, local_id) or {}
        gid = ent.get("global_id")
        return gid if gid else f"{topic}:{local_id}"

    def _build_importance(self) -> dict[str, float]:
        imp: dict[str, float] = {}
        for node in self._gg.all_nodes():
            type_w = TYPE_IMPORTANCE.get(node.type, 0.6)
            degree = len(self._gg.neighbors(node.global_id, "both"))
            # Centrality: bounded [0,1), grows with connectivity, saturates.
            centrality = 1.0 - 1.0 / (1.0 + degree)
            imp[node.global_id] = 0.6 * type_w + 0.4 * centrality
        return imp

    # --- relationship + temporal scoring ----------------------------------
    def _rel_weight(self, rel: Optional[dict], rel_type: str) -> float:
        if isinstance(rel, dict) and isinstance(rel.get("weight"), (int, float)):
            return float(rel["weight"])
        return RELATIONSHIP_MEANING.get(rel_type, 0.4)

    def _temporal_coherence(self, a: Optional[dict], b: Optional[dict]) -> float:
        """1.0 = overlapping/contemporary; decays with time gap (half-life 500y)."""
        ya, yb = _rep_year(a), _rep_year(b)
        if ya is None and yb is None:
            return 0.5                      # both unknown -> neutral
        if ya is None or yb is None:
            return 0.6                      # one known -> slight positive
        gap = abs(ya - yb)
        return 1.0 / (1.0 + gap / TEMPORAL_HALF_LIFE)

    # --- step / path construction -----------------------------------------
    def _find_edge(self, a: str, b: str):
        for e in self._gg.neighbors(a, "both"):
            other = e.target if e.target != a else e.source
            if other == b:
                return e
        return None

    def _build_steps(self, path: list[str]) -> list[PathStep]:
        steps: list[PathStep] = []
        for i in range(len(path) - 1):
            a, b = path[i], path[i + 1]
            edge = self._find_edge(a, b)
            if edge is None:
                continue
            rel_type = edge.type
            direction = "outgoing" if edge.source == a else "incoming"
            rel_dict = (
                self._rel_lookup.get((edge.source, edge.target, rel_type))
                or self._rel_lookup.get((edge.target, edge.source, rel_type))
            )
            steps.append(
                PathStep(
                    from_global_id=a,
                    to_global_id=b,
                    relationship=rel_type,
                    direction=direction,
                    weight=self._rel_weight(rel_dict, rel_type),
                )
            )
        return steps

    def _score_path(self, path: list[str]) -> tuple[float, dict, list[PathStep]]:
        steps = self._build_steps(path)
        hops = len(steps)
        rel_scores = [s.weight for s in steps]
        rel_mean = sum(rel_scores) / len(rel_scores) if rel_scores else 0.0

        temp_scores = []
        for s in steps:
            a = self._gg.get_node(s.from_global_id)
            b = self._gg.get_node(s.to_global_id)
            temp_scores.append(
                self._temporal_coherence(a.entity if a else None, b.entity if b else None)
            )
        temp_mean = sum(temp_scores) / len(temp_scores) if temp_scores else 0.5

        imp_scores = [self._importance.get(gid, 0.6) for gid in path]
        imp_mean = sum(imp_scores) / len(imp_scores) if imp_scores else 0.6

        # Path simplicity with diminishing returns: 1 hop -> 1.0, 2 -> 0.71,
        # 3 -> 0.56, ... never the dominant term.
        simplicity = 1.0 / (1.0 + 0.4 * max(0, hops - 1))

        score = (
            W_RELATIONSHIP * rel_mean
            + W_TEMPORAL * temp_mean
            + W_IMPORTANCE * imp_mean
            + W_SIMPLICITY * simplicity
        )
        breakdown = {
            "relationship_meaning": round(rel_mean, 4),
            "temporal_coherence": round(temp_mean, 4),
            "entity_importance": round(imp_mean, 4),
            "path_simplicity": round(simplicity, 4),
            "hops": hops,
        }
        return round(score, 4), breakdown, steps

    # --- path enumeration (undirected, simple, bounded) -------------------
    def _enumerate_paths(
        self, src: str, tgt: str, max_depth: int, max_paths: int
    ) -> list[list[str]]:
        if self._gg.get_node(src) is None or self._gg.get_node(tgt) is None:
            return []
        if src == tgt:
            return [[src]]
        results: list[list[str]] = []
        # LIFO stack; candidates sorted for deterministic traversal order.
        stack: list[tuple[str, list[str]]] = [(src, [src])]
        while stack and len(results) < max_paths:
            node, path = stack.pop()
            if node == tgt:
                results.append(path)
                continue
            if len(path) >= max_depth + 1:
                continue
            # Deterministic neighbor set (the "other" endpoint of each edge).
            others = sorted(
                {
                    (e.target if e.target != node else e.source)
                    for e in self._gg.neighbors(node, "both")
                }
            )
            for nxt in others:
                if nxt in path:
                    continue
                stack.append((nxt, path + [nxt]))
        return results

    # --- public: connect two entities -------------------------------------
    def find_connections(
        self,
        src_gid: str,
        tgt_gid: str,
        max_depth: int = 4,
        max_paths: int = 16,
    ) -> ExplorationResult:
        """Ranked candidate paths explaining why `src_gid` relates to `tgt_gid`."""
        paths = self._enumerate_paths(src_gid, tgt_gid, max_depth, max_paths)
        candidates: list[PathCandidate] = []
        for p in paths:
            score, breakdown, steps = self._score_path(p)
            candidates.append(
                PathCandidate(
                    nodes=p,
                    steps=steps,
                    score=score,
                    score_breakdown=breakdown,
                    explanation=self._explain_path(steps),
                )
            )
        # Rank: higher score first; tie-break by fewer hops, then stable string.
        candidates.sort(
            key=lambda c: (-c.score, c.score_breakdown["hops"], "->".join(c.nodes))
        )
        return ExplorationResult(
            source=src_gid,
            target=tgt_gid,
            paths=candidates,
            explanation=self._overall_explanation(candidates),
        )

    # --- public: explore outward from one entity --------------------------
    def explore(
        self, gid: str, max_depth: int = 2, limit: int = 20
    ) -> list[ExploredNode]:
        """Ranked reachable nodes from `gid` (single-hop + multi-hop), each with
        its best connecting path and an explanation seam."""
        origin = self._gg.get_node(gid)
        if origin is None:
            return []
        reached = self._gg.subgraph([gid], max_depth).all_nodes()
        results: list[ExploredNode] = []
        for node in reached:
            if node.global_id == gid:
                continue
            path = self._gg.find_path(gid, node.global_id)
            if not path:
                continue
            score, breakdown, steps = self._score_path(path)
            results.append(
                ExploredNode(
                    global_id=node.global_id,
                    depth=len(path) - 1,
                    path=path,
                    steps=steps,
                    score=score,
                    score_breakdown=breakdown,
                    explanation=self._explain_path(steps),
                )
            )
        results.sort(
            key=lambda r: (-r.score, r.depth, "->".join(r.path))
        )
        return results[:limit]

    # --- explanation text (the future API/UI seam) ------------------------
    def _explain_path(self, steps: list[PathStep]) -> str:
        if not steps:
            return "No connecting relationship."
        parts: list[str] = []
        first = self._gg.get_node(steps[0].from_global_id)
        if first:
            parts.append(f"{first.type} '{first.name}'")
        for s in steps:
            parts.append(f"—[{s.relationship} {s.direction}]→")
            n = self._gg.get_node(s.to_global_id)
            if n:
                parts.append(f"{n.type} '{n.name}'")
        return " ".join(parts)

    def _overall_explanation(self, candidates: list[PathCandidate]) -> str:
        if not candidates:
            return "No connection found between the two entities in the graph."
        best = candidates[0]
        return (
            f"{len(candidates)} connection(s) found; best score {best.score}. "
            f"Top path: {best.explanation}"
        )
