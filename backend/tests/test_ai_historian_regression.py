"""AI Historian (§33/§34) — 11-class behavioural regression suite.

Purpose (QA gate): prove the four non-negotiables of the AI Historian layer
against the ACTUAL implemented contracts — never against assumed behaviour:

  1. The AI cannot fabricate. Any citation the LLM invents is REJECTED by the
     deterministic graph validator, and the answer is flagged `grounded=False`.
  2. The AI can express uncertainty. Rule 11 of SYSTEM_PROMPT mandates it, and
     an uncertainty-worded answer with legal citations still returns cleanly.
  3. Exploration entry points are real. `next_exploration` is a sealed,
     graph-derived artifact that `grounded_answer` passes through verbatim, and
     the prompt forbids the model from inventing candidates.
  4. The temporal gate bites. With the PO-approved `tol=75`, a cross-era
     relationship citation is rejected while adjacent dynasties are accepted.

Test discipline notes
---------------------
* READ-ONLY on production code. This file adds tests; it changes no source.
* The LLM is always a `FakeProvider` injected by monkeypatching
  `answer_service.get_provider`. No network, no SDK, no real key. The fake
  returns EXACTLY what the test wants the "model" to say, so each assertion
  isolates the SERVER-SIDE guarantee rather than model behaviour.
* Assertions target contracts read out of the source (prompt rule text,
  validator return shape, engine names), never values echoed back from the
  implementation under test.
"""
import sys
import types
from pathlib import Path

# Make the `app` package importable (mirrors backend/tests/test_ai_gateway.py).
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import pytest  # noqa: E402

from app.ai_gateway import answer_service  # noqa: E402
from app.ai_gateway.answer_service import (  # noqa: E402
    _build_exploration_context,
    grounded_answer,
)
from app.ai_gateway.citation_model import Citation  # noqa: E402
from app.ai_gateway.config import GroundingTuningConfig  # noqa: E402
from app.ai_gateway.prompt_service import (  # noqa: E402
    _MODE_DIRECTIVES,
    PromptService,
)
from app.ai_gateway.response_validator import ResponseValidator  # noqa: E402


# ---------------------------------------------------------------------------
# Test doubles
# ---------------------------------------------------------------------------

class FakeProvider:
    """Deterministic stand-in for an LLM provider.

    `answer_service` calls `provider.complete(system_prompt, user_prompt,
    max_tokens=2000)`; this double honours that exact signature and records the
    prompts so tests can assert on what the model was actually shown.
    """

    def __init__(self, reply):
        self._reply = reply
        self.system_prompt = None
        self.user_prompt = None
        self.calls = 0

    def complete(self, system_prompt, user_prompt, max_tokens=None):
        self.calls += 1
        self.system_prompt = system_prompt
        self.user_prompt = user_prompt
        return self._reply


class FakeKnowledgeService:
    """Minimal read-only KnowledgeService double.

    Implements only the read methods the AI gateway actually exercises:
    find_by_global_id / global_neighbors / global_subgraph /
    get_timeline_index / get_claims_for_entity / find_global_id / get_source.

    `find_by_global_id` returns the real 3-tuple shape `(topic, local_id,
    entity_dict)` — index 2 is what the temporal gate reads intervals from.
    """

    def __init__(self, entities=None, edges=None, timelines=None,
                 claims=None, sources=None, local_map=None):
        self._entities = dict(entities or {})
        self._edges = dict(edges or {})
        self._timelines = dict(timelines or {})
        self._claims = dict(claims or {})
        self._sources = dict(sources or {})
        self._local_map = dict(local_map or {})

    def find_by_global_id(self, global_id):
        return self._entities.get(global_id)

    def global_neighbors(self, global_id, direction="both"):
        return [dict(n) for n in self._edges.get(global_id, [])]

    def global_subgraph(self, roots, max_depth=2):
        return types.SimpleNamespace(node_count=len(self._entities))

    def get_timeline_index(self, topic):
        return [dict(e) for e in self._timelines.get(topic, [])]

    def get_claims_for_entity(self, global_id):
        return [dict(c) for c in self._claims.get(global_id, [])]

    def find_global_id(self, local_id):
        return self._local_map.get(local_id)

    def get_source(self, source_id):
        return self._sources.get(source_id)


