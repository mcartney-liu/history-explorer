"""PO Decision A regression tests (2026-08-18): citation.kind semantic
normalization.

The LLM sometimes fills citation.kind with an ENTITY SUB-TYPE (e.g. "event",
"tech", "person", "loc", "civ", "tp") inferred from the global_id prefix,
instead of the closed set ("entity", "relationship", "timeline"). Decision A
maps those known sub-types to "entity" at the PARSE boundary (Citation.from_dict)
as an output-contract compatibility fix. This MUST NOT relax any fact-truth
validation:

  1. event -> entity passes (known sub-type mapped)
  2. person -> entity passes
  3. legal entity / relationship / timeline are unaffected
  4. unknown kind is still REJECTED
  5. an illegal global_id is STILL REJECTED even after kind normalization
"""

import os
import sys

# Make backend importable when run directly (pytest run from repo root).
BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

from app.ai_gateway.citation_model import (
    ALLOWED_KINDS,
    Citation,
    ENTITY_SUBTYPE_KINDS,
    normalize_kind,
)


# ---------------------------------------------------------------------------
# 1. Pure normalize_kind unit behaviour
# ---------------------------------------------------------------------------

def test_known_entity_subtypes_map_to_entity():
    for sub in ("event", "tech", "person", "loc", "civ", "tp", "idea", "rel",
                "Event", "TECH", "Person", "Location", "Time Period", "Technology",
                "Civilization", "Religion"):
        assert normalize_kind(sub) == "entity", sub


def test_legal_kinds_unaffected():
    for kind in ALLOWED_KINDS:
        assert normalize_kind(kind) == kind


def test_unknown_kind_preserved_not_mapped():
    # "entity|relationship" (the pipe-combination the model once emitted) and
    # nonsense kinds must NOT be silently mapped to entity.
    for bad in ("entity|relationship", "frobnicate", "unknown", "gid:entity", ""):
        assert normalize_kind(bad) == bad, bad


def test_kind_set_covers_all_entity_types_in_data():
    # The normalization set mirrors data/examples entity `type` enum (long +
    # short forms); guard against future enum drift by listing what must exist.
    for required in ("person", "location", "event", "idea",
                     "time period", "technology", "civilization", "religion"):
        assert required in ENTITY_SUBTYPE_KINDS, required


# ---------------------------------------------------------------------------
# 2. Citation.from_dict applies normalization at the parse boundary
# ---------------------------------------------------------------------------

def test_from_dict_normalizes_entity_subtype_kind():
    c = Citation.from_dict(
        {"global_id": "china_v1:event-zheng-he", "kind": "event", "label": "郑和下西洋"}
    )
    assert c.kind == "entity"
    assert c.global_id == "china_v1:event-zheng-he"  # global_id NEVER rewritten


def test_from_dict_preserves_legal_kinds():
    for kind in ("entity", "relationship", "timeline"):
        c = Citation.from_dict({"global_id": "china_v1:tp-song", "kind": kind, "label": "x"})
        assert c.kind == kind


def test_from_dict_preserves_unknown_kind():
    c = Citation.from_dict({"global_id": "china_v1:tp-song", "kind": "frobnicate", "label": "x"})
    assert c.kind == "frobnicate"  # preserved; validator rejects it downstream


# ---------------------------------------------------------------------------
# 3. End-to-end: ResponseValidator behaviour (the actual acceptance test)
#    Uses the real knowledge service so global_id exact-match is exercised.
# ---------------------------------------------------------------------------

def _make_validator():
    from app.core.repository import JsonTopicRepository
    from app.core.knowledge_service import KnowledgeService
    from app.ai_gateway.response_validator import ResponseValidator

    from app.config import get_settings

    settings = get_settings()
    repo = JsonTopicRepository(settings.data_dir)
    ks = KnowledgeService(repo)
    return ResponseValidator(ks, tuning=None), ks


def test_event_kind_normalized_passes_validator():
    validator, ks = _make_validator()
    context = ["china_v1:event-zheng-he"]
    # Simulate the LLM emitting kind="event" (the Decision A fix target).
    # Citations MUST be built through Citation.from_dict (the parse boundary
    # where normalization applies) — exactly like answer_service does.
    citations = [
        Citation.from_dict(
            {"global_id": "china_v1:event-zheng-he", "kind": "event", "label": "郑和下西洋"}
        ),
        Citation.from_dict(
            {"global_id": "china_v1:tech-hanghai", "kind": "tech", "label": "航海技术"}
        ),
    ]
    result = validator.validate(citations, context)
    assert result.grounded is True
    assert len(result.valid_citations) == 2
    assert len(result.rejected_citations) == 0


def test_person_kind_normalized_passes_validator():
    validator, ks = _make_validator()
    context = ["china_v1:person-zheng-he"]
    citations = [
        Citation.from_dict(
            {"global_id": "china_v1:person-zheng-he", "kind": "person", "label": "郑和"}
        ),
    ]
    result = validator.validate(citations, context)
    assert result.grounded is True
    assert len(result.valid_citations) == 1


def test_legal_kinds_still_pass_validator():
    validator, ks = _make_validator()
    context = ["china_v1:tp-song"]
    citations = [
        Citation(global_id="china_v1:tp-song", kind="entity", label="宋朝"),
    ]
    result = validator.validate(citations, context)
    assert result.grounded is True
    assert len(result.valid_citations) == 1


def test_unknown_kind_still_rejected_by_validator():
    validator, ks = _make_validator()
    context = ["china_v1:tp-song"]
    citations = [
        Citation(global_id="china_v1:tp-song", kind="frobnicate", label="宋朝"),
    ]
    result = validator.validate(citations, context)
    assert result.grounded is False
    assert len(result.valid_citations) == 0
    assert len(result.rejected_citations) == 1


def test_illegal_global_id_still_rejected_even_with_normalized_kind():
    validator, ks = _make_validator()
    context = ["china_v1:tp-song"]
    # kind="person" would normalize to entity, but the global_id is NOT in the
    # grounding scope -> must still be rejected (Decision A: no scope widening).
    citations = [
        Citation(global_id="china_v1:totally-fake-id", kind="person", label="幽灵实体"),
    ]
    result = validator.validate(citations, context)
    assert result.grounded is False
    assert len(result.valid_citations) == 0
    assert len(result.rejected_citations) == 1
