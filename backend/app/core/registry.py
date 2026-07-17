"""Global registries for the Knowledge Layer (M3-001).

`KnowledgeRegistry` builds in-memory indexes over every loaded topic dataset:
- Entity Registry:  topic -> {local_id -> entity dict}
- Global Registry:  global_id -> (topic, local_id)
- Alias Registry:   alias (lower) -> [(topic, local_id), ...]
- Topic Registry:   topic -> {title, summary}

It is a pure read-model: built once at startup from the repository, consumed by
`KnowledgeService`, the graph builder, the search index and validation. No
filesystem, no FastAPI, no cache logic here.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class EntityRef:
    """A stable pointer to one entity: which topic it lives in + its local id."""

    topic: str
    local_id: str


class KnowledgeRegistry:
    def __init__(self, topic_datasets: list[tuple[str, dict]]):
        self._topic_order: list[str] = []
        self._topic_meta: dict[str, dict] = {}
        self._entities: dict[str, dict[str, dict]] = {}
        self._by_global_id: dict[str, EntityRef] = {}
        self._by_local_id: dict[str, EntityRef] = {}
        self._by_alias: dict[str, list[EntityRef]] = {}
        self._by_name: dict[str, EntityRef] = {}
        self._build(topic_datasets)

    def _build(self, topic_datasets: list[tuple[str, dict]]) -> None:
        for topic, data in topic_datasets:
            if not isinstance(data, dict):
                data = {}
            self._topic_order.append(topic)
            self._topic_meta[topic] = {
                "topic": topic,
                "title": data.get("title", topic.replace("_", " ").replace("-", " ").title()),
                "summary": (data.get("summary") or "")[:160],
            }
            self._entities[topic] = {}
            for ent in data.get("entities") or []:
                if not isinstance(ent, dict):
                    continue
                eid = ent.get("id")
                if not eid:
                    continue
                self._entities[topic][eid] = ent
                ref = EntityRef(topic, eid)
                # First occurrence wins for ambiguous local-id / name lookups.
                self._by_local_id.setdefault(eid, ref)
                self._by_name.setdefault((ent.get("name") or "").lower(), ref)
                gid = ent.get("global_id")
                if gid:
                    self._by_global_id[gid] = ref
                for alias in ent.get("aliases") or []:
                    if alias:
                        self._by_alias.setdefault(str(alias).lower(), []).append(ref)

    # --- Topic Registry ---
    def list_topics(self) -> list[str]:
        return list(self._topic_order)

    def get_topic_meta(self, topic: str) -> Optional[dict]:
        return self._topic_meta.get(topic)

    # --- Entity Registry ---
    def get_entities(self, topic: str) -> dict[str, dict]:
        return self._entities.get(topic, {})

    def get_entity(self, topic: str, local_id: str) -> Optional[dict]:
        return self._entities.get(topic, {}).get(local_id)

    # --- Global Registry ---
    def find_by_global_id(self, global_id: str) -> Optional[EntityRef]:
        return self._by_global_id.get(global_id)

    def resolve(self, ref: str) -> Optional[EntityRef]:
        """Resolve a local id OR a global_id to a single entity ref."""
        if not ref:
            return None
        hit = self._by_global_id.get(ref)
        if hit is not None:
            return hit
        return self._by_local_id.get(ref)

    # --- Alias Registry ---
    def find_by_alias(self, alias: str) -> list[EntityRef]:
        if not alias:
            return []
        return list(self._by_alias.get(str(alias).lower(), []))

    # --- Name Registry ---
    def find_by_name(self, name: str) -> Optional[EntityRef]:
        if not name:
            return None
        return self._by_name.get(str(name).lower())

    # --- All global ids (used by cross-topic validation) ---
    def all_global_ids(self) -> set[str]:
        return set(self._by_global_id.keys())