# --- Shared fixture graph: Roman Empire <-[ruled]- Augustus ----------------
# Deliberately tiny and fully enumerable, so "what is inside [ALLOWED FACTS]"
# is unambiguous and anything else is provably fabricated.

ROOT = "rome:empire"
NEIGHBOR = "rome:augustus"
FABRICATED = "rome:emperor-that-never-existed"

_ROME_ENTITIES = {
    ROOT: ("rome", "empire", {
        "name": "罗马帝国",
        "type": "Civilization",
        "description": "横跨地中海的古代帝国",
    }),
    NEIGHBOR: ("rome", "augustus", {
        "name": "奥古斯都",
        "type": "Person",
        "description": "罗马帝国首位皇帝",
    }),
}

_ROME_EDGES = {
    ROOT: [{"global_id": NEIGHBOR, "name": "奥古斯都",
            "relationship": "ruled", "direction": "incoming"}],
    NEIGHBOR: [{"global_id": ROOT, "name": "罗马帝国",
                "relationship": "ruled", "direction": "outgoing"}],
}


def rome_ks():
    """A KnowledgeService whose graph contains EXACTLY two entities."""
    return FakeKnowledgeService(
        entities=_ROME_ENTITIES,
        edges=_ROME_EDGES,
        local_map={"empire": ROOT, "augustus": NEIGHBOR},
    )


def ai_reply(answer, citations):
    """Build a contract-shaped LLM reply (JSON string)."""
    import json
    return json.dumps({"answer": answer, "citations": citations},
                      ensure_ascii=False)


def run_ai(monkeypatch, reply, question="罗马帝国是如何建立的？",
           context=None, mode="explain"):
    """Drive `grounded_answer` through the AI path with a fake provider."""
    provider = FakeProvider(reply)
    monkeypatch.setattr(answer_service, "get_provider", lambda: provider)
    resp = grounded_answer(
        rome_ks(),
        question,
        context if context is not None else [ROOT],
        mode=mode,
    )
    return resp, provider


# ===========================================================================
# 1. Fact — the AI may only assert what [ALLOWED FACTS] contains
# ===========================================================================

class TestFact:
    def test_system_prompt_binds_answer_to_allowed_facts(self):
        sp = PromptService().system_prompt("explain")
        assert "Use ONLY the facts provided in the [ALLOWED FACTS]" in sp
        assert "Never invent historical facts, dates, people, or events." in sp

    def test_prompt_carries_only_the_graph_facts(self, monkeypatch):
        """The fabricated entity is never shown to the model."""
        _resp, provider = run_ai(
            monkeypatch,
            ai_reply("罗马帝国由奥古斯都建立。",
                     [{"global_id": NEIGHBOR, "kind": "entity",
                       "label": "奥古斯都"}]),
        )
        assert "[ALLOWED FACTS]" in provider.user_prompt
        assert "罗马帝国" in provider.user_prompt
        assert FABRICATED not in provider.user_prompt

    def test_fabricated_fact_is_rejected_and_not_grounded(self, monkeypatch):
        """A cited entity absent from the facts => rejected => grounded False.

        This is the anti-fabrication guarantee: the model asserting a
        never-recorded emperor cannot make the response look trustworthy.
        """
        resp, _p = run_ai(
            monkeypatch,
            ai_reply(
                "罗马帝国由一位从未被记载的皇帝在公元前 9999 年建立。",
                [{"global_id": FABRICATED, "kind": "entity",
                  "label": "虚构皇帝"}],
            ),
        )
        assert resp["engine"] == "ai"
        assert resp["grounded"] is False
        assert resp["citations"] == []
        assert [c["global_id"] for c in resp["rejected_citations"]] == [FABRICATED]
        # Fabrication must never be dressed up as confident.
        assert resp["confidence"] == "low"

    def test_legal_citation_is_grounded(self, monkeypatch):
        """Control case: a real entity in the facts IS accepted."""
        resp, _p = run_ai(
            monkeypatch,
            ai_reply("奥古斯都是罗马帝国的首位皇帝。",
                     [{"global_id": NEIGHBOR, "kind": "entity",
                       "label": "奥古斯都"}]),
        )
        assert resp["grounded"] is True
        assert resp["rejected_citations"] == []


