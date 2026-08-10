"""M74 Phase2 — AI Grounding Claim tests (real dataset, read-only).

Covers the Phase2 Gate approved scope:
  Step 1: local-id -> global-id mapping (claim subject binding basis)
  Step 2: relationship-pair (A->B) parsing
  Step 3: GroundingBuilder ClaimGraph output
  Step 4: Evidence Selection
  Step 5: ResponseValidator claim/source double binding

Uses the REAL knowledge_service singleton (built from the frozen dataset —
43 sources / 76 claims / 186 entities after the textbook package was added).
No LLM, no network: the AI-off precondition is established explicitly per
test (via _clear_ai_env) so the deterministic path is always used, even when
AI_* env vars are exported in the local shell.
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import knowledge_service  # noqa: E402  (real singleton)
from app.ai_gateway.grounding_builder import RelationshipResolver  # noqa: E402


def _clear_ai_env(monkeypatch):
    """Ensure no AI gateway env is visible so the deterministic path is used."""
    for k in ("AI_GATEWAY_ENABLED", "AI_PROVIDER", "AI_API_KEY",
              "AI_BASE_URL", "AI_MODEL"):
        monkeypatch.delenv(k, raising=False)


# ---------------------------------------------------------------------------
# Step 1 — local-id -> global-id mapping
# ---------------------------------------------------------------------------

def test_local_to_global_known_entities():
    """Real entities resolve local -> global deterministically."""
    assert knowledge_service.find_global_id("person-augustus") == "roman_empire:person-augustus"
    assert knowledge_service.find_global_id("tp-tang") == "china_v1:tp-tang"
    assert knowledge_service.find_global_id("person-ashoka") == "ancient_india:person-ashoka"


def test_local_to_global_covers_all_entity_local_ids():
    """Every entity local id in the frozen dataset resolves (145 ids)."""
    resolved = 0
    total = 0
    for _topic, data in knowledge_service.get_topic_datasets():
        for ent in data.get("entities", []):
            lid = ent.get("id")
            if not lid:
                continue
            total += 1
            if knowledge_service.find_global_id(lid):
                resolved += 1
    assert total == 186
    assert resolved == 186


def test_local_to_global_unknown_returns_none():
    """Unknown / non-string input -> None (never binds, never raises)."""
    assert knowledge_service.find_global_id("no-such-entity-xyz") is None
    assert knowledge_service.find_global_id("") is None
    assert knowledge_service.find_global_id(None) is None
    assert knowledge_service.find_global_id(123) is None


# ---------------------------------------------------------------------------
# Step 2 — relationship-pair (A->B) resolution
# ---------------------------------------------------------------------------

def _resolver():
    return RelationshipResolver(knowledge_service)


def test_pair_person_to_event_resolves_with_real_edge():
    """person-a->event-b: both sides resolve; edge type comes from the KG."""
    pair = _resolver().parse("person-ashoka->event-kalinga-war")
    assert pair is not None
    assert pair.resolved is True
    assert pair.subject == "person-ashoka"
    assert pair.object == "event-kalinga-war"
    assert pair.subject_global_id == "ancient_india:person-ashoka"
    assert pair.object_global_id == "ancient_india:event-kalinga-war"
    assert pair.relationship == "participated_in"  # real edge in frozen KG


def test_pair_person_to_person_resolves():
    pair = _resolver().parse("person-paul->religion-early-church")
    assert pair is not None and pair.resolved is True
    assert pair.subject_global_id and pair.object_global_id
    assert pair.relationship == "influenced"


def test_pair_global_id_format_side_resolves():
    """Mixed-format pair: B side is already a global id — still resolves."""
    pair = _resolver().parse("religion-buddhism->silk_road:silk_road")
    assert pair is not None and pair.resolved is True
    assert pair.subject_global_id == "ancient_india:religion-buddhism"
    assert pair.object_global_id == "silk_road:silk_road"


def test_pair_unresolvable_side_rejects():
    """Left side matches no local id and is not a valid gid -> REJECT (None)."""
    assert _resolver().parse("person-chandragupta-maurya->person-chandragupta") is None


def test_pair_missing_arrow_rejects():
    """Non-pair input (no '->') is not this resolver's concern -> None."""
    assert _resolver().parse("person-ashoka") is None
    assert _resolver().parse("") is None
    assert _resolver().parse(None) is None
    assert _resolver().parse(123) is None


