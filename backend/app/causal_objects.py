"""M86.2 — Read-only CausalObject API (semantic layer backend-ization, Plan A).

Exposes the curated CausalObject dataset (``data/causal_objects.json``) over a
read-only HTTP endpoint. This is the semantic layer's first backend surface:
it does NOT mutate the graph, does NOT perform traversal / ranking /
recommendation, and never touches AI. It mirrors the read-only, additive wiring
precedent of M29.1-C (provenance): the handler functions defined here are
mounted on BOTH ``v1_router`` and ``legacy_router`` in ``main.py`` to preserve
the ``v1 == legacy`` invariant.

Design notes (freeze boundary §5):
- The frozen ``backend/app/core/causal/*`` package is NOT modified. This module
  only *imports* its (frozen) dataclasses (``CausalObject``,
  ``ExplorationPathRef``, ``RelatedCausalObjectRef``) and constructs them.
- Parsing is the inverse of ``CausalObject.to_dict()``; the 11 frozen fields are
  round-tripped exactly (M82/M84/M85 field lock).
- Unknown future keys are silently ignored so forward schema extensions do not
  break loading (same tolerance as CausalLoader).
- The cache is built once at app startup via ``init_causal_objects()``; requests
  serve purely from memory (no per-request file I/O).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from fastapi import HTTPException

from .core.causal.causal_object import (
    CausalObject,
    ExplorationPathRef,
    RelatedCausalObjectRef,
)

# backend/app/causal_objects.py -> backend/ (repo root) -> data/causal_objects.json
CAUSAL_OBJECTS_DEFAULT_PATH: Path = (
    Path(__file__).resolve().parent.parent.parent / "data" / "causal_objects.json"
)

# Module-level cache, populated by init_causal_objects() at app startup.
_CAUSAL_OBJECTS: List[CausalObject] = []
_CAUSAL_OBJECTS_BY_ID: Dict[str, CausalObject] = {}


# ---------------------------------------------------------------------------
# Parsing (inverse of CausalObject.to_dict)
# ---------------------------------------------------------------------------

def _parse_exploration_paths(raw) -> Tuple[ExplorationPathRef, ...]:
    """Build ExplorationPathRef tuple from a raw list of path dicts."""
    paths: List[ExplorationPathRef] = []
    for p in (raw or []):
        paths.append(
            ExplorationPathRef(
                from_gid=p["from"],
                to_gid=p["to"],
                relationship=p["relationship"],
                label=p["label"],
            )
        )
    return tuple(paths)


def _parse_related_objects(raw) -> Tuple[RelatedCausalObjectRef, ...]:
    """Build RelatedCausalObjectRef tuple from a raw list of relation dicts."""
    rels: List[RelatedCausalObjectRef] = []
    for r in (raw or []):
        rels.append(
            RelatedCausalObjectRef(
                target_id=r["target_id"],
                relation_type=r["relation_type"],
                explanation=r["explanation"],
            )
        )
    return tuple(rels)


def load_causal_objects(path: Optional[Path] = None) -> List[CausalObject]:
    """Load CausalObjects from *path* (defaults to the bundled JSON).

    Raises :class:`FileNotFoundError` if the file is absent and
    :class:`ValueError` if the content is not a JSON array or a required
    field is missing — faithfully mirroring CausalLoader's contract.
    """
    path = path or CAUSAL_OBJECTS_DEFAULT_PATH
    if not path.exists():
        raise FileNotFoundError(f"CausalObject file not found: {path}")
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in CausalObject file: {path}") from exc
    if not isinstance(data, list):
        raise ValueError(
            f"Expected a JSON array in {path}, got {type(data).__name__}"
        )

    objects: List[CausalObject] = []
    for idx, obj in enumerate(data):
        if not isinstance(obj, dict):
            raise ValueError(
                f"Expected dict at index {idx}, got {type(obj).__name__}"
            )
        try:
            co = CausalObject(
                id=obj["id"],
                cause_id=obj["cause_id"],
                effect_id=obj["effect_id"],
                mechanism=obj.get("mechanism"),
                consequence=obj.get("consequence"),
                confidence=obj.get("confidence"),
                evidence_refs=tuple(obj.get("evidence_refs", ())),
                object_type=obj.get("object_type", "causal"),
                related_entities=tuple(obj.get("related_entities", ())),
                exploration_paths=_parse_exploration_paths(
                    obj.get("exploration_paths")
                ),
                related_causal_objects=_parse_related_objects(
                    obj.get("related_causal_objects")
                ),
            )
        except KeyError as exc:
            raise ValueError(
                f"Missing required field {exc} at index {idx} "
                f"(id={obj.get('id', '?')})"
            ) from exc
        objects.append(co)
    return objects


def build_causal_object_index(
    objects: List[CausalObject],
) -> Dict[str, CausalObject]:
    """Index CausalObjects by their ``id`` for O(1) lookup."""
    return {o.id: o for o in objects}


def init_causal_objects(path: Optional[Path] = None) -> None:
    """Populate the module-level cache. Call exactly once at app startup."""
    global _CAUSAL_OBJECTS, _CAUSAL_OBJECTS_BY_ID
    _CAUSAL_OBJECTS = load_causal_objects(path)
    _CAUSAL_OBJECTS_BY_ID = build_causal_object_index(_CAUSAL_OBJECTS)


# ---------------------------------------------------------------------------
# HTTP handlers (mounted on v1 + legacy in main.py)
# ---------------------------------------------------------------------------

def list_causal_objects():
    """Return all CausalObjects as a read-only projection."""
    return {"causal_objects": [o.to_dict() for o in _CAUSAL_OBJECTS]}


def get_causal_object(object_id: str):
    """Return a single CausalObject by id, or 404 if unknown."""
    co = _CAUSAL_OBJECTS_BY_ID.get(object_id)
    if co is None:
        raise HTTPException(
            status_code=404,
            detail=f"CausalObject {object_id} not found.",
        )
    return co.to_dict()