# ===========================================================================
# 2. Why (why_happened) — causes must be backed by an allowed fact
# ===========================================================================

class TestWhy:
    def test_mode_registered(self):
        assert "why_happened" in _MODE_DIRECTIVES

    def test_directive_is_about_causes(self):
        directive = _MODE_DIRECTIVES["why_happened"].lower()
        assert "cause" in directive
        assert "never assert a cause that is not backed by an allowed fact" \
            in directive

    def test_grounding_contract_still_leads(self):
        sp = PromptService().system_prompt("why_happened")
        assert "Use ONLY the facts provided in the [ALLOWED FACTS]" in sp
        assert _MODE_DIRECTIVES["why_happened"] in sp


# ===========================================================================
# 3. Cause (why_important) — significance, not invented importance
# ===========================================================================

class TestCause:
    def test_mode_registered(self):
        assert "why_important" in _MODE_DIRECTIVES

    def test_directive_is_about_significance(self):
        directive = _MODE_DIRECTIVES["why_important"].lower()
        assert "significance" in directive
        assert "only the allowed facts" in directive

    def test_grounding_contract_still_leads(self):
        sp = PromptService().system_prompt("why_important")
        assert "Use ONLY the facts provided in the [ALLOWED FACTS]" in sp


# ===========================================================================
# 4. Impact (historical_impact) — consequences from the facts only
# ===========================================================================

class TestImpact:
    def test_mode_registered(self):
        assert "historical_impact" in _MODE_DIRECTIVES

    def test_directive_is_about_impact(self):
        directive = _MODE_DIRECTIVES["historical_impact"].lower()
        assert "impact" in directive
        assert "consequences" in directive
        assert "only the allowed facts" in directive

    def test_unknown_mode_falls_back_to_explain_not_to_a_weaker_contract(self):
        """Regression: an unknown mode must not silently drop the contract."""
        sp = PromptService().system_prompt("not-a-real-mode")
        assert "Use ONLY the facts provided in the [ALLOWED FACTS]" in sp
        assert _MODE_DIRECTIVES["explain"] in sp


# ===========================================================================
# 5. Relationship — never claim an edge absent from the facts
# ===========================================================================

class TestRelationship:
    def test_system_prompt_forbids_invented_relationships(self):
        sp = PromptService().system_prompt("explain")
        assert ("Never claim relationships between entities that are not "
                "present in [ALLOWED FACTS]") in sp

    def test_invented_relationship_citation_is_rejected(self, monkeypatch):
        """A relationship citation that is not a real neighbour edge is dropped."""
        resp, _p = run_ai(
            monkeypatch,
            ai_reply(
                "罗马帝国征服了一个并不存在于知识图谱中的实体。",
                [{"global_id": "rome:ghost-kingdom", "kind": "relationship",
                  "label": "conquered"}],
            ),
        )
        assert resp["grounded"] is False
        rejected = resp["rejected_citations"]
        assert len(rejected) == 1
        assert rejected[0]["kind"] == "relationship"
        assert rejected[0]["global_id"] == "rome:ghost-kingdom"

    def test_real_relationship_edge_is_accepted(self, monkeypatch):
        """Control: `ruled` IS a real edge from the context entity."""
        resp, _p = run_ai(
            monkeypatch,
            ai_reply("奥古斯都统治了罗马帝国。",
                     [{"global_id": NEIGHBOR, "kind": "relationship",
                       "label": "ruled"}]),
        )
        assert resp["grounded"] is True
        assert resp["citations"][0]["label"] == "ruled"


# ===========================================================================
# 6. Temporal — the ADR-0028 gate at the PO-approved tol=75
# ===========================================================================

_TEMPORAL_ENTITIES = {
    "t:a": ("t", "a", {"name": "甲朝", "type": "Time Period",
                       "start_date": {"value": 100},
                       "end_date": {"value": 150}}),
    # gap to 甲朝 = 1000 - 150 = 850 years  -> cross_gen at tol=75
    "t:far": ("t", "far", {"name": "远朝", "type": "Time Period",
                           "start_date": {"value": 1000},
                           "end_date": {"value": 1050}}),
    # gap to 甲朝 = 160 - 150 = 10 years    -> adjacent at tol=75
    "t:near": ("t", "near", {"name": "近朝", "type": "Time Period",
                             "start_date": {"value": 160},
                             "end_date": {"value": 200}}),
}

