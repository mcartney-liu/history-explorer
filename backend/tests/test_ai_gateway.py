"""M11-1 AI Gateway Foundation — minimal governance + smoke tests.

These verify the foundation is importable, degrades safely when disabled or
missing credentials, and contains no forbidden infrastructure tokens.
"""
import importlib
import os
import re
import sys
from pathlib import Path

# Make the `app` package importable (mirrors backend/tests/test_api_v1.py).
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import pytest

from app.ai_gateway import (  # noqa: E402
    AIUnavailableError,
    PromptService,
    get_config,
    get_fallback_response,
    get_provider,
)


def _clear_ai_env(monkeypatch):
    for k in ("AI_GATEWAY_ENABLED", "AI_PROVIDER", "AI_API_KEY"):
        monkeypatch.delenv(k, raising=False)


def test_ai_gateway_module_imports():
    mod = importlib.import_module("app.ai_gateway")
    assert hasattr(mod, "get_provider")
    assert hasattr(mod, "PromptService")
    assert hasattr(mod, "get_fallback_response")
    assert hasattr(mod, "AIUnavailableError")


def test_ai_disabled_returns_none_provider(monkeypatch):
    _clear_ai_env(monkeypatch)
    monkeypatch.setenv("AI_GATEWAY_ENABLED", "false")
    assert get_config().is_enabled is False
    assert get_provider() is None


def test_ai_enabled_but_missing_key_returns_none(monkeypatch):
    _clear_ai_env(monkeypatch)
    monkeypatch.setenv("AI_GATEWAY_ENABLED", "true")
    monkeypatch.delenv("AI_API_KEY", raising=False)
    assert get_provider() is None


def test_unknown_provider_returns_none(monkeypatch):
    _clear_ai_env(monkeypatch)
    monkeypatch.setenv("AI_GATEWAY_ENABLED", "true")
    monkeypatch.setenv("AI_API_KEY", "sk-test")
    monkeypatch.setenv("AI_PROVIDER", "not-a-real-provider")
    assert get_provider() is None


def test_fallback_response_is_deterministic():
    resp = get_fallback_response()
    assert resp["grounded"] is False
    assert resp["engine"] == "deterministic"
    assert isinstance(resp["answer"], str) and resp["answer"]


def test_prompt_service_grounds_only_provided_facts():
    ps = PromptService()
    up = ps.user_prompt("What happened?", ["Rome founded in 753 BC"])
    assert "ALLOWED FACTS" in up
    assert "753 BC" in up
    assert "Question:" in up


def test_unknown_provider_raises_no_error(monkeypatch):
    # get_provider must never raise for an unknown provider — just degrade.
    _clear_ai_env(monkeypatch)
    monkeypatch.setenv("AI_GATEWAY_ENABLED", "true")
    monkeypatch.setenv("AI_API_KEY", "sk-test")
    monkeypatch.setenv("AI_PROVIDER", "anthropic")
    assert get_provider() is None


def test_no_forbidden_infra_tokens_in_source():
    """Guard: ai_gateway must never reference forbidden infrastructure."""
    banned = {"rag", "neo4j", "redis", "vectordb", "langchain", "graphql"}
    base = BACKEND_DIR / "app" / "ai_gateway"
    for f in base.rglob("*.py"):
        text = f.read_text(encoding="utf-8")
        # Strip strings/comments so only code-logic mentions count.
        code = re.sub(r'"""[\s\S]*?"""', "", text)
        code = re.sub(r"'''[\s\S]*?'''", "", code)
        code = re.sub(r"#.*$", "", code, flags=re.M)
        code = re.sub(r'"[^"]*"', "", code)
        code = re.sub(r"'[^']*'", "", code)
        lowcode = code.lower()
        for b in banned:
            assert b not in lowcode, "%s contains forbidden token '%s'" % (f.name, b)


# ---------------------------------------------------------------------------
# M36.0 AI Response Contract — unit tests for confidence / evidence helpers
# ---------------------------------------------------------------------------

from app.ai_gateway.answer_service import (  # noqa: E402
    _build_evidence,
    _claim_evidence,
    _compute_confidence,
    _is_provenance_note,
    _perspectives_from_claims,
)
from app.ai_gateway.citation_model import Citation, ClaimEntry  # noqa: E402


