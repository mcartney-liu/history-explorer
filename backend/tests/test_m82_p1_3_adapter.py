"""M82 P1.3 — CausalStatementAdapter Unit Tests.

Covers:
1. get_for_relationship — exact match
2. get_for_relationship — no match → empty list
3. get_for_entity — returns both cause and effect matches
4. get_for_path — returns CS along a path
5. get_for_path — empty list for path with no CS
6. Adapter is read-only — no state mutation across calls
7. get_for_path with tuple edges (duck-type compatibility)
"""
from __future__ import annotations

import pytest

from app.core.causal import CausalLoader, CausalStatementAdapter
from app.core.causal.model import CausalStatement


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def adapter():
    loader = CausalLoader()
    index = loader.load()
    return CausalStatementAdapter(index)


# ---------------------------------------------------------------------------
# Test 1: get_for_relationship — exact match
# ---------------------------------------------------------------------------

def test_get_for_relationship_exact_match(adapter: CausalStatementAdapter):
    result = adapter.get_for_relationship(
        "china_v1:idea-keju", "china_v1:idea-wenguan"
    )
    assert len(result) >= 1
    cs = result[0]
    assert cs.cause_id == "china_v1:idea-keju"
    assert cs.effect_id == "china_v1:idea-wenguan"
    assert cs.confidence == "high"


# ---------------------------------------------------------------------------
# Test 2: get_for_relationship — no match → empty list
# ---------------------------------------------------------------------------

def test_get_for_relationship_no_match(adapter: CausalStatementAdapter):
    result = adapter.get_for_relationship("nonexistent:a", "nonexistent:b")
    assert result == []


# ---------------------------------------------------------------------------
# Test 3: get_for_entity — returns both cause and effect matches
# ---------------------------------------------------------------------------

def test_get_for_entity_both_directions(adapter: CausalStatementAdapter):
    # keju appears as cause (cs-001) but not as effect
    result = adapter.get_for_entity("china_v1:idea-keju")
    assert len(result) >= 1
    # wenguan appears as effect (cs-001)
    result = adapter.get_for_entity("china_v1:idea-wenguan")
    assert len(result) >= 1
    # All returned items are CausalStatement instances
    for cs in result:
        assert isinstance(cs, CausalStatement)


# ---------------------------------------------------------------------------
# Test 4: get_for_path — returns CS along a path
# ---------------------------------------------------------------------------

def test_get_for_path_with_cs(adapter: CausalStatementAdapter):
    # Simulate a 2-edge path: keju → wenguan → neige
    class FakeEdge:
        def __init__(self, source, target, type_):
            self.source = source
            self.target = target
            self.type = type_

    path = [
        FakeEdge("china_v1:idea-keju", "china_v1:idea-wenguan", "led_to"),
        FakeEdge(
            "china_v1:idea-sanxing-liubu", "china_v1:idea-neige", "evolved_into"
        ),
    ]
    result = adapter.get_for_path(path)
    assert len(result) >= 1
    cs_ids = {(cs.cause_id, cs.effect_id) for cs in result}
    assert ("china_v1:idea-keju", "china_v1:idea-wenguan") in cs_ids or (
        "china_v1:idea-sanxing-liubu",
        "china_v1:idea-neige",
    ) in cs_ids


# ---------------------------------------------------------------------------
# Test 5: get_for_path — empty list for path with no CS
# ---------------------------------------------------------------------------

def test_get_for_path_no_cs(adapter: CausalStatementAdapter):
    class FakeEdge:
        def __init__(self, source, target, type_):
            self.source = source
            self.target = target
            self.type = type_

    path = [
        FakeEdge("nonexistent:a", "nonexistent:b", "preceded_by"),
        FakeEdge("nonexistent:b", "nonexistent:c", "influenced"),
    ]
    result = adapter.get_for_path(path)
    assert result == []


# ---------------------------------------------------------------------------
# Test 6: Adapter is read-only — no state mutation across calls
# ---------------------------------------------------------------------------

def test_adapter_read_only(adapter: CausalStatementAdapter):
    r1 = adapter.get_for_entity("china_v1:idea-keju")
    r2 = adapter.get_for_entity("china_v1:idea-keju")
    assert len(r1) == len(r2)
    # The adapter holds no mutable state beyond the index reference
    assert adapter._index is not None  # type: ignore[reportPrivateUsage]


# ---------------------------------------------------------------------------
# Test 7: get_for_path with tuple edges (duck-type compatibility)
# ---------------------------------------------------------------------------

def test_get_for_path_tuple_edges(adapter: CausalStatementAdapter):
    path = [
        ("china_v1:idea-keju", "china_v1:idea-wenguan", "led_to"),
    ]
    result = adapter.get_for_path(path)
    assert len(result) >= 1
    assert result[0].cause_id == "china_v1:idea-keju"


# ---------------------------------------------------------------------------
# Test 8: No generate/synthesize methods exist (C-5 constraint)
# ---------------------------------------------------------------------------

def test_no_generate_methods():
    """C-5: Adapter must not expose generate/synthesize/infer methods."""
    forbidden = {"generate", "synthesize", "infer", "predict", "create"}
    methods = [
        name
        for name in dir(CausalStatementAdapter)
        if callable(getattr(CausalStatementAdapter, name, None))
        and not name.startswith("_")
    ]
    for method in methods:
        for fw in forbidden:
            assert fw not in method.lower(), (
                f"Forbidden method pattern '{fw}' found in '{method}'"
            )