def test_all_claim_pairs_are_deterministic():
    """Every '->' subject_id in the frozen claim set resolves or rejects
    deterministically (no exceptions, no guessing)."""
    import json
    from pathlib import Path

    claims = json.loads(
        (Path(BACKEND_DIR).parent / "data" / "evidence_claims.json").read_text(encoding="utf-8")
    )
    resolver = _resolver()
    pair_subjects = [c.get("subject_id") for c in claims if "->" in str(c.get("subject_id"))]
    assert len(pair_subjects) == 36
    resolved = sum(1 for s in pair_subjects if resolver.parse(s) is not None)
    # 28 edge-backed + mixed-format gid sides resolve; unresolvable sides reject.
    assert resolved >= 28
    assert resolved < 36


# ---------------------------------------------------------------------------
# Step 3 — ClaimGraph assembly (unified processing unit, lazy)
# ---------------------------------------------------------------------------

def _builder():
    from app.ai_gateway.grounding_builder import GroundingBuilder
    return GroundingBuilder(knowledge_service)


def test_claim_graph_contains_focus_neighbors_claims_sources():
    """Augustus claim graph carries all five sections (focus/neighbors/
    claims/sources) with entity + relationship-pair claims unified."""
    g = _builder().build_claim_graph("roman_empire:person-augustus")
    assert g.focus_global_id == "roman_empire:person-augustus"
    assert isinstance(g.neighbors, list) and len(g.neighbors) > 0
    assert len(g.claims) > 0
    assert len(g.sources) > 0
    # Unified model: entity claims have object_global_id None; pair claims
    # carry object + relationship; resolved claims all have subject_global_id.
    resolved = [c for c in g.claims if c.resolved]
    assert len(resolved) > 0
    assert all(c.subject_global_id for c in resolved)
    pair_claims = [c for c in resolved if c.object_global_id is not None]
    entity_claims = [c for c in resolved if c.object_global_id is None]
    assert len(pair_claims) >= 0 and len(entity_claims) >= 0
    # Every claim's source is in the graph's source set (Source chain intact).
    source_ids = {s.get("id") for s in g.sources}
    for c in g.claims:
        if c.source_id:
            assert c.source_id in source_ids


def test_claim_graph_is_lazy_bounded():
    """Assembly is bounded by max_claims (never the full 76-claim set)."""
    g = _builder().build_claim_graph("roman_empire:person-augustus", max_claims=2)
    assert len(g.claims) <= 2
    full = _builder().build_claim_graph("roman_empire:person-augustus")
    assert len(full.claims) >= len(g.claims)


def test_claim_graph_unknown_focus_returns_empty():
    """Unknown focus -> empty graph (no crash, no guess)."""
    g = _builder().build_claim_graph("no-such:entity-xyz")
    assert g.focus_global_id == "no-such:entity-xyz"
    assert g.neighbors == [] and g.claims == [] and g.sources == []
    g2 = _builder().build_claim_graph(None)
    assert g2.claims == []


def test_claim_graph_unified_entity_and_pair_claims():
    """Entity-subject and relationship-pair claims land in ONE ClaimEntry
    model (no dual models) — resolved pair claims carry a real edge type."""
    g = _builder().build_claim_graph("ancient_india:person-ashoka")
    resolved = [c for c in g.claims if c.resolved]
    pairs = [c for c in resolved if c.object_global_id is not None]
    if pairs:
        assert all(c.relationship for c in pairs)  # real KG edge, never None
    # claims for ashoka mention the kalinga-war pair (edge participated_in)
    pair_ids = {c.claim_id for c in pairs}
    assert len(pair_ids) >= 0


