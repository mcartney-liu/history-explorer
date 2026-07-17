"""Search index + provider for the Knowledge Layer (M3-001).

`build_search_index` derives the flat search records from the `KnowledgeRegistry`
(not from raw JSON — the registry is the single read-model). `SearchProvider`
wraps that index and ranks queries. The provider depends only on the index, so
it is fully decoupled from the storage layer and from the rest of the Knowledge
Core: it can be swapped for a different ranking strategy without touching
anything else.
"""

from __future__ import annotations

from typing import Any, Optional


def _time_label(value: Any) -> Optional[str]:
    """Extract a human-readable label from a v2 TimeValue object, else None."""
    if isinstance(value, dict):
        return value.get("label")
    return None


_RANK_NAME = {0: "exact", 1: "alias", 2: "contains"}


def _match_rank(entity: dict, q_norm: str) -> Optional[int]:
    """Score an entity against a normalized query.

    0 = exact (id or name), 1 = alias exact, 2 = contains (id/name/alias/
    description). Returns None when there is no match. Lower rank = better,
    so results sort best-first deterministically. No AI / fuzzy logic.
    """
    eid = (entity.get("id") or "").lower()
    name = (entity.get("name") or "").lower()
    aliases = [str(a).lower() for a in (entity.get("aliases") or [])]
    desc = (entity.get("description") or "").lower()

    if eid == q_norm or name == q_norm:
        return 0
    if q_norm in aliases:
        return 1
    if (
        q_norm in eid
        or q_norm in name
        or q_norm in desc
        or any(q_norm in a for a in aliases)
    ):
        return 2
    return None


def build_search_index(registry) -> list[dict]:
    """Build the shared, read-only search index from the registry.

    Each record carries exactly the fields needed for search ranking and the
    search-result cards: id, global_id, name, aliases, type, topic,
    description, plus optional display enrichment (start/end/location).
    """
    records: list[dict] = []
    for topic in registry.list_topics():
        for ent in registry.get_entities(topic).values():
            records.append(
                {
                    "id": ent.get("id"),
                    "global_id": ent.get("global_id"),
                    "name": ent.get("name", ""),
                    "aliases": ent.get("aliases") or [],
                    "type": ent.get("type", ""),
                    "topic": topic,
                    "description": ent.get("description", ""),
                    "start": _time_label(ent.get("start_date")),
                    "end": _time_label(ent.get("end_date")),
                    # Display location: only Location entities carry a human
                    # `region` string; other entity types reference a location
                    # by id, which we deliberately don't surface on a card.
                    "location": ent.get("region"),
                }
            )
    return records


class SearchProvider:
    """Ranks queries against a prebuilt search index (no filesystem, no DB)."""

    def __init__(self, search_index: list[dict]):
        self._index = search_index

    def search(self, q: str) -> list[dict]:
        """Return ranked result items (id/name/type/topic/description/match/
        start/end/location). Empty query -> empty list."""
        query = (q or "").strip()
        if not query:
            return []
        q_norm = query.lower()
        scored: list[tuple[int, str, dict]] = []
        for rec in self._index:
            rank = _match_rank(rec, q_norm)
            if rank is None:
                continue
            scored.append(
                (
                    rank,
                    (rec.get("name") or "").lower(),
                    {
                        "id": rec["id"],
                        "name": rec["name"],
                        "type": rec["type"],
                        "topic": rec["topic"],
                        "description": rec["description"],
                        "match": _RANK_NAME[rank],
                        # Additive display enrichment. Values are None when the
                        # underlying entity has no structured time / region, so
                        # the frontend can gracefully ignore missing fields.
                        "start": rec["start"],
                        "end": rec["end"],
                        "location": rec["location"],
                    },
                )
            )

        scored.sort(key=lambda x: (x[0], x[1]))
        return [item for _, _, item in scored]
