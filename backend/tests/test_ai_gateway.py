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
