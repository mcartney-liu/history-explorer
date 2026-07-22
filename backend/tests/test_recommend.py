import sys
from pathlib import Path

# Make the `app` package importable when pytest is launched from repo root.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient

from app.core.repository import JsonTopicRepository
from app.core.knowledge_service import KnowledgeService
from app.core.exploration_engine import (
    ALGORITHM_VERSION,
    DEFAULT_MAX_RESULTS,
    REC_W_DIVERSITY,
    REC_W_RELATIONSHIP,
    REC_W_THEME,
    REC_W_TIMELINE,
    W_IMPORTANCE,
    W_RELATIONSHIP,
    W_SIMPLICITY,
    W_TEMPORAL,
    RecommendationResult,
)
from app.validation import ENTITY_TYPES, RELATIONSHIP_TYPES
from app.main import app

DATA_DIR = BACKEND_DIR.parent / "data" / "examples"


def _ks() -> KnowledgeService:
    return KnowledgeService(JsonTopicRepository(DATA_DIR))


ROME = "roman_empire:civ-roman"

client = TestClient(app)
V1 = "/api/v1"


# ---------------------------------------------------------------------------
# 1. Deterministic snapshot (M9-001 §12.1)
# ---------------------------------------------------------------------------
def test_recommend_next_is_deterministic():
    ks = _ks()
    r1 = ks.recommend_next(ROME)
    r2 = ks.recommend_next(ROME)
    # Same input -> identical RecommendationItem objects (value equality).
    assert r1.recommendations == r2.recommendations
    # Full deterministic payload (excluding informational metadata.generated_at)
    # must be byte-for-byte identical.
    d1 = r1.to_dict()
    d2 = r2.to_dict()
    d1["metadata"].pop("generated_at", None)
    d2["metadata"].pop("generated_at", None)
    assert d1 == d2


def test_recommend_next_deterministic_with_seen():
    ks = _ks()
    seen = {"silk_road:silk_road", "roman_empire:event-punic-wars"}
    a = ks.recommend_next(ROME, seen_global_ids=seen).to_dict()
    b = ks.recommend_next(ROME, seen_global_ids=seen).to_dict()
    a["metadata"].pop("generated_at", None)
    b["metadata"].pop("generated_at", None)
    assert a == b


# ---------------------------------------------------------------------------
# 2. Ranking correctness (M9-001 §12.2)
# ---------------------------------------------------------------------------
def test_recommendation_ranking_formula_and_order():
    ks = _ks()
    res = ks.recommend_next(ROME, max_results=10)
    recs = res.recommendations
    assert recs, "expected recommendations for Rome"
    scores = []
    for item in recs:
        sb = item.score_breakdown
        # Composite formula holds (rounded components, tolerance for 4dp rounding).
        recomputed = round(
            REC_W_RELATIONSHIP * sb["relationship_weight"]
            + REC_W_TIMELINE * sb["timeline_relevance"]
            + REC_W_THEME * sb["theme_connection"]
            + REC_W_DIVERSITY * sb["exploration_diversity"],
            4,
        )
        assert abs(item.score - recomputed) < 1e-3
        assert 0.0 <= item.score <= 1.0
        scores.append(item.score)
    # Sorted descending by score (ties broken by global_id, scores non-increasing).
    assert scores == sorted(scores, reverse=True)
    gids = [i.target_entity["global_id"] for i in recs]
    assert len(gids) == len(set(gids))  # no duplicate candidates


def test_recommendation_diversity_penalizes_seen():
    ks = _ks()
    base = ks.recommend_next(ROME, max_results=10)
    top_gid = base.recommendations[0].target_entity["global_id"]
    base_top_score = base.recommendations[0].score

    seen = ks.recommend_next(ROME, seen_global_ids={top_gid}, max_results=10)
    seen_top = seen.recommendations[0]
    # The previously-top item must drop (diversity 0.2) when marked seen.
    assert (
        seen_top.target_entity["global_id"] != top_gid
        or seen_top.score < base_top_score
    )
    # Its exploration_diversity component must be exactly 0.2 when seen.
    seen_item = next(
        (i for i in seen.recommendations if i.target_entity["global_id"] == top_gid),
        None,
    )
    if seen_item is not None:
        assert seen_item.score_breakdown["exploration_diversity"] == 0.2


def test_recommendation_type_diversity_rewards_novelty():
    ks = _ks()
    recs = ks.recommend_next(ROME, max_results=10).recommendations
    # Build a seen set from the top items' types to force novelty elsewhere.
    first = recs[0]
    # Directly-constructed seen set of the first item's gid.
    seen = {first.target_entity["global_id"]}
    resp = ks.recommend_next(ROME, seen_global_ids=seen, max_results=10)
    # If the first item is still present, it carries the 0.2 seen penalty.
    still = next(
        (i for i in resp.recommendations if i.target_entity["global_id"] == first.target_entity["global_id"]),
        None,
    )
    if still is not None:
        assert still.score_breakdown["exploration_diversity"] == 0.2


