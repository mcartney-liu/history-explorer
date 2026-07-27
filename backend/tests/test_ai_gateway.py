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
    _compute_confidence,
    _extract_perspectives,
)
from app.ai_gateway.citation_model import Citation  # noqa: E402


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


class TestExtractPerspectives:
    def test_empty_list(self):
        assert _extract_perspectives({"perspectives": []}) == []

    def test_missing_key(self):
        assert _extract_perspectives({}) == []

    def test_string_items(self):
        parsed = {"perspectives": ["view A", "view B"]}
        assert _extract_perspectives(parsed) == ["view A", "view B"]

    def test_filters_non_strings(self):
        parsed = {"perspectives": ["ok", None, 42, "  fine  ", []]}
        assert _extract_perspectives(parsed) == ["ok", "42", "fine"]

    def test_not_a_list(self):
        assert _extract_perspectives({"perspectives": "not-a-list"}) == []


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