class TestComputeConfidence:
    def test_all_grounded_high(self):
        assert _compute_confidence(True, 5, 5) == "high"

    def test_partial_grounded_medium(self):
        assert _compute_confidence(False, 3, 5) == "medium"

    def test_few_valid_low(self):
        assert _compute_confidence(False, 1, 5) == "low"

    def test_ungrounded_few_valid_low(self):
        # grounded=False but very few valid citations → low
        assert _compute_confidence(False, 2, 5) == "low"

    def test_zero_citations_low(self):
        assert _compute_confidence(True, 0, 0) == "low"

    def test_single_citation_grounded_high(self):
        # grounded=True means all checked-out, single citation => ratio=1.0
        assert _compute_confidence(True, 1, 1) == "high"


def _claim(claim_id, note=None, controversy=None):
    truth = None
    if note is not None or controversy is not None:
        truth = {"interpretation_note": note, "controversy_level": controversy}
    return ClaimEntry(claim_id, "s", "text", "src-a", "gid", None, None, True, truth)


class TestPerspectivesFromClaims:
    """ADR-0018: dissent comes from curated interpretation_note, not the LLM."""

    def test_no_claims(self):
        assert _perspectives_from_claims([]) == []

    def test_claim_without_truth(self):
        assert _perspectives_from_claims([_claim("ec-1")]) == []

    def test_uses_interpretation_note(self):
        assert _perspectives_from_claims([_claim("ec-1", "note A")]) == ["note A"]

    def test_deduplicates(self):
        claims = [_claim("ec-1", "same"), _claim("ec-2", "same")]
        assert _perspectives_from_claims(claims) == ["same"]

    def test_contested_claims_lead(self):
        claims = [
            _claim("ec-1", "settled", "none"),
            _claim("ec-2", "contested", "medium"),
        ]
        assert _perspectives_from_claims(claims) == ["contested", "settled"]

    def test_bounded(self):
        claims = [_claim("ec-%d" % i, "note %d" % i) for i in range(6)]
        assert len(_perspectives_from_claims(claims)) == 3


class TestD1TruthLayerLeak:
    """D1 (truth-layer leak): internal provenance notes must NOT surface as
    scholarly dissent, and must NOT ride along in the evidence payload."""

    PROVENANCE_NOTE = (
        "Curated seed relationship with a real primary/secondary source; "
        "not an auto-inference."
    )

    def test_is_provenance_note_detects_seed_marker(self):
        assert _is_provenance_note(self.PROVENANCE_NOTE) is True

    def test_is_provenance_note_ignores_genuine_dissent(self):
        assert _is_provenance_note("不同史家对这段记载有争议") is False

    def test_provenance_note_skipped_in_perspectives(self):
        claims = [
            _claim("ec-prov", self.PROVENANCE_NOTE, "low"),
            _claim("ec-real", "不同史家对这段记载有争议", "medium"),
        ]
        assert _perspectives_from_claims(claims) == [
            "不同史家对这段记载有争议"
        ]

    def test_only_provenance_yields_empty_perspectives(self):
        claims = [_claim("ec-prov", self.PROVENANCE_NOTE, "low")]
        assert _perspectives_from_claims(claims) == []


class TestClaimEvidencePayload:
    def test_truth_grading_only_excludes_interpretation_note(self):
        claim = _claim("ec-real", "不同史家对这段记载有争议", "medium")
        evidence = _claim_evidence([claim], [{"id": "src-a", "title": "T", "tier": "A"}])
        assert len(evidence) == 1
        truth = evidence[0]["truth"]
        assert truth == {
            "confidence": None,
            "scholar_consensus": None,
            "controversy_level": "medium",
        }
        assert "interpretation_note" not in truth

    def test_provenance_note_not_in_evidence_truth(self):
        claim = _claim(
            "ec-prov",
            "Curated seed relationship with a real primary/secondary source; "
            "not an auto-inference.",
            "low",
        )
        evidence = _claim_evidence([claim], [{"id": "src-a", "title": "T", "tier": "A"}])
        assert "interpretation_note" not in evidence[0]["truth"]


