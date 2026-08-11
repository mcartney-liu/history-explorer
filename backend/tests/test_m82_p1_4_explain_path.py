"""M82 P1.4 — _explain_path CausalStatement Integration Tests.

Updated for P1.5: _explain_path now returns (str, list[dict]).

Covers:
1. Without adapter → original template output (backward compatible)
2. With adapter → structural path + causal enrichment
3. With adapter, no matching CS → template fallback (C-8)
4. PathCandidate.causal_statements contains structured CS dicts (P1.5)
5. Empty steps → "No connecting relationship."
6. Multiple CS on same path — all enrichments included
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

DATA_DIR = BACKEND_DIR.parent / "data" / "examples"

from app.core.causal import CausalLoader, CausalStatementAdapter
from app.core.exploration_engine import ExplorationEngine, PathStep
from app.core.global_graph import GlobalGraph
from app.core.registry import KnowledgeRegistry


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_china_dataset() -> dict:
    path = DATA_DIR / "china_civilization_v1_example.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _build_engine(with_causal: bool = False) -> ExplorationEngine:
    china = _load_china_dataset()
    datasets = [("china_v1", china)]
    reg = KnowledgeRegistry(datasets)
    gg = GlobalGraph(datasets, reg)
    if with_causal:
        loader = CausalLoader()
        index = loader.load()
        adapter = CausalStatementAdapter(index)
        return ExplorationEngine(gg, reg, datasets, causal_adapter=adapter)
    return ExplorationEngine(gg, reg, datasets)


# ---------------------------------------------------------------------------
# Test 1: Without adapter → original template output (backward compatible)
# ---------------------------------------------------------------------------

def test_without_adapter_original_template():
    engine = _build_engine(with_causal=False)
    steps = [
        PathStep(
            from_global_id="china_v1:idea-keju",
            to_global_id="china_v1:idea-wenguan",
            relationship="led_to",
            direction="→",
            weight=1.0,
        )
    ]
    explanation, cs_list = engine._explain_path(steps)
    assert cs_list == []  # P1.5: no CS without adapter
    assert "科举制度" in explanation or "keju" in explanation.lower()
    assert "wenguan" in explanation.lower() or "文官" in explanation
    assert "[high]" not in explanation
    assert "[low]" not in explanation
    assert " | " not in explanation


# ---------------------------------------------------------------------------
# Test 2: With adapter → structural path + causal enrichment + CS dicts
# ---------------------------------------------------------------------------

def test_with_adapter_causal_enrichment():
    engine = _build_engine(with_causal=True)
    steps = [
        PathStep(
            from_global_id="china_v1:idea-keju",
            to_global_id="china_v1:idea-wenguan",
            relationship="led_to",
            direction="→",
            weight=1.0,
        )
    ]
    explanation, cs_list = engine._explain_path(steps)
    # Structural path
    assert "keju" in explanation.lower() or "科举" in explanation
    # Causal enrichment in text
    assert "[high]" in explanation
    assert " | " in explanation
    # P1.5: structured CS dicts
    assert len(cs_list) >= 1
    cs0 = cs_list[0]
    assert cs0["cause_id"] == "china_v1:idea-keju"
    assert cs0["effect_id"] == "china_v1:idea-wenguan"
    assert isinstance(cs0["mechanism"], str)
    assert isinstance(cs0["consequence"], str)
    assert cs0["confidence"] in ("high", "medium", "low", None)
    assert isinstance(cs0["evidence_refs"], list)


# ---------------------------------------------------------------------------
# Test 3: With adapter, no matching CS → template fallback (C-8)
# ---------------------------------------------------------------------------

def test_with_adapter_no_match_template_fallback():
    engine = _build_engine(with_causal=True)
    steps = [
        PathStep(
            from_global_id="china_v1:idea-keju",
            to_global_id="china_v1:idea-lixue",
            relationship="influenced",
            direction="→",
            weight=1.0,
        )
    ]
    explanation, cs_list = engine._explain_path(steps)
    assert cs_list == []  # P1.5: empty CS list on no match
    assert "[high]" not in explanation
    assert "[low]" not in explanation
    assert " | " not in explanation
    assert "keju" in explanation.lower() or "科举" in explanation


# ---------------------------------------------------------------------------
# Test 4: PathCandidate.causal_statements contains structured CS dicts (P1.5)
# ---------------------------------------------------------------------------

def test_path_candidate_causal_statements():
    engine = _build_engine(with_causal=True)
    candidates = engine.find_connections(
        "china_v1:idea-keju", "china_v1:idea-wenguan"
    ).to_dict()
    # API-level: paths list
    assert "paths" in candidates
    assert len(candidates["paths"]) >= 1
    path0 = candidates["paths"][0]
    assert "explanation" in path0
    # P1.5: causal_statements key present
    assert "causal_statements" in path0
    assert isinstance(path0["causal_statements"], list)
    assert len(path0["causal_statements"]) >= 1
    cs = path0["causal_statements"][0]
    for field in ("cause_id", "effect_id", "mechanism", "consequence", "confidence", "evidence_refs"):
        assert field in cs, f"Missing field {field} in CausalStatement dict"


# ---------------------------------------------------------------------------
# Test 5: Empty steps → "No connecting relationship."
# ---------------------------------------------------------------------------

def test_empty_steps_no_connection():
    engine = _build_engine(with_causal=True)
    explanation, cs_list = engine._explain_path([])
    assert explanation == "No connecting relationship."
    assert cs_list == []


# ---------------------------------------------------------------------------
# Test 6: Multiple CS on same path — all enrichments included
# ---------------------------------------------------------------------------

def test_multiple_cs_on_path():
    engine = _build_engine(with_causal=True)
    steps = [
        PathStep(
            from_global_id="china_v1:idea-keju",
            to_global_id="china_v1:idea-wenguan",
            relationship="led_to",
            direction="→",
            weight=1.0,
        ),
        PathStep(
            from_global_id="china_v1:idea-sanxing-liubu",
            to_global_id="china_v1:idea-neige",
            relationship="evolved_into",
            direction="→",
            weight=1.0,
        ),
    ]
    explanation, cs_list = engine._explain_path(steps)
    assert explanation.count("[high]") >= 1
    assert len(cs_list) >= 1


# ---------------------------------------------------------------------------
# Test 7: API backward compatibility — no adapter → no causal_statements key
# ---------------------------------------------------------------------------

def test_api_no_causal_statements_without_adapter():
    engine = _build_engine(with_causal=False)
    result = engine.find_connections(
        "china_v1:idea-keju", "china_v1:idea-wenguan"
    ).to_dict()
    if result["paths"]:
        path0 = result["paths"][0]
        # Without adapter, causal_statements should be absent or empty
        cs = path0.get("causal_statements", [])
        assert cs == []
