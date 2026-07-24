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

from .citation_model import Citation


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

    def to_dict(self) -> dict:
        return {
            "facts": list(self.facts),
            "citations": [c.to_dict() for c in self.citations],
        }


class GroundingBuilder:
    """Assemble grounded facts + citations from the deterministic graph."""

    def __init__(self, knowledge_service):
        self._ks = knowledge_service

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
