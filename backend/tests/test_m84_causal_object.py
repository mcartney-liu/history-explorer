"""M85 — CausalObject model, serialization, and Semantic Relationship tests."""

import json
import pytest
from pathlib import Path
from app.core.causal.causal_object import CausalObject, ExplorationPathRef, RelatedCausalObjectRef


DATA_DIR = Path(__file__).resolve().parents[2] / "data"

VALID_RELATION_TYPES = {
    "institutional_evolution", "technological_chain",
    "civilization_contrast", "ideological_influence",
}


class TestRelatedCausalObjectRef:
    """M85 — RelatedCausalObjectRef model tests."""

    def test_ref_has_three_fields(self):
        ref = RelatedCausalObjectRef(
            target_id="co-001",
            relation_type="institutional_evolution",
            explanation="Centralization led to standardized selection.",
        )
        d = ref.to_dict()
        assert d["target_id"] == "co-001"
        assert d["relation_type"] == "institutional_evolution"
        assert d["explanation"] == "Centralization led to standardized selection."
        assert len(d) == 3

    def test_ref_is_frozen(self):
        ref = RelatedCausalObjectRef(
            target_id="co-001",
            relation_type="institutional_evolution",
            explanation="...",
        )
        with pytest.raises(Exception):
            ref.target_id = "co-002"  # type: ignore[misc]

    def test_ref_relation_type_must_be_valid(self):
        for rt in VALID_RELATION_TYPES:
            ref = RelatedCausalObjectRef(
                target_id="co-001", relation_type=rt, explanation="...",
            )
            assert ref.relation_type == rt

    def test_ref_no_forbidden_fields(self):
        ref = RelatedCausalObjectRef(
            target_id="co-001",
            relation_type="institutional_evolution",
            explanation="...",
        )
        d = ref.to_dict()
        forbidden = {
            "confidence", "weight", "score", "ranking",
            "recommended", "distance", "ai_generated", "provenance",
        }
        found = forbidden & set(d.keys())
        assert not found, f"Forbidden fields in RelatedCausalObjectRef: {found}"


class TestCausalObjectModel:
    """CausalObject field compliance (M85.1 Model Freeze)."""

    def test_has_11_fields_total(self):
        """7 inherited + 3 M84 + 1 M85 = 11 fields (related_causal_objects is allowed in M85)."""
        co = CausalObject(
            id="co-test",
            cause_id="entity-a",
            effect_id="entity-b",
        )
        d = co.to_dict()
        assert d["id"] == "co-test"
        assert d["object_type"] == "causal"
        # Optional fields absent when empty
        assert "mechanism" not in d
        assert "consequence" not in d
        assert "confidence" not in d
        assert "evidence_refs" not in d
        assert "related_entities" not in d
        assert "exploration_paths" not in d
        assert "related_causal_objects" not in d  # absent when empty

    def test_forbidden_fields_not_present(self):
        """Verify CausalObject has no forbidden fields (M85.1 Model Freeze)."""
        co = CausalObject(id="co-test", cause_id="a", effect_id="b")
        d = co.to_dict()
        forbidden = [
            "confidence_score", "ai_generated", "ranking", "recommendation",
            "personalization", "entity_name", "timeline",
            "version", "narrative",
            # M85 Forbidden:
            "semantic_graph_index", "relationship_traversal",
            "ai_generated_relations", "recommended_objects",
            "related_object_confidence", "relationship_provenance",
            "relationship_evidence", "transitive_relations",
        ]
        for field in forbidden:
            assert field not in d, f"Forbidden field '{field}' found in CausalObject"

    def test_full_object_serialization_with_relationships(self):
        """All 11 fields present when populated, including related_causal_objects."""
        path = ExplorationPathRef(
            from_gid="entity-a", to_gid="entity-b",
            relationship="caused", label="A led to B",
        )
        rel = RelatedCausalObjectRef(
            target_id="co-002",
            relation_type="institutional_evolution",
            explanation="A's framework enabled B's emergence.",
        )
        co = CausalObject(
            id="co-001",
            cause_id="entity-a",
            effect_id="entity-b",
            mechanism="A caused B because...",
            consequence="This led to...",
            confidence="high",
            evidence_refs=("ec-001",),
            related_entities=("entity-c", "entity-d"),
            exploration_paths=(path,),
            related_causal_objects=(rel,),
        )
        d = co.to_dict()
        assert d["mechanism"] == "A caused B because..."
        assert d["consequence"] == "This led to..."
        assert d["confidence"] == "high"
        assert d["evidence_refs"] == ["ec-001"]
        assert d["related_entities"] == ["entity-c", "entity-d"]
        assert len(d["exploration_paths"]) == 1
        assert d["exploration_paths"][0]["label"] == "A led to B"
        # M85
        assert len(d["related_causal_objects"]) == 1
        assert d["related_causal_objects"][0]["target_id"] == "co-002"
        assert d["related_causal_objects"][0]["relation_type"] == "institutional_evolution"
        assert d["related_causal_objects"][0]["explanation"] == "A's framework enabled B's emergence."

    def test_causal_object_is_frozen(self):
        """CausalObject is immutable (frozen=True)."""
        co = CausalObject(id="co-test", cause_id="a", effect_id="b")
        with pytest.raises(Exception):
            co.object_type = "theme"  # type: ignore[misc]