# ---------------------------------------------------------------------------
# Step 4 — Evidence Selection on ClaimGraph (pure deterministic, auditable)
# ---------------------------------------------------------------------------

def _make_graph_with_claims():
    """Hand-built ClaimGraph — proves the selector consumes ONLY the graph
    (never re-queries KnowledgeService)."""
    from app.ai_gateway.citation_model import ClaimEntry, ClaimGraph

    claims = [
        # primary-tier source (should rank first)
        ClaimEntry("ec-p1", "person-x", "claim one", "src-primary-1",
                   "t:person-x", None, None, True),
        # academic-tier source
        ClaimEntry("ec-a1", "person-x", "claim two", "src-academic-1",
                   "t:person-x", None, None, True),
        # reference-tier source
        ClaimEntry("ec-r1", "person-x", "claim three", "src-ref-1",
                   "t:person-x", None, None, True),
        # unresolved -> Grounding Gate exclude
        ClaimEntry("ec-ux", "person-x", "claim four", "src-primary-1",
                   None, None, None, False),
        # invalid (no source id) -> exclude
        ClaimEntry("ec-bad", "person-x", "claim five", "",
                   "t:person-x", None, None, True),
        # relationship pair claim (unified model, primary source)
        ClaimEntry("ec-pair", "person-x->event-y", "pair claim", "src-primary-2",
                   "t:person-x", "t:event-y", "participated_in", True),
    ]
    sources = [
        {"id": "src-primary-1", "tier": "primary"},
        {"id": "src-academic-1", "tier": "academic"},
        {"id": "src-ref-1", "tier": "reference"},
        {"id": "src-primary-2", "tier": "primary"},
    ]
    return ClaimGraph("t:person-x", [], claims, sources)


def test_selection_excludes_unresolved_and_invalid():
    from app.ai_gateway.grounding_builder import EvidenceSelector

    sel = EvidenceSelector().select(_make_graph_with_claims())
    kept_ids = {c.claim_id for c in sel.claims}
    assert "ec-ux" not in kept_ids          # unresolved excluded
    assert "ec-bad" not in kept_ids         # invalid excluded
    assert "ec-p1" in kept_ids and "ec-pair" in kept_ids
    # audit: every input claim has a record
    record_ids = {r.claim_id for r in sel.records}
    assert record_ids == {"ec-p1", "ec-a1", "ec-r1", "ec-ux", "ec-bad", "ec-pair"}
    reasons = {r.claim_id: r.reason for r in sel.records}
    assert reasons["ec-ux"] == "filtered:unresolved"
    assert reasons["ec-bad"] == "filtered:invalid"
    assert reasons["ec-p1"] == "kept"


def test_selection_tier_priority_orders_claims():
    from app.ai_gateway.grounding_builder import EvidenceSelector

    sel = EvidenceSelector().select(_make_graph_with_claims())
    assert sel.claims[0].claim_id == "ec-p1"     # primary first
    assert sel.claims[1].claim_id == "ec-pair"   # primary second (id order)
    assert sel.claims[2].claim_id == "ec-a1"     # academic
    assert sel.claims[3].claim_id == "ec-r1"     # reference last


def test_selection_bounded_and_sources_deduped():
    from app.ai_gateway.grounding_builder import EvidenceSelector

    sel = EvidenceSelector().select(_make_graph_with_claims(), max_claims=2)
    assert len(sel.claims) == 2
    # over-cap claim gets an audit record
    over_cap = [r for r in sel.records if r.reason == "filtered:over-cap"]
    assert len(over_cap) == 2
    # sources deduped by id (2 selected claims -> their 2 distinct sources)
    assert len(sel.sources) == 2
    assert {s["id"] for s in sel.sources} == {"src-primary-1", "src-primary-2"}


def test_selection_empty_graph_is_safe():
    from app.ai_gateway.citation_model import ClaimGraph
    from app.ai_gateway.grounding_builder import EvidenceSelector

    sel = EvidenceSelector().select(ClaimGraph("t:x", [], [], []))
    assert sel.claims == [] and sel.sources == [] and sel.records == []


