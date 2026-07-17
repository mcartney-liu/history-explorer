"""Exploration projection helpers for the Knowledge Layer (M3-001).

These are pure functions that transform raw entity/relationship data into the
exploration-friendly view consumed by the API. They contain no data-access,
indexing, graph or caching logic — they project, nothing more.
"""

from __future__ import annotations

from typing import Any


def normalize_timeline(timeline: list) -> list:
    """Keep the frontend working while exposing v2 structured time.

    v1 data carries `period` as a plain string. v2 data carries `period` as a
    TimeValue object {value, precision, certainty, label, range}. We always
    expose `period` as a human-readable string (the `label`, or the original
    string) so TimelinePanel keeps rendering unchanged, and add an additive
    `date` field carrying the full TimeValue object when present.

    Additive migration: no field is removed, the frontend contract is
    untouched, and missing/legacy entries degrade gracefully.
    """
    normalized: list = []
    for entry in timeline:
        if not isinstance(entry, dict):
            normalized.append(entry)
            continue
        period = entry.get("period")
        new_entry = dict(entry)
        if isinstance(period, dict):
            # v2 structured time: keep a string for the UI, expose the object.
            new_entry["period"] = period.get("label", str(period.get("value", "")))
            new_entry["date"] = period
        else:
            # v1 string period (or generic fallback): keep as-is, no `date`.
            new_entry["period"] = period
        normalized.append(new_entry)
    return normalized


def build_exploration_view(
    entities: list, relationships: list, main_id: str | None = None
) -> dict:
    """Center an exploration on `main_id`, or heuristically on the first Event.

    - main_entity: the primary entity to explore.
    - related_entities: entities directly linked via a relationship, annotated
      with the relationship `type`.
    """
    if not entities:
        return {"main_entity": {}, "related_entities": []}

    entity_by_id = {e.get("id"): e for e in entities}

    if main_id is None:
        main_entity = next((e for e in entities if e.get("type") == "Event"), entities[0])
    else:
        main_entity = entity_by_id.get(main_id)
    if main_entity is None:
        return {"main_entity": {}, "related_entities": []}

    resolved_id = main_entity.get("id")

    related_entities: list[dict] = []
    for rel in relationships:
        source = rel.get("source")
        target = rel.get("target")
        rel_type = rel.get("type", "related_to")
        if source == resolved_id and target in entity_by_id:
            other = entity_by_id[target]
            related_entities.append(
                {"id": other.get("id"), "type": other.get("type"), "relationship": rel_type}
            )
        elif target == resolved_id and source in entity_by_id:
            other = entity_by_id[source]
            related_entities.append(
                {"id": other.get("id"), "type": other.get("type"), "relationship": rel_type}
            )

    return {"main_entity": main_entity, "related_entities": related_entities}


def build_exploration_response(topic: str, data: dict) -> dict:
    """Map structured entities/relationships to the stable /explore response.

    Source JSON carries explicit `entities` and `relationships` (with entity
    ids), replacing the old text-only `connections`. A derived `connections`
    compatibility field is kept so the existing frontend keeps working.
    """
    entities = data.get("entities", [])
    relationships = data.get("relationships", [])
    # v2 timeline carries structured TimeValue objects; project them back to
    # the M1 string `period` shape and surface the full object as `date`.
    timeline = normalize_timeline(data.get("timeline", []))

    entity_name = {e.get("id"): e.get("name", "") for e in entities}

    connections: list[dict] = []
    for rel in relationships:
        target_id = rel.get("target", "")
        connections.append(
            {
                "type": rel.get("type", "related_to"),
                "name": entity_name.get(target_id, target_id),
            }
        )

    exploration = build_exploration_view(entities, relationships)

    return {
        "topic": topic,
        "title": data.get("title", topic.replace("-", " ").title()),
        "summary": data.get("summary", "A historical exploration example."),
        "entities": entities,
        "relationships": relationships,
        "timeline": timeline,
        "connections": connections,
        "exploration": exploration,
    }