class TestCausalObjectData:
    """Verify causal_objects.json loads correctly (M85.2 Dataset Freeze)."""

    def test_json_loads(self):
        path = DATA_DIR / "causal_objects.json"
        assert path.exists(), f"{path} not found"
        data = json.loads(path.read_text(encoding="utf-8"))
        assert isinstance(data, list)
        assert len(data) >= 10

    def test_each_object_has_required_fields(self):
        path = DATA_DIR / "causal_objects.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        required = {"id", "cause_id", "effect_id", "object_type"}
        for item in data:
            missing = required - set(item.keys())
            assert not missing, f"Missing fields {missing} in {item.get('id', '?')}"

    def test_each_object_type_is_causal(self):
        path = DATA_DIR / "causal_objects.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        for item in data:
            assert item["object_type"] == "causal", \
                f"object_type must be 'causal', got {item['object_type']} in {item['id']}"

    def test_no_forbidden_fields_in_json(self):
        path = DATA_DIR / "causal_objects.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        forbidden = {
            "confidence_score", "ai_generated", "ranking", "recommendation",
            "personalization", "entity_name", "timeline",
            "version", "narrative",
            "semantic_graph_index", "relationship_traversal",
            "ai_generated_relations", "recommended_objects",
            "related_object_confidence", "relationship_provenance",
            "relationship_evidence", "transitive_relations",
        }
        for item in data:
            found = forbidden & set(item.keys())
            assert not found, f"Forbidden fields {found} in {item['id']}"

    def test_confidence_is_enum_string(self):
        path = DATA_DIR / "causal_objects.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        for item in data:
            if "confidence" in item:
                assert item["confidence"] in ("high", "medium", "low"), \
                    f"Invalid confidence '{item['confidence']}' in {item['id']}"

    def test_related_causal_objects_have_valid_relation_types(self):
        """M85.2 — All relation_type values must be from the frozen set."""
        path = DATA_DIR / "causal_objects.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        for item in data:
            for ref in item.get("related_causal_objects", []):
                assert ref["relation_type"] in VALID_RELATION_TYPES, \
                    f"Invalid relation_type '{ref['relation_type']}' in {item['id']}"

    def test_related_causal_objects_have_no_forbidden_ref_fields(self):
        """M85.1 — RelatedCausalObjectRef must not have forbidden fields."""
        path = DATA_DIR / "causal_objects.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        forbidden_ref = {
            "confidence", "weight", "score", "ranking",
            "recommended", "distance", "ai_generated", "provenance",
        }
        for item in data:
            for ref in item.get("related_causal_objects", []):
                found = forbidden_ref & set(ref.keys())
                assert not found, \
                    f"Forbidden fields {found} in related_causal_objects of {item['id']}"

    def test_related_causal_objects_target_ids_exist(self):
        """M85.2 — All target_id values must reference existing CausalObjects."""
        path = DATA_DIR / "causal_objects.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        all_ids = {item["id"] for item in data}
        for item in data:
            for ref in item.get("related_causal_objects", []):
                assert ref["target_id"] in all_ids, \
                    f"target_id '{ref['target_id']}' in {item['id']} not found in dataset"

    def test_related_causal_objects_count(self):
        """M85.9 — Verify 13 relationship refs total (5 M85.2 + 8 M85.9.1)."""
        path = DATA_DIR / "causal_objects.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        total = sum(len(item.get("related_causal_objects", [])) for item in data)
        assert total == 13, f"Expected 13 relationship refs, got {total}"