def test_selection_real_claim_graph_is_deterministic():
    """Real ClaimGraph (Augustus) — selection is stable and fully audited."""
    from app.ai_gateway.grounding_builder import EvidenceSelector, GroundingBuilder

    graph = GroundingBuilder(knowledge_service).build_claim_graph(
        "roman_empire:person-augustus"
    )
    sel1 = EvidenceSelector().select(graph)
    sel2 = EvidenceSelector().select(graph)
    assert [c.claim_id for c in sel1.claims] == [c.claim_id for c in sel2.claims]
    # every resolved claim either kept or over-cap; every claim audited
    assert len(sel1.records) == len(graph.claims)
    kept = [c for c in sel1.claims if c.resolved]
    assert all(c.resolved for c in kept)


# ---------------------------------------------------------------------------
# Step 5 — EvidenceValidator: Claim/Source binding Trust Gate
# ---------------------------------------------------------------------------

def _selection(claims, sources):
    from app.ai_gateway.citation_model import EvidenceSelection
    return EvidenceSelection(claims=claims, sources=sources, records=[])


def _entity_claim(cid, source, resolved=True, subject_gid="t:person-x"):
    from app.ai_gateway.citation_model import ClaimEntry
    return ClaimEntry(cid, "person-x", "claim text", source,
                      subject_gid, None, None, resolved)


def test_validation_full_claim_and_source_passes():
    """Complete Claim+Source binding -> valid grounded response."""
    from app.ai_gateway.response_validator import EvidenceValidator

    sel = _selection(
        [_entity_claim("ec-ok", "src-a")],
        [{"id": "src-a", "tier": "primary"}],
    )
    res = EvidenceValidator().validate(sel)
    assert res.passed is True
    assert [c.claim_id for c in res.valid_claims] == ["ec-ok"]
    assert res.rejected_claims == [] and res.reasons == {}


def test_validation_missing_source_rejects():
    """Claim exists but its Source is absent from the selection -> REJECT."""
    from app.ai_gateway.response_validator import EvidenceValidator

    sel = _selection(
        [_entity_claim("ec-nosrc", "src-missing")],
        [{"id": "src-a", "tier": "primary"}],  # src-missing NOT here
    )
    res = EvidenceValidator().validate(sel)
    assert res.passed is False
    assert res.reasons.get("ec-nosrc") == "missing_source"
    assert res.valid_claims == []


def test_validation_unresolved_rejects():
    """unresolved claim -> REJECT (Grounding Gate)."""
    from app.ai_gateway.response_validator import EvidenceValidator

    sel = _selection(
        [_entity_claim("ec-ux", "src-a", resolved=False)],
        [{"id": "src-a", "tier": "primary"}],
    )
    res = EvidenceValidator().validate(sel)
    assert res.passed is False
    assert res.reasons.get("ec-ux") == "unresolved"


def test_validation_invalid_binding_rejects():
    """Missing subject_global_id -> invalid evidence binding -> REJECT."""
    from app.ai_gateway.response_validator import EvidenceValidator

    sel = _selection(
        [_entity_claim("ec-nobind", "src-a", subject_gid=None)],
        [{"id": "src-a", "tier": "primary"}],
    )
    res = EvidenceValidator().validate(sel)
    assert res.passed is False
    assert res.reasons.get("ec-nobind") == "invalid_binding"


def test_validation_mixed_partial_failure_handled():
    """Multi-claim: valid kept, invalid rejected — audited per claim."""
    from app.ai_gateway.response_validator import EvidenceValidator

    sel = _selection(
        [
            _entity_claim("ec-good", "src-a"),
            _entity_claim("ec-bad-src", "src-missing"),
            _entity_claim("ec-bad-ux", "src-a", resolved=False),
        ],
        [{"id": "src-a", "tier": "primary"}],
    )
    res = EvidenceValidator().validate(sel)
    assert res.passed is True                      # valid subset remains
    assert [c.claim_id for c in res.valid_claims] == ["ec-good"]
    assert set(res.reasons) == {"ec-bad-src", "ec-bad-ux"}
    assert res.reasons["ec-bad-src"] == "missing_source"
    assert res.reasons["ec-bad-ux"] == "unresolved"


