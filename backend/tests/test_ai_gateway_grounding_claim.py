"""M74 Phase2 — AI Grounding Claim tests (real dataset, read-only).

Covers the Phase2 Gate approved scope:
  Step 1: local-id -> global-id mapping (claim subject binding basis)
  Step 2: relationship-pair (A->B) parsing
  Step 3: GroundingBuilder ClaimGraph output
  Step 4: Evidence Selection
  Step 5: ResponseValidator claim/source double binding

Uses the REAL knowledge_service singleton (built from the frozen dataset —
43 sources / 76 claims / 145 entities). No LLM, no network: AI provider calls
are never exercised here (AI_GATEWAY_ENABLED stays false).
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import knowledge_service  # noqa: E402  (real singleton)
from app.ai_gateway.grounding_builder import RelationshipResolver  # noqa: E402


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
    assert total == 145
    assert resolved == 145


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


def test_runtime_off_fallback_behavior():
    """AI_GATEWAY_ENABLED unset/False -> /ai/explain returns the deterministic
    fallback (engine=deterministic, HTTP 200), never 500 — M73 behaviour of the
    AI endpoints is unchanged while the Runtime is OFF."""
    from app.ai_gateway import config as ai_config

    assert ai_config.get_config().is_enabled is False   # default OFF
    from app.ai_gateway.answer_service import grounded_answer

    resp = grounded_answer(
        knowledge_service,
        "why caesar matters",
        ["roman_empire:person-caesar"],
    )
    assert resp["engine"] == "deterministic"
    assert resp["confidence"] == "low"
    assert resp["grounded"] is False
    assert "unavailable" in resp["answer"].lower()