class TestBuildEvidence:
    def test_empty_citations(self):
        assert _build_evidence([]) == []

    def test_maps_citations_to_evidence(self):
        c1 = Citation("ancient_india:person-ashoka", "entity", "Ashoka")
        c2 = Citation("timeline::ashoka::0", "timeline", "Ashoka Reign")
        evidence = _build_evidence([c1, c2])
        assert len(evidence) == 2
        assert evidence[0] == {
            "global_id": "ancient_india:person-ashoka",
            "kind": "entity",
            "label": "Ashoka",
            "status": "verified",
        }
        assert evidence[1] == {
            "global_id": "timeline::ashoka::0",
            "kind": "timeline",
            "label": "Ashoka Reign",
            "status": "verified",
        }


# ---------------------------------------------------------------------------
# M36.1 Event Intelligence Layer — data integrity tests
# ---------------------------------------------------------------------------

import json  # noqa: E402


def _load_event_data(dataset):
    path = BACKEND_DIR.parent / "data" / "examples" / f"{dataset}_example.json"
    return json.loads(path.read_text(encoding="utf-8"))


class TestM361RomanEventIntegrity:
    """Verify that M36.1 event causal-chain data is loadable and self-consistent."""

    def test_all_events_load(self):
        d = _load_event_data("roman_empire")
        events = [e for e in d["entities"] if e["type"] == "Event"]
        assert len(events) == 5, f"Expected 5 Events, got {len(events)}"

    def test_event_ids_present(self):
        d = _load_event_data("roman_empire")
        eids = {e["id"] for e in d["entities"] if e["type"] == "Event"}
        assert "event-republic-end" in eids
        assert "event-roman-empire-established" in eids
        assert "event-pax-romana" in eids
        assert "event-empire-fall" in eids
        assert "event-edict-milan" in eids

    def test_causal_chain_exists(self):
        d = _load_event_data("roman_empire")
        rels = d["relationships"]
        causal = [
            r for r in rels
            if r["type"] in ("caused", "influenced", "before", "after")
            and any(e["id"] == r["source"] for e in d["entities"] if e["type"] == "Event")
            and any(e["id"] == r["target"] for e in d["entities"] if e["type"] == "Event")
        ]
        assert len(causal) >= 4, f"Expected ≥4 Event->Event causal edges, got {len(causal)}"

    def test_republic_end_caused_empire(self):
        d = _load_event_data("roman_empire")
        assert any(
            r["source"] == "event-republic-end"
            and r["target"] == "event-roman-empire-established"
            and r["type"] == "caused"
            for r in d["relationships"]
        ), "Missing: event-republic-end →[caused]→ event-roman-empire-established"

    def test_empire_caused_pax_romana(self):
        d = _load_event_data("roman_empire")
        assert any(
            r["source"] == "event-roman-empire-established"
            and r["target"] == "event-pax-romana"
            and r["type"] == "caused"
            for r in d["relationships"]
        ), "Missing: event-roman-empire-established →[caused]→ event-pax-romana"

    def test_event_targets_exist_as_entities(self):
        d = _load_event_data("roman_empire")
        eids = {e["id"] for e in d["entities"]}
        # Cross-topic targets (e.g. "hellenistic_world:civ-greek") are valid
        # global_id references to other datasets, not local ids.
        for r in d["relationships"]:
            tgt = r["target"]
            if ":" in tgt and not any(e["id"] == tgt for e in d["entities"]):
                # cross-topic global_id — skip local-id check
                continue
            assert tgt in eids, f"Relationship target '{tgt}' not in entities"
            assert r["source"] in eids, \
                f"Relationship source '{r['source']}' not in entities"

    def test_relationship_types_are_allowed(self):
        from app.validation import RELATIONSHIP_TYPES
        d = _load_event_data("roman_empire")
        for r in d["relationships"]:
            assert r["type"] in RELATIONSHIP_TYPES, \
                f"Relationship type '{r['type']}' not in RELATIONSHIP_TYPES"