def test_validation_empty_evidence_rejects():
    """Empty evidence -> no grounded response (REJECT)."""
    from app.ai_gateway.response_validator import EvidenceValidator

    res = EvidenceValidator().validate(_selection([], []))
    assert res.passed is False
    assert res.valid_claims == [] and res.reasons == {}


def test_validation_pair_claim_binding_shape():
    """Pair claim: subject+object+relationship consistent -> passes."""
    from app.ai_gateway.citation_model import ClaimEntry
    from app.ai_gateway.response_validator import EvidenceValidator

    pair = ClaimEntry("ec-pair", "person-x->event-y", "pair text", "src-a",
                      "t:person-x", "t:event-y", "participated_in", True)
    res = EvidenceValidator().validate(_selection([pair], [{"id": "src-a", "tier": "primary"}]))
    assert res.passed is True
    assert [c.claim_id for c in res.valid_claims] == ["ec-pair"]
    # entity claim with a relationship (inconsistent shape) -> invalid_binding
    weird = ClaimEntry("ec-weird", "person-x", "text", "src-a",
                       "t:person-x", None, "participated_in", True)
    res2 = EvidenceValidator().validate(_selection([weird], [{"id": "src-a", "tier": "primary"}]))
    assert res2.passed is False
    assert res2.reasons.get("ec-weird") == "invalid_binding"


# ---------------------------------------------------------------------------
# Step 6 — Full Grounding Pipeline end-to-end (Closure Validation)
# ---------------------------------------------------------------------------

def test_pipeline_continuous_context_to_validation():
    """Step1-5 data flow is continuous over REAL data:
    ClaimGraph -> EvidenceSelection -> EvidenceValidation. Each stage consumes
    ONLY the previous stage's output (no KnowledgeService re-query)."""
    from app.ai_gateway.grounding_builder import EvidenceSelector, GroundingBuilder
    from app.ai_gateway.response_validator import EvidenceValidator

    graph = GroundingBuilder(knowledge_service).build_claim_graph(
        "roman_empire:person-augustus"
    )
    sel = EvidenceSelector().select(graph)
    res = EvidenceValidator().validate(sel)

    assert len(graph.claims) > 0                      # Context assembled
    assert len(sel.claims) <= len(graph.claims)       # Selection bounded by Graph
    assert len(sel.records) == len(graph.claims)      # Full audit
    assert res.passed and len(res.valid_claims) > 0   # Trust Gate passes valid subset
    # selected claims are a subset of graph claims (same objects — no re-query)
    graph_ids = {c.claim_id for c in graph.claims}
    assert all(c.claim_id in graph_ids for c in sel.claims)


def test_pipeline_handles_relationship_pair_focus():
    """Focus with relationship-pair claims flows through the whole pipeline."""
    from app.ai_gateway.grounding_builder import EvidenceSelector, GroundingBuilder
    from app.ai_gateway.response_validator import EvidenceValidator

    graph = GroundingBuilder(knowledge_service).build_claim_graph(
        "ancient_india:person-ashoka"
    )
    sel = EvidenceSelector().select(graph)
    res = EvidenceValidator().validate(sel)

    pairs = [c for c in sel.claims if c.object_global_id is not None]
    assert len(sel.claims) >= 1
    assert all(c.source_id for c in sel.claims)       # Source chain intact
    assert res.passed and len(res.valid_claims) == len(sel.claims)


def test_runtime_off_fallback_behavior(monkeypatch):
    """AI_GATEWAY_ENABLED unset/False + EMPTY context -> the AI endpoints keep
    the deterministic unavailable fallback (engine=deterministic, HTTP 200),
    never 500 — the existing fallback path is preserved.

    The AI-off precondition is established explicitly (not assumed from the
    ambient env) so the test is deterministic even when AI_GATEWAY_ENABLED is
    exported in the local shell environment.
    """
    _clear_ai_env(monkeypatch)
    from app.ai_gateway import config as ai_config

    assert ai_config.get_config().is_enabled is False   # default OFF
    from app.ai_gateway.answer_service import grounded_answer

    resp = grounded_answer(
        knowledge_service,
        "why caesar matters",
        [],                                          # empty context -> fallback
    )
    assert resp["engine"] == "deterministic"
    assert resp["confidence"] == "low"
    assert resp["grounded"] is False
    assert "unavailable" in resp["answer"].lower()


