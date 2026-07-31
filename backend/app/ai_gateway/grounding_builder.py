"""Grounded Context Builder (M11-2).

Read-only adapter over `KnowledgeService`. Given a list of `context_global_ids`
(the entities/events the user is currently exploring) and a `question`, it
assembles a `GroundingResult` of **facts** (strings for the [ALLOWED FACTS]
prompt section) and **citations** (structured provenance for the validator).

Hard invariants (ADR-0003 + freeze):
- READ ONLY: it only *reads* KnowledgeService. It never mutates the graph,
  entities, relationships, timeline, or any exploration state.
- NO provider / LLM call: it prepares context, it does not answer.
- NO state storage: it is a pure function of (context_global_ids, question).
- It MUST exercise the four read methods the governance gate requires:
  find_by_global_id, global_neighbors, global_subgraph, get_timeline_index.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Sequence

from .citation_model import Citation, RelationshipPair

# M36.0: hard cap on how many NEW second-hop entities expand_context() may add.
# Prevents context explosion on dense hubs (e.g. an empire node with dozens of
# edges) while still covering multi-civilization chains such as
# Buddhism -> Silk Road -> China.
MAX_EXPANDED_ENTITIES = 25


# ---------------------------------------------------------------------------
# M74 Phase2 (Step 2): deterministic relationship-pair (A->B) resolution.
# Independent resolver — parsing logic lives HERE, not scattered across the
# GroundingBuilder. Grounding Gate semantics: any unresolvable side returns
# None (REJECT) — never guess, never auto-complete, never degrade.
# ---------------------------------------------------------------------------

class RelationshipResolver:
    """Parse an EvidenceClaim "A->B" subject_id into a structured pair.

    Two-format id resolution per side (deterministic, not guessing):
      1) local id  -> global id (KnowledgeService.find_global_id)
      2) raw global id        (KnowledgeService.find_by_global_id — the
                               subject_id may already BE a global id, e.g.
                               "religion-buddhism->silk_road:silk_road")
    Any side that resolves in neither format -> None (Grounding Gate Reject).

    `relationship` is the ACTUAL graph edge type (via global_neighbors) when
    the two global ids share an edge; None when no edge exists — never guessed.
    """

    def __init__(self, knowledge_service):
        self._ks = knowledge_service

    def parse(self, subject_id) -> "RelationshipPair | None":
        """Resolve a raw "A->B" subject_id. None on ANY failure (Reject)."""
        if not isinstance(subject_id, str):
            return None
        text = subject_id.strip()
        if "->" not in text:
            return None  # not a pair — caller should use the entity path
        a_raw, b_raw = (p.strip() for p in text.split("->", 1))
        a_gid = self._resolve_id(a_raw)
        b_gid = self._resolve_id(b_raw)
        if not a_gid or not b_gid:
            return None  # unresolvable side -> Grounding Gate Reject
        return RelationshipPair(
            subject=a_raw,
            object=b_raw,
            subject_global_id=a_gid,
            object_global_id=b_gid,
            relationship=self._find_edge(a_gid, b_gid),
            resolved=True,
        )

    def _resolve_id(self, raw: str) -> "str | None":
        """local id -> gid, else verify raw is itself a valid global id."""
        if not raw:
            return None
        gid = self._ks.find_global_id(raw)
        if gid:
            return gid
        ref = self._ks.find_by_global_id(raw)
        return raw if ref is not None else None

    def _find_edge(self, src_gid: str, tgt_gid: str) -> "str | None":
        """Actual relationship type on the frozen KG edge (bidirectional)."""
        try:
            for nbr in self._ks.global_neighbors(src_gid, direction="both"):
                if nbr.get("global_id") == tgt_gid:
                    rel = nbr.get("relationship")
                    if isinstance(rel, str) and rel:
                        return rel
        except Exception:
            pass
        return None


def timeline_period_label(entry: dict) -> str:
    """Normalize a timeline index entry to its human period label.

    Mirrors KnowledgeService.get_timeline_index output (already normalized by
    TimelineIndex): `period` is a string label, `date` carries the raw object.
    """
    if not isinstance(entry, dict):
        return "unknown"
    period = entry.get("period")
    if isinstance(period, dict):
        return str(period.get("label") or period.get("value") or "unknown")
    return str(period or "unknown")


def timeline_citation_id(topic: str, period_label: str) -> str:
    """Deterministic synthetic global_id for a timeline entry.

    Timeline entries have no native global_id (they live in the topic's
    timeline index, not the GlobalGraph), so grounding + validation agree on
    this single scheme. Both grounding_builder and response_validator import
    it so the two never diverge.
    """
    safe = (period_label or "unknown").replace("/", "_").replace(" ", "_")
    return "%s:timeline:%s" % (topic, safe)


@dataclass
class GroundingResult:
    facts: List[str] = field(default_factory=list)
    citations: List[Citation] = field(default_factory=list)
    # M36.0 (additive): the full set of global_ids the grounding actually
    # covers — context roots PLUS the 1-hop bridge entities discovered by
    # expand_context(). answer_service passes this to the (frozen)
    # ResponseValidator as the validation context so citations of legitimate
    # 2-hop entities (root -> bridge -> second-hop) resolve, because the
    # validator accepts context ∪ its 1-hop neighbors.
    expanded_global_ids: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "facts": list(self.facts),
            "citations": [c.to_dict() for c in self.citations],
            "expanded_global_ids": list(self.expanded_global_ids),
        }


class GroundingBuilder:
    """Assemble grounded facts + citations from the deterministic graph."""

    def __init__(self, knowledge_service):
        self._ks = knowledge_service

    def expand_context(self, roots: Sequence[str]) -> dict:
        """M36.0: read-only 2-hop context expansion.

        Starting from `roots`, walks 1 hop (bridge entities, already covered by
        build()'s neighbor facts) and then 1 more hop (second-hop entities such
        as Buddhism -> Silk Road -> China) via `global_neighbors` only.

        Guarantees:
        - READ ONLY: only `global_neighbors` lookups; no graph/schema mutation.
        - max depth = 2 (hard-coded; no deeper traversal is possible here).
        - de-duplicated: an entity is emitted at most once, and never when it
          is itself a root or a bridge.
        - bounded: at most MAX_EXPANDED_ENTITIES second-hop entities, so a
          dense hub cannot explode the prompt context.
        - never raises on unknown/bad ids: they are skipped silently.

        Returns {"bridge_ids": [...], "second_hop": [
            {"global_id", "name", "relationship", "direction",
             "bridge_global_id", "bridge_name"}]}.
        """
        root_ids = [g for g in (roots or []) if isinstance(g, str)]
        seen: set = set(root_ids)
        bridge_ids: List[str] = []
        bridge_names: dict = {}

        # Hop 1: collect bridge entities (deduplicated, order-stable).
        for gid in root_ids:
            try:
                neighbors = self._ks.global_neighbors(gid, direction="both")
            except Exception:
                continue
            for nbr in neighbors:
                other_gid = nbr.get("global_id")
                if not other_gid or other_gid in seen:
                    continue
                seen.add(other_gid)
                bridge_ids.append(other_gid)
                bridge_names[other_gid] = nbr.get("name") or other_gid

        # Hop 2: expand each bridge once, under the hard entity cap.
        second_hop: List[dict] = []
        for bgid in bridge_ids:
            if len(second_hop) >= MAX_EXPANDED_ENTITIES:
                break
            try:
                neighbors = self._ks.global_neighbors(bgid, direction="both")
            except Exception:
                continue
            for nbr in neighbors:
                other_gid = nbr.get("global_id")
                if not other_gid or other_gid in seen:
                    continue
                seen.add(other_gid)
                second_hop.append(
                    {
                        "global_id": other_gid,
                        "name": nbr.get("name") or other_gid,
                        "relationship": nbr.get("relationship", "related_to"),
                        "direction": nbr.get("direction", "both"),
                        "bridge_global_id": bgid,
                        "bridge_name": bridge_names.get(bgid, bgid),
                    }
                )
                if len(second_hop) >= MAX_EXPANDED_ENTITIES:
                    break

        return {"bridge_ids": bridge_ids, "second_hop": second_hop}

    def build(
        self, context_global_ids: Sequence[str], question: str
    ) -> GroundingResult:
        """Pure read-only projection of the context entities into facts.

        Unknown global_ids are skipped silently (the AI simply won't be grounded
        on them). We never invent facts, never raise on bad input.
        """
        result = GroundingResult()
        roots = [g for g in (context_global_ids or []) if isinstance(g, str)]
        if not roots:
            return result

        seen_topics: set = set()

        # --- REQUIRED READ #1: per-entity lookup -> entity facts -----------
        for gid in roots:
            resolved = self._ks.find_by_global_id(gid)
            if resolved is None:
                continue
            topic, _local_id, entity = resolved
            seen_topics.add(topic)
            if not isinstance(entity, dict):
                continue
            name = entity.get("name") or _local_id
            etype = entity.get("type", "")
            desc = entity.get("description") or ""
            if isinstance(desc, str) and desc:
                result.facts.append("%s (%s) — %s" % (name, etype, desc))
            else:
                result.facts.append("%s (%s)" % (name, etype))
            result.citations.append(Citation(global_id=gid, kind="entity", label=name))

            # --- REQUIRED READ #2: neighbors -> relationship facts ----------
            for nbr in self._ks.global_neighbors(gid, direction="both"):
                other_gid = nbr.get("global_id")
                if not other_gid or other_gid == gid:
                    continue
                rel_type = nbr.get("relationship", "related_to")
                other_name = nbr.get("name") or other_gid
                direction = nbr.get("direction", "both")
                if direction == "outgoing":
                    fact = "%s —[%s]→ %s" % (name, rel_type, other_name)
                elif direction == "incoming":
                    fact = "%s ←[%s]— %s" % (other_name, rel_type, name)
                else:
                    fact = "%s —[%s]— %s" % (name, rel_type, other_name)
                result.facts.append(fact)
                # Relationship citation: provenance is the neighbor node; the
                # label carries the exact relationship type so the validator can
                # confirm a real edge from the context entity.
                result.citations.append(
                    Citation(global_id=other_gid, kind="relationship", label=rel_type)
                )

        # --- M36.0: 2-hop context expansion (additive; read-only) ----------
        # Surfaces multi-civilization chains (Buddhism -> Silk Road -> China)
        # as explicit facts so the AI can ground cross-topic explanations.
        expansion = self.expand_context(roots)
        for item in expansion["second_hop"]:
            rel_type = item["relationship"]
            if item["direction"] == "outgoing":
                fact = "%s —[%s]→ %s (2-hop via context)" % (
                    item["bridge_name"], rel_type, item["name"],
                )
            elif item["direction"] == "incoming":
                fact = "%s ←[%s]— %s (2-hop via context)" % (
                    item["name"], rel_type, item["bridge_name"],
                )
            else:
                fact = "%s —[%s]— %s (2-hop via context)" % (
                    item["bridge_name"], rel_type, item["name"],
                )
            result.facts.append(fact)
            result.citations.append(
                Citation(
                    global_id=item["global_id"], kind="entity", label=item["name"]
                )
            )
        # Validation scope = roots + bridges: the (frozen) ResponseValidator
        # accepts context ∪ its 1-hop neighbors, so including the bridges makes
        # every legitimate second-hop citation resolvable without touching it.
        result.expanded_global_ids = list(roots) + list(expansion["bridge_ids"])

        # --- REQUIRED READ #3: scoped subgraph (neighborhood size) ---------
        try:
            subgraph = self._ks.global_subgraph(roots, max_depth=2)
            node_count = getattr(subgraph, "node_count", 0) or 0
        except Exception:
            node_count = 0
        if node_count:
            result.facts.append(
                "Your exploration context spans %d interconnected entities "
                "within 2 hops." % node_count
            )

        # --- REQUIRED READ #4: timeline index, per referenced topic --------
        for topic in seen_topics:
            for entry in self._ks.get_timeline_index(topic):
                period_label = timeline_period_label(entry)
                if not period_label or period_label == "unknown":
                    continue
                event = entry.get("event")
                if event:
                    result.facts.append(
                        "Timeline (%s): %s — %s" % (topic, period_label, event)
                    )
                else:
                    result.facts.append("Timeline (%s): %s" % (topic, period_label))
                label = (
                    "%s — %s" % (period_label, event) if event else period_label
                )
                result.citations.append(
                    Citation(
                        global_id=timeline_citation_id(topic, period_label),
                        kind="timeline",
                        label=label,
                    )
                )

        return result
