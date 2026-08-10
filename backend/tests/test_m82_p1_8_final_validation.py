"""M82 P1.8 — Phase 1 Final Validation Tests.

A. Schema Contract Test
B. Runtime Integration Test
C. Boundary Compliance Test
D. Scale Simulation Test (20-100 CS)
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.causal import CausalIndex, CausalLoader, CausalStatement, CausalStatementAdapter
from app.core.exploration_engine import ExplorationEngine
from app.core.global_graph import GlobalGraph
from app.core.registry import KnowledgeRegistry

DATA_DIR = BACKEND_DIR.parent / "data" / "examples"


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def loader():
    return CausalLoader()


@pytest.fixture
def real_index(loader):
    return loader.load()


@pytest.fixture
def adapter(real_index):
    return CausalStatementAdapter(real_index)


@pytest.fixture
def engine_with_causal():
    china = json.loads((DATA_DIR / "china_civilization_v1_example.json").read_text("utf-8"))
    datasets = [("china_v1", china)]
    reg = KnowledgeRegistry(datasets)
    gg = GlobalGraph(datasets, reg)
    loader = CausalLoader()
    idx = loader.load()
    adapter = CausalStatementAdapter(idx)
    return ExplorationEngine(gg, reg, datasets, causal_adapter=adapter)


# ============================================================================
# A. Schema Contract Test
# ============================================================================

class TestSchemaContract:
    """Verify the 7-field frozen schema contract."""

    FIELDS = {"cause_id", "effect_id", "mechanism", "consequence", "confidence", "evidence_refs"}

    def test_all_7_fields_present(self, real_index: CausalIndex):
        for cs in real_index.statements:
            for f in self.FIELDS:
                assert hasattr(cs, f), f"Missing field {f} in CausalStatement"

    def test_confidence_enum_values(self, real_index: CausalIndex):
        for cs in real_index.statements:
            assert cs.confidence in ("high", "medium", "low", None), (
                f"Invalid confidence: {cs.confidence}"
            )
            assert not isinstance(cs.confidence, float), "confidence must be str|None"

    def test_evidence_refs_is_tuple(self, real_index: CausalIndex):
        for cs in real_index.statements:
            assert isinstance(cs.evidence_refs, tuple)

    def test_cause_effect_are_str(self, real_index: CausalIndex):
        for cs in real_index.statements:
            assert isinstance(cs.cause_id, str)
            assert isinstance(cs.effect_id, str)

    def test_unknown_fields_ignored(self, loader: CausalLoader):
        data = [
            {
                "id": "cs-future",
                "cause_id": "a",
                "effect_id": "b",
                "mechanism": "M",
                "consequence": "C",
                "confidence": "high",
                "evidence_refs": [],
                "status": "published",  # future field
                "replaces": None,       # future field
            }
        ]
        tmp = Path(tempfile.mktemp(suffix=".json"))
        tmp.write_text(json.dumps(data), encoding="utf-8")
        try:
            idx = loader.load(tmp)
            assert len(idx.statements) == 1
            # Future fields silently ignored
            assert not hasattr(idx.statements[0], "status")
        finally:
            tmp.unlink(missing_ok=True)


# ============================================================================
# B. Runtime Integration Test
# ============================================================================

class TestRuntimeIntegration:
    """Verify the full chain: Entity → Relationship → Adapter → CS → Evidence."""

    def test_adapter_get_for_relationship(self, adapter: CausalStatementAdapter):
        matches = adapter.get_for_relationship(
            "china_v1:idea-keju", "china_v1:idea-wenguan"
        )
        assert len(matches) >= 1
        assert matches[0].cause_id == "china_v1:idea-keju"

    def test_adapter_get_for_entity(self, adapter: CausalStatementAdapter):
        matches = adapter.get_for_entity("china_v1:idea-keju")
        assert len(matches) >= 1

    def test_engine_explain_path_injects_cs(self, engine_with_causal: ExplorationEngine):
        from app.core.exploration_engine import PathStep
        steps = [
            PathStep(
                from_global_id="china_v1:idea-keju",
                to_global_id="china_v1:idea-wenguan",
                relationship="led_to",
                direction="→",
                weight=1.0,
            )
        ]
        explanation, cs_list = engine_with_causal._explain_path(steps)
        assert "[high]" in explanation
        assert len(cs_list) >= 1
        assert cs_list[0]["cause_id"] == "china_v1:idea-keju"

    def test_api_path_candidate_has_cs(self, engine_with_causal: ExplorationEngine):
        result = engine_with_causal.find_connections(
            "china_v1:idea-keju", "china_v1:idea-wenguan"
        ).to_dict()
        assert "paths" in result
        path0 = result["paths"][0]
        assert "causal_statements" in path0
        assert len(path0["causal_statements"]) >= 1
        cs = path0["causal_statements"][0]
        assert cs["confidence"] == "high"

    def test_evidence_refs_chain(self, adapter: CausalStatementAdapter):
        """Evidence refs → claim IDs → evidence_claims.json."""
        matches = adapter.get_for_relationship(
            "china_v1:idea-keju", "china_v1:idea-wenguan"
        )
        assert len(matches) >= 1
        refs = matches[0].evidence_refs
        assert len(refs) >= 1
        # All refs should be claim IDs (non-empty strings)
        for ref in refs:
            assert isinstance(ref, str)
            assert len(ref) > 0
            assert ref.startswith("ec-")

    def test_confidence_distribution(self, real_index: CausalIndex):
        """Verify at least one high and one low confidence CS exist."""
        confs = {cs.confidence for cs in real_index.statements}
        assert "high" in confs, "Need at least one high-confidence CS"
        assert "low" in confs, "Need at least one low-confidence CS"


# ============================================================================
# C. Boundary Compliance Test
# ============================================================================

class TestBoundaryCompliance:
    """Confirm no Graph Core / AI / Schema violations."""

    def test_edge_not_modified(self):
        """C-3: graph.py Edge remains 3 fields."""
        from app.core.graph import Edge
        e = Edge(source="a", target="b", type="c")
        fields = {"source", "target", "type"}
        actual = {f for f in dir(e) if not f.startswith("_")}
        assert fields.issubset(actual)
        # Edge should NOT have causal fields
        assert "causal_statement_ids" not in dir(e)

    def test_causal_does_not_import_graph(self):
        """C-1: causal/ package must not import graph.py."""
        causal_dir = BACKEND_DIR / "app" / "core" / "causal"
        for py_file in causal_dir.glob("*.py"):
            text = py_file.read_text("utf-8")
            # Allow TYPE_CHECKING import in exploration_engine.py
            if py_file.name == "__init__.py" or py_file.name == "model.py" or py_file.name == "loader.py" or py_file.name == "adapter.py":
                assert "from ..graph import" not in text, (
                    f"{py_file.name} must not import graph.py"
                )
                assert "from .graph import" not in text, (
                    f"{py_file.name} must not import graph.py"
                )

    def test_no_ai_in_causal(self):
        """C-6: No AI/LLM calls in causal/ package."""
        causal_dir = BACKEND_DIR / "app" / "core" / "causal"
        ai_keywords = ("openai", "llm", "langchain", "anthropic", "gpt", "claude")
        for py_file in causal_dir.glob("*.py"):
            text = py_file.read_text("utf-8").lower()
            for kw in ai_keywords:
                assert kw not in text, f"{py_file.name} contains AI keyword '{kw}'"

    def test_adapter_no_generate(self):
        """C-5: Adapter has no generate/synthesize methods."""
        from app.core.causal.adapter import CausalStatementAdapter
        forbidden = {"generate", "synthesize", "infer", "predict", "create"}
        methods = [m for m in dir(CausalStatementAdapter) if callable(getattr(CausalStatementAdapter, m)) and not m.startswith("_")]
        for m in methods:
            for fw in forbidden:
                assert fw not in m.lower(), f"Forbidden '{fw}' in method '{m}'"


# ============================================================================
# D. Scale Simulation Test
# ============================================================================

class TestScaleSimulation:
    """Create 20-100 mock CausalStatements and verify loader/adapter stability."""

    @staticmethod
    def _mock_cs(idx: int) -> dict:
        return {
            "id": f"cs-mock-{idx:04d}",
            "cause_id": f"mock:entity-{idx % 20}",
            "effect_id": f"mock:entity-{(idx + 1) % 20}",
            "mechanism": f"Mock mechanism for causal statement {idx}.",
            "consequence": f"Mock consequence for causal statement {idx}.",
            "confidence": ["high", "medium", "low"][idx % 3],
            "evidence_refs": [f"ec-mock-{idx:04d}"],
        }

    @pytest.mark.parametrize("size", [20, 50, 100])
    def test_loader_scales(self, loader: CausalLoader, size: int):
        data = [self._mock_cs(i) for i in range(size)]
        tmp = Path(tempfile.mktemp(suffix=".json"))
        tmp.write_text(json.dumps(data), encoding="utf-8")
        try:
            idx = loader.load(tmp)
            assert len(idx.statements) == size
            assert len(idx.by_cause) > 0
            assert len(idx.by_effect) > 0
        finally:
            tmp.unlink(missing_ok=True)

    @pytest.mark.parametrize("size", [20, 50, 100])
    def test_adapter_scales(self, loader: CausalLoader, size: int):
        data = [self._mock_cs(i) for i in range(size)]
        tmp = Path(tempfile.mktemp(suffix=".json"))
        tmp.write_text(json.dumps(data), encoding="utf-8")
        try:
            idx = loader.load(tmp)
            adapter = CausalStatementAdapter(idx)
            # Query by entity
            results = adapter.get_for_entity("mock:entity-0")
            assert len(results) >= 1
            # Query by relationship
            results = adapter.get_for_relationship("mock:entity-0", "mock:entity-1")
            assert len(results) >= 1
            # Query non-existent
            results = adapter.get_for_relationship("nonexistent", "nonexistent")
            assert results == []
        finally:
            tmp.unlink(missing_ok=True)

    @pytest.mark.parametrize("size", [20, 50, 100])
    def test_index_deduplication(self, loader: CausalLoader, size: int):
        """Verify by_cause/by_effect do not create duplicates."""
        data = [self._mock_cs(i) for i in range(size)]
        tmp = Path(tempfile.mktemp(suffix=".json"))
        tmp.write_text(json.dumps(data), encoding="utf-8")
        try:
            idx = loader.load(tmp)
            for gid, cs_list in idx.by_cause.items():
                ids = [id(cs) for cs in cs_list]
                assert len(ids) == len(set(ids)), f"Duplicate CS in by_cause[{gid}]"
            for gid, cs_list in idx.by_effect.items():
                ids = [id(cs) for cs in cs_list]
                assert len(ids) == len(set(ids)), f"Duplicate CS in by_effect[{gid}]"
        finally:
            tmp.unlink(missing_ok=True)