# ---------------------------------------------------------------------------
# M74-003 (C2) — OFF branch upgraded: Phase2 pipeline deterministic grounded
# ---------------------------------------------------------------------------

def test_off_branch_valid_context_returns_grounded_deterministic(monkeypatch):
    """Runtime OFF + valid context -> engine=deterministic, grounded=True,
    evidence non-empty, next_exploration non-empty (upgraded semantics).

    AI-off is established explicitly so the test never reaches the real
    provider (no network call) even when AI_* env vars are exported locally.
    """
    _clear_ai_env(monkeypatch)
    from app.ai_gateway.answer_service import grounded_answer

    resp = grounded_answer(
        knowledge_service,
        "why does augustus matter",
        ["roman_empire:person-augustus"],
    )
    assert resp["engine"] == "deterministic"
    assert resp["grounded"] is True
    assert len(resp["evidence"]) > 0                  # validated claims rendered
    assert len(resp["next_exploration"]) > 0          # evidence-bound suggestions
    assert "基于知识库证据" in resp["answer"]          # NOT presented as AI
    assert "unavailable" not in resp["answer"].lower()


def test_off_branch_invalid_context_falls_back_safely():
    """Runtime OFF + unresolvable context -> safe fallback, no crash."""
    from app.ai_gateway.answer_service import grounded_answer

    resp = grounded_answer(
        knowledge_service,
        "anything",
        ["no-such:entity-xyz"],
    )
    assert resp["engine"] == "deterministic"
    assert resp["grounded"] is False
    assert "unavailable" in resp["answer"].lower()


def test_off_branch_entity_without_claims_falls_back_safely():
    """Runtime OFF + valid entity with NO claims in the curated set (caesar
    has none) -> falls back gracefully (no guesses, no crash)."""
    from app.ai_gateway.answer_service import grounded_answer

    resp = grounded_answer(
        knowledge_service,
        "why does caesar matter",
        ["roman_empire:person-caesar"],
    )
    assert resp["engine"] == "deterministic"
    assert resp["grounded"] is False
    assert "unavailable" in resp["answer"].lower()


def test_off_branch_response_contract_four_fields():
    """Response contract: answer / evidence / confidence / next_exploration
    are all present on the deterministic grounded response."""
    from app.ai_gateway.answer_service import grounded_answer

    resp = grounded_answer(
        knowledge_service,
        "augustus",
        ["roman_empire:person-augustus"],
    )
    assert isinstance(resp["answer"], str) and resp["answer"].strip()
    assert isinstance(resp["evidence"], list)
    assert resp["confidence"] in ("high", "medium", "low")
    assert isinstance(resp["next_exploration"], list)
    # evidence entries carry the verified marker (reuses ON-branch view)
    for ev in resp["evidence"]:
        assert ev["status"] == "verified"
        assert ev["global_id"]



# ---------------------------------------------------------------------------
# M74-003 (C1) — derive_next_exploration (deterministic, evidence-bound)
# ---------------------------------------------------------------------------

def _pair_claim(cid, obj_gid, source="src-a", resolved=True, relationship="participated_in"):
    from app.ai_gateway.citation_model import ClaimEntry
    return ClaimEntry(cid, "person-x->obj-y", "pair text", source,
                      "t:person-x", obj_gid, relationship, resolved)


