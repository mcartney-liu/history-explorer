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
    """Build the shared, read-only entity search index from the registry.

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


def build_topic_index(registry) -> list[dict]:
    """Build the read-only topic search index from the registry (M4-004).

    Each topic record carries the same ranking fields the shared `_match_rank`
    scorer expects (id = topic slug, name = title, aliases = [], description =
    summary) so topics are ranked with the identical Exact / Alias / Contains
    logic as entities. `type` is intentionally omitted: topic results are
    emitted with `result_type: "Topic"` (a tag), not the entity `type` field.
    """
    records: list[dict] = []
    for topic in registry.list_topics():
        meta = registry.get_topic_meta(topic) or {}
        title = meta.get("title", topic.replace("_", " ").replace("-", " ").title())
        records.append(
            {
                "id": topic,  # topic slug doubles as the id field for exact match
                "name": title,
                "aliases": [],
                "description": meta.get("summary", ""),
                "topic": topic,
            }
        )
    return records


class SearchProvider:
    """Ranks queries against prebuilt entity + topic indexes (no filesystem,
    no DB, no AI, no fuzzy logic — pure function over the frozen read-model).
    """

    def __init__(self, search_index: list[dict], topic_index: list[dict] | None = None):
        self._index = search_index
        self._topic_index = topic_index or []

    def search(self, q: str, topic: str | None = None) -> list[dict]:
        """Return a single, deterministically ordered list of unified result
        items (Entities + Topics), each tagged with `result_type`.

        - Entity items keep all prior fields (id/name/type/topic/description/
          match/start/end/location) and gain `result_type: "Entity"`.
        - Topic items carry `result_type: "Topic"` + topic/name/description/
          match (no entity `id`/`type`/`start`/`end`/`location`).
        - Optional `topic` scopes the WHOLE list to that topic (entity
          rec.topic == topic; topic result kept only if its topic == topic).
        - Ranking is the shared (rank, name) Exact/Alias/Contains sort;
          `result_type` is a tag, not a sort key. Empty query -> empty list.
        """
        query = (q or "").strip()
        if not query:
            return []
        q_norm = query.lower()
        scored: list[tuple[int, str, dict]] = []

        for rec in self._index:
            if topic is not None and rec.get("topic") != topic:
                continue
            rank = _match_rank(rec, q_norm)
            if rank is None:
                continue
            scored.append(self._entity_result(rank, rec))

        for rec in self._topic_index:
            if topic is not None and rec.get("topic") != topic:
                continue
            rank = _match_rank(rec, q_norm)
            if rank is None:
                continue
            scored.append(self._topic_result(rank, rec))

        scored.sort(key=lambda x: (x[0], x[1]))
        return [item for _, _, item in scored]

    @staticmethod
    def _entity_result(rank: int, rec: dict) -> tuple[int, str, dict]:
        return (
            rank,
            (rec.get("name") or "").lower(),
            {
                "result_type": "Entity",
                "id": rec["id"],
                "name": rec["name"],
                "type": rec["type"],
                "topic": rec["topic"],
                "description": rec["description"],
                "match": _RANK_NAME[rank],
                "start": rec["start"],
                "end": rec["end"],
                "location": rec["location"],
            },
        )

    @staticmethod
    def _topic_result(rank: int, rec: dict) -> tuple[int, str, dict]:
        return (
            rank,
            (rec.get("name") or "").lower(),
            {
                "result_type": "Topic",
                "topic": rec["topic"],
                "name": rec["name"],
                "description": rec["description"],
                "match": _RANK_NAME[rank],
            },
        )
