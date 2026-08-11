"""M82 P1.2 — CausalStatement Loader Unit Tests.

Covers:
1. Normal load (5 CS from data/causal_statements.json)
2. Field completeness
3. evidence_refs preservation
4. confidence enum preservation
5. Unknown future fields do not break loading
6. File-not-found → clear error
7. Invalid JSON → clear error
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from app.core.causal import CausalLoader, CausalStatement


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def loader() -> CausalLoader:
    return CausalLoader()


@pytest.fixture
def real_path() -> Path:
    # causal_statements.json lives in the repo root, not under backend/
    p = Path(__file__).resolve().parent.parent.parent / "data" / "causal_statements.json"
    assert p.exists(), f"Expected data file at {p}"
    return p


@pytest.fixture
def minimal_json() -> list:
    return [
        {
            "id": "cs-test-01",
            "cause_id": "test:a",
            "effect_id": "test:b",
            "mechanism": "A caused B through process X.",
            "consequence": "B led to long-term outcome Y.",
            "confidence": "high",
            "evidence_refs": ["ec-test-001"],
        }
    ]


def _write_temp(data: list) -> Path:
    """Write *data* to a temporary JSON file and return its path."""
    tmp = tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    )
    json.dump(data, tmp)
    tmp.close()
    return Path(tmp.name)


# ---------------------------------------------------------------------------
# Test 1: Normal load — 5 CS from the real data file
# ---------------------------------------------------------------------------

def test_load_real_file(loader: CausalLoader, real_path: Path):
    index = loader.load(real_path)
    assert len(index.statements) == 5
    assert all(isinstance(cs, CausalStatement) for cs in index.statements)


# ---------------------------------------------------------------------------
# Test 2: Field completeness — every required field is populated
# ---------------------------------------------------------------------------

def test_field_completeness(loader: CausalLoader, real_path: Path):
    index = loader.load(real_path)
    for cs in index.statements:
        assert cs.cause_id, f"Missing cause_id in {cs}"
        assert cs.effect_id, f"Missing effect_id in {cs}"
        assert isinstance(cs.mechanism, (str, type(None)))
        assert isinstance(cs.consequence, (str, type(None)))
        assert cs.confidence in ("high", "medium", "low", None), (
            f"Invalid confidence: {cs.confidence}"
        )
        assert isinstance(cs.evidence_refs, tuple)


# ---------------------------------------------------------------------------
# Test 3: evidence_refs preserved as tuple
# ---------------------------------------------------------------------------

def test_evidence_refs_preserved(loader: CausalLoader, real_path: Path):
    index = loader.load(real_path)
    cs_001 = next(cs for cs in index.statements if "keju" in cs.cause_id)
    assert len(cs_001.evidence_refs) >= 1
    assert "ec-cn-" in cs_001.evidence_refs[0]


# ---------------------------------------------------------------------------
# Test 4: confidence enum preserved
# ---------------------------------------------------------------------------

def test_confidence_enum(loader: CausalLoader, real_path: Path):
    index = loader.load(real_path)
    confidences = {cs.confidence for cs in index.statements}
    assert "high" in confidences
    assert "low" in confidences
    # No float values (C-7 constraint)
    for cs in index.statements:
        assert not isinstance(cs.confidence, float), (
            f"confidence must be str|None, got float in {cs.cause_id}->{cs.effect_id}"
        )


# ---------------------------------------------------------------------------
# Test 5: Unknown future fields do NOT break loading
# ---------------------------------------------------------------------------

def test_unknown_future_fields_ignored(loader: CausalLoader):
    data = [
        {
            "id": "cs-future-01",
            "cause_id": "test:a",
            "effect_id": "test:b",
            "mechanism": "Some mechanism.",
            "consequence": "Some consequence.",
            "confidence": "medium",
            "evidence_refs": [],
            # --- future M84+ fields ---
            "status": "published",
            "replaces": None,
            "replaced_by": None,
            "proposed_by": "ai",
            "language": "zh",
            "whatever_new_field": 42,
        }
    ]
    path = _write_temp(data)
    try:
        index = loader.load(path)
        assert len(index.statements) == 1
        cs = index.statements[0]
        assert cs.cause_id == "test:a"
        assert cs.effect_id == "test:b"
        assert cs.confidence == "medium"
    finally:
        path.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Test 6: File not found → clear FileNotFoundError
# ---------------------------------------------------------------------------

def test_file_not_found(loader: CausalLoader):
    with pytest.raises(FileNotFoundError, match="not found"):
        loader.load(Path("__nonexistent__/causal_statements.json"))


# ---------------------------------------------------------------------------
# Test 7: Invalid JSON → clear ValueError
# ---------------------------------------------------------------------------

def test_invalid_json(loader: CausalLoader):
    path = _write_temp([{"cause_id": "x", "effect_id": "y"}])
    # Corrupt the file by appending garbage
    with open(path, "a") as fh:
        fh.write("{{{")
    try:
        with pytest.raises(ValueError, match="Invalid JSON"):
            loader.load(path)
    finally:
        path.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Test 8: Missing required field → clear ValueError
# ---------------------------------------------------------------------------

def test_missing_required_field(loader: CausalLoader):
    data = [
        {
            "id": "cs-broken",
            # missing cause_id
            "effect_id": "test:b",
        }
    ]
    path = _write_temp(data)
    try:
        with pytest.raises(ValueError, match="Missing required field"):
            loader.load(path)
    finally:
        path.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Test 9: Index correctness — by_cause and by_effect
# ---------------------------------------------------------------------------

def test_index_correctness(loader: CausalLoader, real_path: Path):
    index = loader.load(real_path)
    # by_cause: keju appears as cause in cs-001
    keju_cs = index.by_cause.get("china_v1:idea-keju", [])
    assert len(keju_cs) >= 1
    assert keju_cs[0].effect_id == "china_v1:idea-wenguan"

    # by_effect: wenguan is the effect of keju
    wenguan_cs = index.by_effect.get("china_v1:idea-wenguan", [])
    assert len(wenguan_cs) >= 1
    assert any(cs.cause_id == "china_v1:idea-keju" for cs in wenguan_cs)