_TEMPORAL_EDGES = {
    "t:a": [
        {"global_id": "t:far", "name": "远朝", "relationship": "ruled",
         "direction": "both"},
        {"global_id": "t:near", "name": "近朝", "relationship": "ruled",
         "direction": "both"},
    ],
}


def _temporal_ks():
    return FakeKnowledgeService(entities=_TEMPORAL_ENTITIES,
                                edges=_TEMPORAL_EDGES)


class TestTemporal:
    """Behavioural gate test — `ruled` is a HARD relation (Contract §3),
    so cross-generation is a REJECT and adjacency is an ACCEPT."""

    def test_cross_era_relationship_citation_is_rejected(self):
        validator = ResponseValidator(_temporal_ks(),
                                      tuning=GroundingTuningConfig(tol=75))
        cite = Citation("t:far", "relationship", "ruled")
        result = validator.validate([cite], ["t:a"])
        assert result.valid_citations == []
        assert result.rejected_citations == [cite]
        assert result.grounded is False
        # Audit provenance must name the temporal re-check.
        assert len(result.temporal_rejects) == 1
        assert result.temporal_rejects[0]["global_id"] == "t:far"
        assert result.temporal_rejects[0]["relationship"] == "ruled"

    def test_adjacent_dynasty_relationship_citation_is_accepted(self):
        validator = ResponseValidator(_temporal_ks(),
                                      tuning=GroundingTuningConfig(tol=75))
        cite = Citation("t:near", "relationship", "ruled")
        result = validator.validate([cite], ["t:a"])
        assert result.valid_citations == [cite]
        assert result.rejected_citations == []
        assert result.grounded is True
        assert result.temporal_rejects == []

    def test_gate_is_dormant_without_tuning(self):
        """Production default (`tuning=None`) must not change behaviour."""
        validator = ResponseValidator(_temporal_ks())
        cite = Citation("t:far", "relationship", "ruled")
        result = validator.validate([cite], ["t:a"])
        assert result.valid_citations == [cite]
        assert result.temporal_rejects == []

    def test_answer_service_wires_the_po_approved_tolerance(self):
        """Guard the wiring: both the builder and the validator get tol=75."""
        src = (BACKEND_DIR / "app" / "ai_gateway" / "answer_service.py").read_text(
            encoding="utf-8"
        )
        assert src.count("GroundingTuningConfig(tol=75)") >= 2


# ===========================================================================
# 7. Comparison (multi_civilization_view) — cross-civilization synthesis
# ===========================================================================

class TestComparison:
    def test_mode_registered(self):
        assert "multi_civilization_view" in _MODE_DIRECTIVES

    def test_directive_compares_across_civilizations(self):
        directive = _MODE_DIRECTIVES["multi_civilization_view"].lower()
        assert "across" in directive
        assert "civilization" in directive

    def test_comparison_mode_reaches_the_provider_verbatim(self, monkeypatch):
        resp, provider = run_ai(
            monkeypatch,
            ai_reply("罗马帝国与同期文明的可比之处见于所给事实。",
                     [{"global_id": ROOT, "kind": "entity",
                       "label": "罗马帝国"}]),
            question="罗马帝国与其他文明如何比较？",
            mode="multi_civilization_view",
        )
        assert resp["mode"] == "multi_civilization_view"
        assert _MODE_DIRECTIVES["multi_civilization_view"] in provider.system_prompt


# ===========================================================================
# 8. Uncertainty — the model is REQUIRED to be able to say "I can't confirm"
# ===========================================================================