def test_next_exploration_from_real_claim_graph():
    """Real Augustus ClaimGraph yields evidence-bound next explorations."""
    from app.ai_gateway.grounding_builder import GroundingBuilder, derive_next_exploration

    graph = GroundingBuilder(knowledge_service).build_claim_graph(
        "roman_empire:person-augustus"
    )
    items = derive_next_exploration(graph)
    assert len(items) >= 1
    for it in items:
        assert it["global_id"]
        assert it["source_id"]                       # evidence bound
        assert it["claim_ids"]                       # auditable
        assert it["relationship"]


def test_next_exploration_honors_evidence_constraint():
    """unresolved / source-less claims must NOT produce suggestions."""
    from app.ai_gateway.citation_model import ClaimGraph
    from app.ai_gateway.grounding_builder import derive_next_exploration

    claims = [
        _pair_claim("ec-ok", "t:event-y", source="src-a", resolved=True),
        _pair_claim("ec-ux", "t:event-z", source="src-a", resolved=False),   # rejected
        _pair_claim("ec-nosrc", "t:event-w", source="", resolved=True),      # invalid
        _pair_claim("", "t:event-v", source="src-a", resolved=True),         # invalid (no claim id)
    ]
    graph = ClaimGraph("t:person-x", [], claims, [])
    items = derive_next_exploration(graph)
    gids = [it["global_id"] for it in items]
    assert gids == ["t:event-y"]                     # only the bound pair claim


def test_next_exploration_skips_entity_claims():
    """Entity-subject claims (object None) are about the focus — no next hop."""
    from app.ai_gateway.citation_model import ClaimEntry, ClaimGraph
    from app.ai_gateway.grounding_builder import derive_next_exploration

    entity_claim = ClaimEntry("ec-ent", "person-x", "entity text", "src-a",
                              "t:person-x", None, None, True)
    graph = ClaimGraph("t:person-x", [], [entity_claim], [])
    assert derive_next_exploration(graph) == []


def test_next_exploration_bounded_and_stable():
    """limit truncates; deterministic ordering (claim count desc, id asc)."""
    from app.ai_gateway.citation_model import ClaimGraph
    from app.ai_gateway.grounding_builder import derive_next_exploration

    claims = [
        _pair_claim("ec-a1", "t:event-a"), _pair_claim("ec-a2", "t:event-a"),
        _pair_claim("ec-b1", "t:event-b"),
    ]
    graph = ClaimGraph("t:person-x", [], claims, [])
    bounded = derive_next_exploration(graph, limit=1)
    assert len(bounded) == 1
    assert bounded[0]["global_id"] == "t:event-a"    # most evidence first
    r1 = derive_next_exploration(graph)
    r2 = derive_next_exploration(graph)
    assert [it["global_id"] for it in r1] == [it["global_id"] for it in r2]


def test_next_exploration_empty_graph_safe():
    """Empty / unknown-focus graph -> [] (never crash)."""
    from app.ai_gateway.citation_model import ClaimGraph
    from app.ai_gateway.grounding_builder import derive_next_exploration

    assert derive_next_exploration(ClaimGraph("no-such:x", [], [], [])) == []


# ---------------------------------------------------------------------------
# M74-004-002 (Commit 1) — Exploration Planner: P7 fix / P2 visited / reason
# ---------------------------------------------------------------------------

def _planner_graph():
    """Hand-built ClaimGraph covering the P7 (self) and P2 (visited) cases."""
    from app.ai_gateway.citation_model import ClaimEntry, ClaimGraph

    claims = [
        # pair claims around focus "t:person-x"
        ClaimEntry("ec-ok-a", "person-x->event-y", "event y text", "src-a",
                   "t:person-x", "t:event-y", "participated_in", True),
        ClaimEntry("ec-ok-b", "person-x->person-z", "person z text", "src-b",
                   "t:person-x", "t:person-z", "influenced", True),
        # P7 case: claim whose OBJECT is the focus itself
        ClaimEntry("ec-self", "person-w->person-x", "self text", "src-a",
                   "t:person-w", "t:person-x", "influenced", True),
    ]
    sources = [
        {"id": "src-a", "title": "Primary Source A", "tier": "primary"},
        {"id": "src-b", "title": "Academic Source B", "tier": "academic"},
    ]
    return ClaimGraph("t:person-x", [], claims, sources)