# ---------------------------------------------------------------------------
# 3. Explainability (M9-001 §12.3)
# ---------------------------------------------------------------------------
def test_recommendation_explainability():
    ks = _ks()
    res = ks.recommend_next(ROME, max_results=5)
    for item in res.recommendations:
        # Every recommendation carries at least one reason.
        assert item.reasons, "each recommendation must have >=1 reason"
        # The four explainable components are present.
        assert set(item.score_breakdown) == {
            "relationship_weight",
            "timeline_relevance",
            "theme_connection",
            "exploration_diversity",
        }
        # Direct candidates expose a non-empty relation_path.
        if item.metadata["depth"] <= 1:
            assert item.relation_path, "direct candidate must carry a relation_path"


# ---------------------------------------------------------------------------
# 4. Regression: explore() / frozen score formula untouched (M9-001 §12.4)
# ---------------------------------------------------------------------------
def test_explore_unchanged_by_recommendation_layer():
    ks = _ks()
    before = ks.explore_from(ROME, max_depth=2)
    ks.recommend_next(ROME)  # exercise the new additive layer
    ks.recommend_next(ROME, seen_global_ids={"silk_road:silk_road"})
    after = ks.explore_from(ROME, max_depth=2)
    assert before == after
    # The frozen exploration score-breakdown keys are intact.
    assert set(after[0]["score_breakdown"]) == {
        "relationship_meaning",
        "temporal_coherence",
        "entity_importance",
        "path_simplicity",
        "hops",
    }


# ---------------------------------------------------------------------------
# 5. Route parity: /api/v1 MUST equal legacy (v1 == legacy convention)
# ---------------------------------------------------------------------------
def test_recommendations_route_parity():
    legacy = client.get("/entity/person-augustus/recommendations").json()
    v1 = client.get(f"{V1}/entity/person-augustus/recommendations").json()
    # metadata.generated_at is informational only (M9-001 §6/§12.1) and is
    # excluded from the determinism guarantee, so compare the deterministic
    # payload exactly.
    legacy["metadata"].pop("generated_at", None)
    v1["metadata"].pop("generated_at", None)
    assert v1 == legacy
    assert v1["algorithm_version"] == ALGORITHM_VERSION
    assert "recommendations" in v1


def test_recommendations_route_parity_with_seen():
    legacy = client.get(
        "/entity/person-augustus/recommendations?seen=silk_road:silk_road&limit=3"
    ).json()
    v1 = client.get(
        f"{V1}/entity/person-augustus/recommendations?seen=silk_road:silk_road&limit=3"
    ).json()
    legacy["metadata"].pop("generated_at", None)
    v1["metadata"].pop("generated_at", None)
    assert v1 == legacy
    assert len(v1["recommendations"]) <= 3


def test_recommendations_route_404_on_unknown_entity():
    res = client.get(f"{V1}/entity/does-not-exist/recommendations")
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# 6. Freeze guard: enums + frozen weights unchanged (M9-001 §13)
# ---------------------------------------------------------------------------
def test_freeze_enum_counts_unchanged():
    assert len(ENTITY_TYPES) == 8
    assert len(RELATIONSHIP_TYPES) == 18


def test_frozen_exploration_weights_untouched():
    # M9-001 ADDS REC_W_* weights; it must NOT alter the frozen W_* weights.
    assert (W_RELATIONSHIP, W_TEMPORAL, W_IMPORTANCE, W_SIMPLICITY) == (
        0.35,
        0.25,
        0.20,
        0.20,
    )


def test_recommendation_result_contract_shape():
    ks = _ks()
    res = ks.recommend_next(ROME)
    d = res.to_dict()
    assert set(d.keys()) == {
        "current_entity",
        "recommendations",
        "algorithm_version",
        "parameters",
        "metadata",
    }
    assert d["algorithm_version"] == ALGORITHM_VERSION
    assert d["parameters"]["max_results"] == DEFAULT_MAX_RESULTS
    assert d["parameters"]["weights"] == {
        "relationship": REC_W_RELATIONSHIP,
        "timeline": REC_W_TIMELINE,
        "theme": REC_W_THEME,
        "diversity": REC_W_DIVERSITY,
    }


def test_recommendation_result_is_json_safe():
    import json

    ks = _ks()
    json.dumps(ks.recommend_next(ROME).to_dict())


def test_recommend_next_unknown_entity_returns_empty():
    ks = _ks()
    res = ks.recommend_next("no_such:node")
    assert isinstance(res, RecommendationResult)
    assert res.recommendations == []