class TestUncertainty:
    def test_rule_11_mandates_explicit_uncertainty(self):
        sp = PromptService().system_prompt("explain")
        assert "explicitly state that the current knowledge cannot confirm" in sp
        assert "Do not fill gaps with outside knowledge or guesses." in sp

    def test_rule_10_separates_fact_from_interpretation(self):
        sp = PromptService().system_prompt("explain")
        assert "never present interpretation as if it were a stated fact" in sp

    def test_uncertain_answer_with_legal_citations_survives(self, monkeypatch):
        """Hedging must not be punished: legal citations still ground it."""
        hedged = "现有知识不足，无法确认罗马帝国建立的确切动因；可确认的是奥古斯都为首位皇帝。"
        resp, _p = run_ai(
            monkeypatch,
            ai_reply(hedged, [{"global_id": NEIGHBOR, "kind": "entity",
                               "label": "奥古斯都"}]),
        )
        assert resp["engine"] == "ai"
        assert resp["grounded"] is True
        assert resp["answer"] == hedged
        assert "无法确认" in resp["answer"]
        assert resp["confidence"] == "high"

    def test_uncertain_answer_with_no_citations_is_not_grounded(self, monkeypatch):
        """Zero citations => never grounded, never confident."""
        resp, _p = run_ai(
            monkeypatch,
            ai_reply("现有知识无法确认这一点。", []),
        )
        assert resp["grounded"] is False
        assert resp["confidence"] == "low"


# ===========================================================================
# 9. Out-of-context — questions beyond [ALLOWED FACTS] get no invented answer
# ===========================================================================

class TestOutOfContext:
    def test_rule_5_requires_refusal_when_facts_do_not_cover(self):
        sp = PromptService().system_prompt("explain")
        assert "say you cannot answer from the current knowledge" in sp

    def test_rule_8_forbids_wandering_to_unrelated_subjects(self):
        sp = PromptService().system_prompt("explain")
        assert "you MUST NOT wander to unrelated subjects" in sp

    def test_out_of_scope_entity_yields_refusal_not_fabrication(self, monkeypatch):
        """Asking about an entity outside the facts must not produce facts."""
        refusal = "无法从当前知识回答关于明朝海禁政策的问题。"
        resp, provider = run_ai(
            monkeypatch,
            ai_reply(refusal, []),
            question="明朝的海禁政策为何实施？",
        )
        # The out-of-scope subject was never in the grounding context...
        assert "明朝" not in provider.user_prompt.split("Question:")[0]
        # ...and the response neither grounds nor invents.
        assert resp["grounded"] is False
        assert "无法从当前知识回答" in resp["answer"]
        assert resp["citations"] == []

    def test_out_of_scope_citation_attempt_is_rejected(self, monkeypatch):
        """Even if the model cites an out-of-scope id, it is dropped."""
        resp, _p = run_ai(
            monkeypatch,
            ai_reply("明朝实施海禁以防倭寇。",
                     [{"global_id": "ming:policy-haijin", "kind": "entity",
                       "label": "海禁"}]),
            question="明朝的海禁政策为何实施？",
        )
        assert resp["grounded"] is False
        assert resp["citations"] == []
        assert resp["rejected_citations"][0]["global_id"] == "ming:policy-haijin"

    def test_empty_context_never_calls_the_model(self, monkeypatch):
        """No grounding context => deterministic fallback, no AI guessing."""
        provider = FakeProvider(ai_reply("不应该被调用", []))
        monkeypatch.setattr(answer_service, "get_provider", lambda: provider)
        resp = grounded_answer(rome_ks(), "随便问点什么", [])
        assert provider.calls == 0
        assert resp["grounded"] is False
        assert resp["engine"] == "deterministic"


# ===========================================================================
# 10. Unsupported — an unparsable LLM reply degrades, never crashes
# ===========================================================================