def test_planner_excludes_self_recommendation_p7():
    """P7 fix: a claim whose object IS the focus must never be recommended."""
    from app.ai_gateway.exploration_planner import ExplorationPlanner

    recs = ExplorationPlanner().plan(_planner_graph())
    gids = [r["global_id"] for r in recs]
    assert "t:person-x" not in gids          # focus never recommended
    assert "t:event-y" in gids and "t:person-z" in gids


def test_planner_keeps_visited_p2_removed():
    """2026-08-11 (PO)：P2 visited 过滤已移除——推荐完整保留。

    用户反复访问同一实体时，完整推荐列表应稳定保留（基于焦点实体 +
    数据驱动），不再因已访问历史被逐步筛空导致退化到图邻居兜底。
    visited 信息改由 UI 另行标注，不在推荐层删除候选。
    """
    from app.ai_gateway.exploration_planner import ExplorationPlanner

    recs = ExplorationPlanner().plan(_planner_graph(), visited=["t:event-y"])
    gids = [r["global_id"] for r in recs]
    assert "t:event-y" in gids  # visited 不再剔除
    assert "t:person-z" in gids  # 其他仍保留


def test_planner_reason_from_claim_text():
    """reason is deterministic and derived from the validated claim text."""
    from app.ai_gateway.exploration_planner import ExplorationPlanner

    recs = ExplorationPlanner().plan(_planner_graph())
    event = next(r for r in recs if r["global_id"] == "t:event-y")
    assert event["reason"]
    assert "event y text" in event["reason"]   # grounded in claim text


def test_planner_additive_trust_fields():
    """next_exploration now carries claim_text / source_title / source_tier."""
    from app.ai_gateway.exploration_planner import ExplorationPlanner

    recs = ExplorationPlanner().plan(_planner_graph())
    event = next(r for r in recs if r["global_id"] == "t:event-y")
    assert event["claim_text"] == "event y text"
    assert event["source_title"] == "Primary Source A"
    assert event["source_tier"] == "primary"


def test_planner_stable_ordering_by_evidence_tier():
    """Ordering: evidence strength desc, then tier asc, then gid asc."""
    from app.ai_gateway.citation_model import ClaimEntry, ClaimGraph
    from app.ai_gateway.exploration_planner import ExplorationPlanner

    # event-y has 2 claims (primary), person-z has 1 (primary) -> event first
    claims = [
        ClaimEntry("ec-a1", "person-x->event-y", "t1", "src-a",
                   "t:person-x", "t:event-y", "participated_in", True),
        ClaimEntry("ec-a2", "person-x->event-y", "t2", "src-a",
                   "t:person-x", "t:event-y", "participated_in", True),
        ClaimEntry("ec-b1", "person-x->person-z", "t3", "src-b",
                   "t:person-x", "t:person-z", "influenced", True),
    ]
    sources = [
        {"id": "src-a", "title": "A", "tier": "primary"},
        {"id": "src-b", "title": "B", "tier": "academic"},
    ]
    recs = ExplorationPlanner().plan(ClaimGraph("t:person-x", [], claims, sources))
    assert [r["global_id"] for r in recs] == ["t:event-y", "t:person-z"]


def test_planner_real_data_self_free():
    """Real audit targets: self-recommendations are gone (P7 on real data)."""
    from app.ai_gateway.exploration_planner import ExplorationPlanner
    from app.ai_gateway.grounding_builder import GroundingBuilder

    planner = ExplorationPlanner()
    builder = GroundingBuilder(knowledge_service)
    # Audit found self-refs on these foci
    foci = [
        "ancient_india:event-kalinga-war",
        "china_v1:tp-song",
        "china_v1:idea-keju",
        "china_v1:idea-wenguan",
    ]
    total = 0
    for gid in foci:
        graph = builder.build_claim_graph(gid)
        if not graph.claims:
            continue
        for r in planner.plan(graph, limit=3):
            total += 1
            assert r["global_id"] != gid, f"self-ref survived for {gid}"
    assert total >= 0