class TestM361HellenisticEventIntegrity:
    def test_all_events_load(self):
        d = _load_event_data("hellenistic_world")
        events = [e for e in d["entities"] if e["type"] == "Event"]
        assert len(events) == 4, f"Expected 4 Events, got {len(events)}"

    def test_alexander_conquest_causes_gaugamela(self):
        d = _load_event_data("hellenistic_world")
        assert any(
            r["source"] == "event-alexander-conquest"
            and r["target"] == "event-gaugamela"
            and r["type"] == "caused"
            for r in d["relationships"]
        ), "Missing: event-alexander-conquest →[caused]→ event-gaugamela"

    def test_conquest_causes_diadochi(self):
        d = _load_event_data("hellenistic_world")
        assert any(
            r["source"] == "event-alexander-conquest"
            and r["target"] == "event-diadochi-wars"
            and r["type"] == "caused"
            for r in d["relationships"]
        ), "Missing: event-alexander-conquest →[caused]→ event-diadochi-wars"

    def test_gaugamela_before_alexandria(self):
        d = _load_event_data("hellenistic_world")
        assert any(
            r["source"] == "event-gaugamela"
            and r["target"] == "event-alexandria-founded"
            and r["type"] == "before"
            for r in d["relationships"]
        ), "Missing: event-gaugamela →[before]→ event-alexandria-founded"


class TestM361FreezeInvariants:
    """Verify schema/enum boundaries are NOT breached by M36.1 data changes."""

    def test_entity_types_unchanged(self):
        from app.validation import ENTITY_TYPES
        assert len(ENTITY_TYPES) == 8, f"ENTITY_TYPES count changed: {len(ENTITY_TYPES)}"

    def test_relationship_types_unchanged(self):
        from app.validation import RELATIONSHIP_TYPES
        # ADR-0019: 18 -> 20 (disputes/reinterprets, PO-approved)
        assert len(RELATIONSHIP_TYPES) == 20, \
            f"RELATIONSHIP_TYPES count changed: {len(RELATIONSHIP_TYPES)}"

    def test_all_event_types_valid(self):
        from app.validation import ENTITY_TYPES
        for ds in ("roman_empire", "hellenistic_world"):
            d = _load_event_data(ds)
            for e in d["entities"]:
                assert e["type"] in ENTITY_TYPES, \
                    f"Entity '{e['id']}' type '{e['type']}' not in ENTITY_TYPES"

    def test_all_rel_types_valid(self):
        from app.validation import RELATIONSHIP_TYPES
        for ds in ("roman_empire", "hellenistic_world"):
            d = _load_event_data(ds)
            for r in d["relationships"]:
                assert r["type"] in RELATIONSHIP_TYPES, \
                    f"Rel type '{r['type']}' not in RELATIONSHIP_TYPES"


# ---------------------------------------------------------------------------
# AI Historian (§33/§34) — exploration-context builder + JSON contract unity
# ---------------------------------------------------------------------------

from app.ai_gateway.answer_service import _build_exploration_context  # noqa: E402


class TestExplorationContextBuilder:
    def test_empty_returns_empty_string(self):
        assert _build_exploration_context([]) == ""
        assert _build_exploration_context(None) == ""

    def test_formats_candidates(self):
        ne = [
            {"global_id": "ancient_india:civ-maurya", "relationship": "influenced",
             "reason": "shared trade routes"},
            {"global_id": "ancient_india:person-ashoka", "relationship": "caused",
             "reason": ""},
        ]
        out = _build_exploration_context(ne)
        assert "[EXPLORATION CANDIDATES]" in out
        assert "ancient_india:civ-maurya" in out
        assert "influenced" in out
        assert "shared trade routes" in out
        assert "ancient_india:person-ashoka" in out

    def test_does_not_invent(self):
        ne = [{"global_id": "g:1", "relationship": "before"}]
        out = _build_exploration_context(ne)
        assert "g:1" in out and "before" in out


class TestJsonContractUnified:
    def test_system_prompt_uses_json_contract(self):
        ps = PromptService()
        sp = ps.system_prompt("explain")
        assert '"answer"' in sp and '"citations"' in sp
        # The contradictory instruction must be gone
        assert "Do NOT wrap it in JSON" not in sp
        for mode in ("why_important", "why_happened", "historical_impact",
                     "multi_civilization_view", "timeline_explanation"):
            assert '"answer"' in ps.system_prompt(mode)

    def test_grounding_not_weakened(self):
        sp = PromptService().system_prompt("explain")
        assert "Use ONLY the facts provided in the [ALLOWED FACTS]" in sp