class TestUnsupported:
    def test_unparsable_reply_becomes_ai_unverified(self, monkeypatch):
        garbage = "抱歉，这里没有任何结构化数据，只是一段纯文本的胡言乱语。"
        resp, _p = run_ai(monkeypatch, garbage)
        assert resp["engine"] == "ai_unverified"
        assert resp["grounded"] is False
        assert resp["answer"] == garbage
        assert resp["citations"] == []
        assert resp["confidence"] == "low"

    def test_markdown_fence_is_stripped_before_surfacing(self, monkeypatch):
        """An unstable reply must never reach the UI as a raw code block."""
        resp, _p = run_ai(monkeypatch, "```json\nnot valid json at all\n```")
        assert resp["engine"] == "ai_unverified"
        assert "```" not in resp["answer"]
        assert resp["answer"] == "not valid json at all"

    def test_contract_keys_are_still_whole(self, monkeypatch):
        """Degradation must not break the frontend contract."""
        resp, _p = run_ai(monkeypatch, "完全不是 JSON")
        for key in ("answer", "perspectives", "evidence", "confidence",
                    "citations", "rejected_citations", "grounded", "engine",
                    "next_exploration", "question", "context_global_ids",
                    "mode"):
            assert key in resp, "missing contract key: %s" % key

    def test_provider_exception_degrades_to_deterministic(self, monkeypatch):
        """A throwing provider must never 500."""
        class Boom:
            def complete(self, system_prompt, user_prompt, max_tokens=None):
                raise RuntimeError("upstream timeout")

        monkeypatch.setattr(answer_service, "get_provider", lambda: Boom())
        resp = grounded_answer(rome_ks(), "罗马帝国是如何建立的？", [ROOT])
        assert resp["engine"] == "deterministic"
        assert resp["grounded"] is False


# ===========================================================================
# 11. Exploration — real, clickable, graph-derived entry points only
# ===========================================================================

_NEXT_EXPLORATION = [
    {
        "global_id": NEIGHBOR,
        "label": "奥古斯都",
        "relationship": "ruled",
        "reason": "同源证据链",
        "source_id": "src-1",
        "claim_ids": ["ec-1"],
    },
]


class TestExploration:
    def test_rule_12_forbids_inventing_candidates(self):
        sp = PromptService().system_prompt("explain")
        assert "ONLY reference items listed there" in sp
        assert "never invent a relationship, entity, or candidate of your own" in sp

    def test_context_builder_includes_only_given_candidates(self):
        out = _build_exploration_context(_NEXT_EXPLORATION)
        assert "[EXPLORATION CANDIDATES]" in out
        assert NEIGHBOR in out
        assert "ruled" in out
        assert "同源证据链" in out
        # Nothing beyond the supplied candidate leaks in.
        assert FABRICATED not in out
        assert ROOT not in out

    def test_context_builder_is_empty_when_nothing_is_planned(self):
        assert _build_exploration_context([]) == ""
        assert _build_exploration_context(None) == ""

    def test_candidate_without_global_id_is_dropped(self):
        """Not clickable => not offered."""
        out = _build_exploration_context([{"relationship": "ruled",
                                          "reason": "无目标"}])
        assert out == ""

    def test_candidates_reach_the_prompt(self, monkeypatch):
        monkeypatch.setattr(answer_service, "_run_phase2",
                            lambda *a, **k: ([], [], _NEXT_EXPLORATION))
        _resp, provider = run_ai(
            monkeypatch,
            ai_reply("可进一步探索奥古斯都。",
                     [{"global_id": NEIGHBOR, "kind": "entity",
                       "label": "奥古斯都"}]),
        )
        assert "[EXPLORATION CANDIDATES]" in provider.user_prompt
        assert NEIGHBOR in provider.user_prompt

    def test_next_exploration_is_passed_through_verbatim(self, monkeypatch):
        """The planner artifact is sealed: the AI path must not reshape it."""
        monkeypatch.setattr(answer_service, "_run_phase2",
                            lambda *a, **k: ([], [], _NEXT_EXPLORATION))
        resp, _p = run_ai(
            monkeypatch,
            ai_reply("可进一步探索奥古斯都。",
                     [{"global_id": NEIGHBOR, "kind": "entity",
                       "label": "奥古斯都"}]),
        )
        assert resp["next_exploration"] == _NEXT_EXPLORATION
        assert len(resp["next_exploration"]) == 1
        item = resp["next_exploration"][0]
        # Every field the frontend needs to render a clickable card.
        assert item["global_id"] == NEIGHBOR
        assert item["relationship"] == "ruled"
        assert item["source_id"] == "src-1"

    def test_next_exploration_survives_an_unparsable_reply(self, monkeypatch):
        """Exploration entry points must not vanish when the LLM misbehaves."""
        monkeypatch.setattr(answer_service, "_run_phase2",
                            lambda *a, **k: ([], [], _NEXT_EXPLORATION))
        resp, _p = run_ai(monkeypatch, "根本不是 JSON")
        assert resp["engine"] == "ai_unverified"
        assert resp["next_exploration"] == _NEXT_EXPLORATION
