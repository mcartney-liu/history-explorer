"""ADR-0028 Phase 1 -- Temporal Coherence Gate unit tests (L1-L4).

Test layers
-----------
* **L0** taxonomy closure -- the gate's 18-type table must not drift from the
  frozen authority (`exploration_engine.RELATIONSHIP_MEANING`).
* **L1** interval primitive -- `extract_interval` / `compare_intervals`.
* **L2** classifier -- 18-type mapping + D1 defensive failure.
* **L3** decision matrix -- every cell of Contract vNext 1.2 §3.
* **L4** precedence + two-independent-SOFT-paths white-box proof + determinism.
* **L5** integration — `temporal_gate` wired into `grounding_builder`:
  dormant-by-default gating (no behaviour change when `tol` is unset),
  D1 pre-filter (disputes/reinterprets passthrough), and `temporal_rejects`
  provenance on activation.

Discipline
----------
* `tol` is passed EXPLICITLY in every test that reaches interval comparison
  (PO decision D2). No test relies on a default, and no test asserts a
  `None -> 0` coercion.
* No IO, no network, no LLM. Entity fixtures are plain dicts mirroring the
  REAL frozen KG shapes observed in `data/examples/`.
"""
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.ai_gateway import temporal_gate as tg  # noqa: E402
from app.ai_gateway.config import GroundingTuningConfig  # noqa: E402
from app.ai_gateway.grounding_builder import GroundingBuilder  # noqa: E402
from app.ai_gateway.response_validator import ResponseValidator  # noqa: E402
from app.ai_gateway.citation_model import Citation  # noqa: E402
from app.core.exploration_engine import RELATIONSHIP_MEANING  # noqa: E402


# ---------------------------------------------------------------------------
# Entity fixtures -- REAL shapes taken from data/examples/
# ---------------------------------------------------------------------------
def ent_start_end(start, end):
    """`start_date`/`end_date` shape (88 real entities use only this)."""
    out = {}
    if start is not None:
        out["start_date"] = {
            "value": start, "precision": "year",
            "certainty": "approximate", "label": str(start),
        }
    if end is not None:
        out["end_date"] = {
            "value": end, "precision": "year",
            "certainty": "approximate", "label": str(end),
        }
    return out


def ent_birth_death(birth, death):
    """`birth`/`death` shape (person-constantine, person-julius-caesar)."""
    out = {}
    if birth is not None:
        out["birth"] = {
            "value": birth, "precision": "year",
            "certainty": "approximate", "label": str(birth),
        }
    if death is not None:
        out["death"] = {
            "value": death, "precision": "year",
            "certainty": "approximate", "label": str(death),
        }
    return out


# A date-less entity: 68 real entities look like this (loc-*, idea-*, event-*).
ENTITY_NO_DATE = {"id": "loc-pataliputra", "name": "Pataliputra", "type": "location"}

TOL = 50.0  # explicit, test-local. NOT a Contract value, NOT a default.


# ===========================================================================
# L0 -- taxonomy closure (anti-drift against the frozen authority)
# ===========================================================================
class TestL0TaxonomyClosure:
    def test_table_has_exactly_18_types(self):
        assert len(tg.RELATION_TEMPORAL_CLASS) == 18

    def test_key_set_matches_exploration_engine_relationship_meaning(self):
        """Set closure (Contract §3 / I-03): the gate's key set IS the frozen 18."""
        assert set(tg.RELATION_TEMPORAL_CLASS) == set(RELATIONSHIP_MEANING)

    def test_class_cardinality_is_10_2_5_1(self):
        """Category closure: 10 HARD + 2 BEFORE_AFTER + 5 PROPAGATION + 1 SOFT-WEAK."""
        assert len(tg.TEMPORAL_TAXONOMY[tg.CLASS_HARD]) == 10
        assert len(tg.TEMPORAL_TAXONOMY[tg.CLASS_BEFORE_AFTER]) == 2
        assert len(tg.TEMPORAL_TAXONOMY[tg.CLASS_PROPAGATION]) == 5
        assert len(tg.TEMPORAL_TAXONOMY[tg.CLASS_SOFT_WEAK]) == 1

    def test_frozen_class_membership_verbatim(self):
        """Membership is quoted from Contract §3 '18 型类别绑定（冻结）'."""
        assert set(tg.TEMPORAL_TAXONOMY[tg.CLASS_HARD]) == {
            "spoke", "participated_in", "located_at", "contemporary_with",
            "part_of", "ruled", "traded_with", "invented", "discovered",
            "conquered",
        }
        assert set(tg.TEMPORAL_TAXONOMY[tg.CLASS_BEFORE_AFTER]) == {"before", "after"}
        assert set(tg.TEMPORAL_TAXONOMY[tg.CLASS_PROPAGATION]) == {
            "caused", "influenced", "inherited", "spread", "practiced",
        }
        assert set(tg.TEMPORAL_TAXONOMY[tg.CLASS_SOFT_WEAK]) == {"related_to"}

    def test_spoke_is_hard_invariant_I03(self):
        assert tg.classify_relation("spoke") == tg.CLASS_HARD

    def test_contemporary_with_is_hard_not_a_new_category(self):
        """Contract §3: no temporal-equivalence class is added in vNext 1.2."""
        assert tg.classify_relation("contemporary_with") == tg.CLASS_HARD


# ===========================================================================
# L1 -- interval primitive
# ===========================================================================
class TestL1ExtractInterval:
    def test_start_end_shape(self):
        assert tg.extract_interval(ent_start_end(-322, -185)) == tg.Interval(-322.0, -185.0)

    def test_birth_death_shape_is_read(self):
        """Fixes the `_rep_year` coverage defect: birth/death-only entities have dates."""
        assert tg.extract_interval(ent_birth_death(272, 337)) == tg.Interval(272.0, 337.0)

    def test_both_shapes_present_are_identical_on_real_data(self):
        entity = {}
        entity.update(ent_start_end(-340, -297))
        entity.update(ent_birth_death(-340, -297))
        assert tg.extract_interval(entity) == tg.Interval(-340.0, -297.0)

    def test_start_end_preferred_over_birth_death(self):
        entity = {}
        entity.update(ent_start_end(100, 200))
        entity.update(ent_birth_death(900, 950))
        assert tg.extract_interval(entity) == tg.Interval(100.0, 200.0)

    def test_no_date_entity_returns_none(self):
        assert tg.extract_interval(ENTITY_NO_DATE) is None

    def test_empty_and_non_dict_return_none(self):
        for bad in ({}, None, "1500", 1500, [], object()):
            assert tg.extract_interval(bad) is None

    def test_null_and_malformed_values_read_as_unknown(self):
        assert tg.extract_interval({"start_date": None, "end_date": None}) is None
        assert tg.extract_interval({"start_date": {"value": None}}) is None
        assert tg.extract_interval({"start_date": {"value": "1500"}}) is None
        assert tg.extract_interval({"start_date": {"label": "1500"}}) is None
        assert tg.extract_interval({"start_date": "1500"}) is None

    def test_bool_value_is_rejected_not_read_as_year(self):
        assert tg.extract_interval({"start_date": {"value": True}}) is None

    def test_open_ended_start_only(self):
        assert tg.extract_interval(ent_start_end(1500, None)) == tg.Interval(1500.0, float("inf"))

    def test_open_ended_end_only(self):
        assert tg.extract_interval(ent_start_end(None, 1500)) == tg.Interval(float("-inf"), 1500.0)

    def test_year_zero_is_a_real_year_not_falsy(self):
        assert tg.extract_interval(ent_start_end(0, 10)) == tg.Interval(0.0, 10.0)

    def test_inverted_source_data_is_normalised(self):
        assert tg.extract_interval(ent_start_end(200, 100)) == tg.Interval(100.0, 200.0)


class TestL1CompareIntervals:
    def test_identical_intervals_overlap(self):
        a = tg.Interval(-322.0, -185.0)
        assert tg.compare_intervals(a, a, tol=TOL) == tg.STATE_OVERLAP

    def test_partial_overlap(self):
        a, b = tg.Interval(100.0, 200.0), tg.Interval(150.0, 250.0)
        assert tg.compare_intervals(a, b, tol=TOL) == tg.STATE_OVERLAP
        assert tg.compare_intervals(b, a, tol=TOL) == tg.STATE_OVERLAP

    def test_containment_overlaps(self):
        outer, inner = tg.Interval(0.0, 500.0), tg.Interval(100.0, 200.0)
        assert tg.compare_intervals(outer, inner, tol=TOL) == tg.STATE_OVERLAP
        assert tg.compare_intervals(inner, outer, tol=TOL) == tg.STATE_OVERLAP

    def test_touching_bounds_overlap_even_at_zero_tolerance(self):
        """Inclusive bounds: end == start is an intersection, not a gap."""
        a, b = tg.Interval(100.0, 200.0), tg.Interval(200.0, 300.0)
        assert tg.compare_intervals(a, b, tol=0) == tg.STATE_OVERLAP

    def test_adjacent_when_gap_below_tolerance(self):
        a, b = tg.Interval(100.0, 200.0), tg.Interval(220.0, 300.0)
        assert tg.compare_intervals(a, b, tol=TOL) == tg.STATE_ADJACENT
        assert tg.compare_intervals(b, a, tol=TOL) == tg.STATE_ADJACENT

    def test_adjacent_at_exact_tolerance_boundary(self):
        """gap == tol is ADJACENT (Contract §3 'relative <= TOL')."""
        a, b = tg.Interval(100.0, 200.0), tg.Interval(250.0, 300.0)
        assert tg.compare_intervals(a, b, tol=50) == tg.STATE_ADJACENT

    def test_cross_gen_one_year_past_tolerance(self):
        a, b = tg.Interval(100.0, 200.0), tg.Interval(251.0, 300.0)
        assert tg.compare_intervals(a, b, tol=50) == tg.STATE_CROSS_GEN

    def test_cross_gen_wide_gap(self):
        a, b = tg.Interval(-322.0, -185.0), tg.Interval(1500.0, 1600.0)
        assert tg.compare_intervals(a, b, tol=TOL) == tg.STATE_CROSS_GEN
        assert tg.compare_intervals(b, a, tol=TOL) == tg.STATE_CROSS_GEN

    def test_bce_ce_gap_is_measured_on_a_single_axis(self):
        a, b = tg.Interval(-50.0, -10.0), tg.Interval(10.0, 50.0)
        assert tg.compare_intervals(a, b, tol=10) == tg.STATE_CROSS_GEN
        assert tg.compare_intervals(a, b, tol=20) == tg.STATE_ADJACENT

    def test_open_ended_end_absorbs_later_interval(self):
        a = tg.Interval(1500.0, float("inf"))
        b = tg.Interval(1900.0, 1950.0)
        assert tg.compare_intervals(a, b, tol=0) == tg.STATE_OVERLAP

    def test_open_ended_start_absorbs_earlier_interval(self):
        a = tg.Interval(float("-inf"), 1500.0)
        b = tg.Interval(100.0, 200.0)
        assert tg.compare_intervals(a, b, tol=0) == tg.STATE_OVERLAP

    def test_open_ended_still_cross_gen_on_the_closed_side(self):
        a = tg.Interval(1500.0, float("inf"))
        b = tg.Interval(100.0, 200.0)
        assert tg.compare_intervals(a, b, tol=50) == tg.STATE_CROSS_GEN

    # --- D2: tolerance is explicit, never invented ------------------------
    def test_none_tolerance_raises_and_is_not_coerced_to_zero(self):
        a, b = tg.Interval(100.0, 200.0), tg.Interval(200.0, 300.0)
        with pytest.raises(tg.MissingToleranceError):
            tg.compare_intervals(a, b, tol=None)

    def test_zero_tolerance_is_accepted_as_an_explicit_value(self):
        """`0` is a legitimate explicit tolerance -- it carries no LEGACY meaning."""
        a, b = tg.Interval(100.0, 200.0), tg.Interval(201.0, 300.0)
        assert tg.compare_intervals(a, b, tol=0) == tg.STATE_CROSS_GEN

    def test_negative_tolerance_rejected(self):
        a, b = tg.Interval(100.0, 200.0), tg.Interval(300.0, 400.0)
        with pytest.raises(ValueError):
            tg.compare_intervals(a, b, tol=-1)

    def test_non_numeric_tolerance_rejected(self):
        a, b = tg.Interval(100.0, 200.0), tg.Interval(300.0, 400.0)
        for bad in ("50", True, [50]):
            with pytest.raises((TypeError, tg.MissingToleranceError)):
                tg.compare_intervals(a, b, tol=bad)

    def test_none_interval_is_a_caller_error_not_a_no_date_result(self):
        """Precedence (1) belongs to decide(); the primitive refuses to guess."""
        a = tg.Interval(100.0, 200.0)
        with pytest.raises(ValueError):
            tg.compare_intervals(a, None, tol=TOL)
        with pytest.raises(ValueError):
            tg.compare_intervals(None, a, tol=TOL)


# ===========================================================================
# L2 -- classifier (incl. PO decision D1)
# ===========================================================================
class TestL2Classifier:
    @pytest.mark.parametrize("rel", sorted(RELATIONSHIP_MEANING))
    def test_every_frozen_type_classifies_without_raising(self, rel):
        assert tg.classify_relation(rel) in (
            tg.CLASS_HARD, tg.CLASS_BEFORE_AFTER,
            tg.CLASS_PROPAGATION, tg.CLASS_SOFT_WEAK,
        )

    @pytest.mark.parametrize("rel", ["disputes", "reinterprets"])
    def test_d1_real_out_of_taxonomy_types_raise(self, rel):
        """`disputes` / `reinterprets` are real `validation.RELATIONSHIP_TYPES`
        members (20 types) but NOT temporal-taxonomy members (18 types).
        They MUST raise, not degrade (PO decision D1)."""
        with pytest.raises(tg.UnmappedRelationError):
            tg.classify_relation(rel)

    @pytest.mark.parametrize(
        "bad", ["", "UNKNOWN", "unknown", "Related_To", "RELATED_TO", " related_to",
                "related_to ", "influences", "causes", None, 0, 1, [], {}, object()]
    )
    def test_d1_unmapped_input_raises(self, bad):
        with pytest.raises(tg.UnmappedRelationError):
            tg.classify_relation(bad)

    def test_d1_never_falls_back_to_soft_weak(self):
        """The forbidden `UNKNOWN -> SOFT_WEAK` behaviour must be absent."""
        for bad in ("disputes", "reinterprets", "UNKNOWN", None):
            try:
                result = tg.classify_relation(bad)
            except tg.UnmappedRelationError:
                continue
            pytest.fail(
                "classify_relation(%r) returned %r instead of raising; a silent "
                "downgrade to SOFT_WEAK is forbidden by D1" % (bad, result)
            )

    def test_d1_error_message_is_actionable(self):
        with pytest.raises(tg.UnmappedRelationError) as excinfo:
            tg.classify_relation("disputes")
        message = str(excinfo.value)
        assert "disputes" in message
        assert "related_to" in message  # enumerates the known taxonomy

    def test_unmapped_relation_error_is_a_temporal_gate_error(self):
        assert issubclass(tg.UnmappedRelationError, tg.TemporalGateError)
        assert issubclass(tg.MissingToleranceError, tg.TemporalGateError)


# ===========================================================================
# L3 -- decision matrix, cell by cell (Contract §3 table)
# ===========================================================================
OVERLAP_A = ent_start_end(100, 200)
OVERLAP_B = ent_start_end(150, 250)
ADJACENT_B = ent_start_end(220, 300)          # gap 20 <= TOL(50)
CROSS_GEN_B = ent_start_end(1500, 1600)       # gap 1300 > TOL(50)


class TestL3HardClass:
    @pytest.mark.parametrize("rel", sorted(tg.TEMPORAL_TAXONOMY[tg.CLASS_HARD]))
    def test_hard_overlap_accepts(self, rel):
        d = tg.decide(rel, OVERLAP_A, OVERLAP_B, tol=TOL)
        assert (d.decision, d.relation_class, d.temporal_state) == (
            tg.DECISION_ACCEPT, tg.CLASS_HARD, tg.STATE_OVERLAP)

    @pytest.mark.parametrize("rel", sorted(tg.TEMPORAL_TAXONOMY[tg.CLASS_HARD]))
    def test_hard_adjacent_accepts(self, rel):
        d = tg.decide(rel, OVERLAP_A, ADJACENT_B, tol=TOL)
        assert (d.decision, d.temporal_state) == (tg.DECISION_ACCEPT, tg.STATE_ADJACENT)

    @pytest.mark.parametrize("rel", sorted(tg.TEMPORAL_TAXONOMY[tg.CLASS_HARD]))
    def test_hard_cross_gen_rejects(self, rel):
        d = tg.decide(rel, OVERLAP_A, CROSS_GEN_B, tol=TOL)
        assert (d.decision, d.temporal_state) == (tg.DECISION_REJECT, tg.STATE_CROSS_GEN)


class TestL3BeforeAfterClass:
    @pytest.mark.parametrize("rel", ["before", "after"])
    def test_overlap_accepts(self, rel):
        d = tg.decide(rel, OVERLAP_A, OVERLAP_B, tol=TOL)
        assert (d.decision, d.relation_class) == (tg.DECISION_ACCEPT, tg.CLASS_BEFORE_AFTER)

    @pytest.mark.parametrize("rel", ["before", "after"])
    def test_adjacent_within_tolerance_accepts(self, rel):
        d = tg.decide(rel, OVERLAP_A, ADJACENT_B, tol=TOL)
        assert (d.decision, d.temporal_state) == (tg.DECISION_ACCEPT, tg.STATE_ADJACENT)

    @pytest.mark.parametrize("rel", ["before", "after"])
    def test_cross_gen_rejects(self, rel):
        d = tg.decide(rel, OVERLAP_A, CROSS_GEN_B, tol=TOL)
        assert (d.decision, d.temporal_state) == (tg.DECISION_REJECT, tg.STATE_CROSS_GEN)

    def test_tolerance_is_the_only_thing_separating_accept_from_reject(self):
        """Same entities, different EXPLICIT tol -> different decision (D2)."""
        a, b = ent_start_end(100, 200), ent_start_end(300, 400)
        assert tg.decide("before", a, b, tol=100).decision == tg.DECISION_ACCEPT
        assert tg.decide("before", a, b, tol=99).decision == tg.DECISION_REJECT


class TestL3PropagationClass:
    @pytest.mark.parametrize("rel", sorted(tg.TEMPORAL_TAXONOMY[tg.CLASS_PROPAGATION]))
    def test_overlap_accepts(self, rel):
        d = tg.decide(rel, OVERLAP_A, OVERLAP_B, tol=TOL)
        assert (d.decision, d.relation_class) == (tg.DECISION_ACCEPT, tg.CLASS_PROPAGATION)

    @pytest.mark.parametrize("rel", sorted(tg.TEMPORAL_TAXONOMY[tg.CLASS_PROPAGATION]))
    def test_adjacent_accepts(self, rel):
        d = tg.decide(rel, OVERLAP_A, ADJACENT_B, tol=TOL)
        assert (d.decision, d.temporal_state) == (tg.DECISION_ACCEPT, tg.STATE_ADJACENT)

    @pytest.mark.parametrize("rel", sorted(tg.TEMPORAL_TAXONOMY[tg.CLASS_PROPAGATION]))
    def test_cross_gen_downgrades_to_soft_never_rejects(self, rel):
        d = tg.decide(rel, OVERLAP_A, CROSS_GEN_B, tol=TOL)
        assert d.decision == tg.DECISION_SOFT
        assert d.temporal_state == tg.STATE_CROSS_GEN
        assert "downgrad" in d.reason.lower()


class TestL3SoftWeakClass:
    @pytest.mark.parametrize(
        "other", [OVERLAP_B, ADJACENT_B, CROSS_GEN_B], ids=["overlap", "adjacent", "cross_gen"]
    )
    def test_soft_weak_is_soft_regardless_of_temporal_state(self, other):
        d = tg.decide("related_to", OVERLAP_A, other, tol=TOL)
        assert d.decision == tg.DECISION_SOFT
        assert d.relation_class == tg.CLASS_SOFT_WEAK
        assert d.temporal_state == tg.STATE_SKIPPED

    def test_soft_weak_never_rejects_even_across_millennia(self):
        d = tg.decide("related_to", ent_start_end(-3000, -2900), ent_start_end(1900, 2000), tol=0)
        assert d.decision == tg.DECISION_SOFT

    def test_soft_weak_does_not_remodel_knowledge_semantics(self):
        """Contract §3: knowledge-relation semantics of `related_to` unchanged;
        the gate reports a class, never a new relation type."""
        d = tg.decide("related_to", OVERLAP_A, OVERLAP_B, tol=TOL)
        assert d.relation_class == tg.CLASS_SOFT_WEAK
        assert tg.RELATION_TEMPORAL_CLASS["related_to"] == tg.CLASS_SOFT_WEAK


class TestL3NoDateRow:
    @pytest.mark.parametrize("rel", ["spoke", "before", "caused", "related_to"])
    def test_missing_date_on_either_side_is_soft_and_neutral(self, rel):
        for a, b in ((ENTITY_NO_DATE, OVERLAP_B), (OVERLAP_A, ENTITY_NO_DATE),
                     (ENTITY_NO_DATE, ENTITY_NO_DATE)):
            d = tg.decide(rel, a, b, tol=TOL)
            assert d.decision == tg.DECISION_SOFT
            assert d.temporal_state == tg.STATE_NO_DATE

    def test_no_date_is_not_a_hard_rejection_even_for_hard_relations(self):
        """Contract §3 no-date row: 'SOFT（中性，不硬拒）'."""
        d = tg.decide("spoke", ENTITY_NO_DATE, OVERLAP_B, tol=TOL)
        assert d.decision != tg.DECISION_REJECT
        assert d.decision == tg.DECISION_SOFT

    def test_relation_class_is_still_reported_for_audit(self):
        d = tg.decide("spoke", ENTITY_NO_DATE, ENTITY_NO_DATE, tol=TOL)
        assert d.relation_class == tg.CLASS_HARD


# ===========================================================================
# L4 -- precedence, two-path independence (white-box), determinism
# ===========================================================================
class TestL4Precedence:
    def test_date_availability_precedes_classification(self):
        """Precedence (1) short-circuits before (3): HARD + no-date != REJECT."""
        d = tg.decide("conquered", ENTITY_NO_DATE, CROSS_GEN_B, tol=0)
        assert (d.decision, d.temporal_state) == (tg.DECISION_SOFT, tg.STATE_NO_DATE)

    def test_no_date_beats_soft_weak_skip_in_state_reporting(self):
        """Both end at SOFT, but the REASON differs and must stay distinguishable."""
        no_date = tg.decide("related_to", ENTITY_NO_DATE, OVERLAP_B, tol=TOL)
        skipped = tg.decide("related_to", OVERLAP_A, OVERLAP_B, tol=TOL)
        assert no_date.temporal_state == tg.STATE_NO_DATE
        assert skipped.temporal_state == tg.STATE_SKIPPED
        assert no_date.decision == skipped.decision == tg.DECISION_SOFT

    def test_d1_input_validation_fires_before_any_date_logic(self):
        """An unmapped type raises even when dates are absent (fail-fast)."""
        with pytest.raises(tg.UnmappedRelationError):
            tg.decide("disputes", ENTITY_NO_DATE, ENTITY_NO_DATE, tol=TOL)

    def test_d2_missing_tolerance_surfaces_when_comparison_runs(self):
        with pytest.raises(tg.MissingToleranceError):
            tg.decide("spoke", OVERLAP_A, CROSS_GEN_B, tol=None)

    def test_no_date_short_circuit_never_consults_tolerance(self):
        """Proof of precedence (1) ordering: comparison is not reached at all.

        This asserts the ORDER of the precedence steps. It is NOT a licence to
        omit `tol` -- callers still pass it explicitly (D2).
        """
        d = tg.decide("spoke", ENTITY_NO_DATE, OVERLAP_B, tol=None)
        assert d.temporal_state == tg.STATE_NO_DATE


class TestL4TwoIndependentSoftPaths:
    """Contract §3 forbids merging PROPAGATION-downgrade with SOFT-WEAK-skip.

    These are white-box tests: they spy on `compare_intervals` to prove the
    skip/execute difference structurally, rather than merely asserting that
    both outcomes happen to be SOFT.
    """

    @staticmethod
    def _spy(monkeypatch):
        calls = []
        real = tg.compare_intervals

        def wrapper(a, b, tol):
            calls.append({"a": a, "b": b, "tol": tol})
            return real(a, b, tol)

        monkeypatch.setattr(tg, "compare_intervals", wrapper)
        return calls

    def test_soft_weak_path_skips_interval_comparison(self, monkeypatch):
        calls = self._spy(monkeypatch)
        d = tg.decide("related_to", OVERLAP_A, CROSS_GEN_B, tol=TOL)
        assert calls == [], "SOFT-WEAK must SKIP precedence (3), but it called it"
        assert (d.decision, d.temporal_state) == (tg.DECISION_SOFT, tg.STATE_SKIPPED)

    def test_propagation_path_executes_interval_comparison(self, monkeypatch):
        calls = self._spy(monkeypatch)
        d = tg.decide("influenced", OVERLAP_A, CROSS_GEN_B, tol=TOL)
        assert len(calls) == 1, "PROPAGATION must EXECUTE precedence (3)"
        assert calls[0]["tol"] == TOL
        assert (d.decision, d.temporal_state) == (tg.DECISION_SOFT, tg.STATE_CROSS_GEN)

    def test_same_decision_different_provenance(self):
        """Both are SOFT; the temporal_state + reason keep them separable."""
        prop = tg.decide("influenced", OVERLAP_A, CROSS_GEN_B, tol=TOL)
        weak = tg.decide("related_to", OVERLAP_A, CROSS_GEN_B, tol=TOL)
        assert prop.decision == weak.decision == tg.DECISION_SOFT
        assert prop.temporal_state != weak.temporal_state
        assert prop.relation_class != weak.relation_class
        assert prop.reason != weak.reason

    def test_soft_weak_skips_comparison_so_tolerance_is_never_consulted(self):
        """Structural consequence of the skip, not a licence to omit `tol`.

        Because SOFT-WEAK returns before precedence (3), a missing tolerance
        cannot raise on this path. Asserting it proves the branch is genuinely
        independent (a merged implementation would raise here).
        """
        d = tg.decide("related_to", OVERLAP_A, CROSS_GEN_B, tol=None)
        assert (d.decision, d.temporal_state) == (tg.DECISION_SOFT, tg.STATE_SKIPPED)

    def test_hard_and_propagation_diverge_on_the_same_cross_gen_pair(self):
        hard = tg.decide("ruled", OVERLAP_A, CROSS_GEN_B, tol=TOL)
        prop = tg.decide("caused", OVERLAP_A, CROSS_GEN_B, tol=TOL)
        assert hard.decision == tg.DECISION_REJECT
        assert prop.decision == tg.DECISION_SOFT
        assert hard.temporal_state == prop.temporal_state == tg.STATE_CROSS_GEN


class TestL4Determinism:
    def test_repeated_calls_are_identical(self):
        """Invariant I-14: pure and deterministic."""
        results = {
            tg.decide("caused", OVERLAP_A, CROSS_GEN_B, tol=TOL) for _ in range(25)
        }
        assert len(results) == 1

    def test_decision_is_immutable(self):
        d = tg.decide("spoke", OVERLAP_A, OVERLAP_B, tol=TOL)
        with pytest.raises(Exception):
            d.decision = tg.DECISION_REJECT

    def test_inputs_are_not_mutated(self):
        import copy
        a, b = ent_start_end(100, 200), ent_start_end(1500, 1600)
        a_before, b_before = copy.deepcopy(a), copy.deepcopy(b)
        tg.decide("influenced", a, b, tol=TOL)
        assert a == a_before and b == b_before

    def test_argument_order_symmetry_for_symmetric_states(self):
        forward = tg.decide("contemporary_with", OVERLAP_A, CROSS_GEN_B, tol=TOL)
        reverse = tg.decide("contemporary_with", CROSS_GEN_B, OVERLAP_A, tol=TOL)
        assert forward.decision == reverse.decision
        assert forward.temporal_state == reverse.temporal_state


class TestL4PhaseIsolation:
    # ADR-0028 P2/P3: the gate is a focused core module. It IS now authorized
    # to be wired into the two integration surfaces that consume its decisions
    # (grounding_builder for P2, response_validator for P3). It must NOT be
    # imported by the broader runtime (answer_service, main, exploration_engine,
    # validation, etc.) nor by any unrelated module — the gate stays a leaf.
    _AUTHORIZED_IMPORTERS = {
        "app/ai_gateway/grounding_builder.py",
        "app/ai_gateway/response_validator.py",
    }

    def test_gate_wired_only_into_authorized_surfaces(self):
        """Phase 2/3 scope: wired ONLY into the authorized integration files."""
        hits = []
        for path in (BACKEND_DIR / "app").rglob("*.py"):
            if path.name == "temporal_gate.py":
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            if "temporal_gate" in text:
                hits.append(str(path.relative_to(BACKEND_DIR)).replace("\\", "/"))
        assert set(hits) <= self._AUTHORIZED_IMPORTERS, (
            "temporal_gate must be wired ONLY into the authorized P2/P3 "
            "integration surfaces %s, but found: %s"
            % (sorted(self._AUTHORIZED_IMPORTERS), hits)
        )

    def test_gate_imports_no_configuration(self):
        """D2: the gate never reads tuning config; `tol` arrives via argument."""
        source = (BACKEND_DIR / "app" / "ai_gateway" / "temporal_gate.py").read_text(
            encoding="utf-8"
        )
        config_imports = [
            line for line in source.splitlines()
            if line.startswith(("import ", "from ")) and "config" in line
        ]
        assert config_imports == [], (
            "temporal_gate must not import configuration (D2): %s" % (config_imports,)
        )

    def test_gate_has_no_io_or_clock_dependency(self):
        """Invariant I-14: deterministic, no ambient state."""
        source = (BACKEND_DIR / "app" / "ai_gateway" / "temporal_gate.py").read_text(
            encoding="utf-8"
        )
        imports = [
            line.strip() for line in source.splitlines()
            if line.startswith(("import ", "from "))
        ]
        forbidden = ("random", "datetime", "time", "os", "logging", "requests", "httpx")
        offenders = [
            line for line in imports
            if any(mod in line.split() for mod in forbidden)
        ]
        assert offenders == [], "non-deterministic import found: %s" % (offenders,)


# ---------------------------------------------------------------------------
# L5 integration — temporal_gate wired into GroundingBuilder (ADR-0028 P2)
# ---------------------------------------------------------------------------
class _StubKS:
    """Minimal read-only KnowledgeService for grounding integration tests."""

    def __init__(self, entities, neighbors):
        self._entities = entities          # gid -> entity dict
        self._neighbors = neighbors        # gid -> list[neighbor dict]

    def find_by_global_id(self, gid):
        e = self._entities.get(gid)
        if e is None:
            return None
        return ("topic", gid, e)

    def global_neighbors(self, gid, direction="both"):
        return list(self._neighbors.get(gid, []))

    def global_subgraph(self, roots, max_depth=2):
        class _G:
            node_count = 0
        return _G()

    def get_timeline_index(self, topic):
        return []


def _l5_knowledge_service():
    """A->B(ruled,cross-gen) A->C(ruled,overlap) A->D(disputes) A->E(influenced,
    cross-gen); B->F(ruled, cross-gen) as a 2-hop chain."""
    entities = {
        "A": ent_start_end(100, 200),
        "B": ent_start_end(1500, 1600),
        "C": ent_start_end(120, 180),
        "D": ent_start_end(1500, 1600),
        "E": ent_start_end(1500, 1600),
        "F": ent_start_end(3000, 3100),
    }
    neighbors = {
        "A": [
            {"global_id": "B", "name": "B", "relationship": "ruled", "direction": "outgoing"},
            {"global_id": "C", "name": "C", "relationship": "ruled", "direction": "outgoing"},
            {"global_id": "D", "name": "D", "relationship": "disputes", "direction": "outgoing"},
            {"global_id": "E", "name": "E", "relationship": "influenced", "direction": "outgoing"},
        ],
        "B": [
            {"global_id": "F", "name": "F", "relationship": "ruled", "direction": "outgoing"},
        ],
    }
    return _StubKS(entities, neighbors)


class TestL5GroundingIntegration:
    def test_dormant_passthrough_no_gating(self):
        """tol=None (production default) -> no gating, behaviour unchanged."""
        builder = GroundingBuilder(_l5_knowledge_service())
        assert builder._tuning.tol is None
        result = builder.build(["A"], "why?")
        assert result.temporal_rejects == []
        facts = result.facts
        # HARD cross-gen is NOT rejected while dormant.
        assert "A —[ruled]→ B  [B]" in facts
        assert "B —[ruled]→ F (2-hop via context)  [F]" in facts
        # D1 type passes through.
        assert "A —[disputes]→ D  [D]" in facts

    def test_active_gating_rejects_hard_crossgen(self):
        """tol set -> HARD cross-generation relations are dropped + audited."""
        builder = GroundingBuilder(
            _l5_knowledge_service(), tuning=GroundingTuningConfig(tol=50.0)
        )
        result = builder.build(["A"], "why?")
        rejects = result.temporal_rejects
        assert len(rejects) == 2
        pairs = {
            (r["source_global_id"], r["target_global_id"], r["relationship"])
            for r in rejects
        }
        assert ("A", "B", "ruled") in pairs        # neighbor loop
        assert ("B", "F", "ruled") in pairs        # 2-hop loop
        for r in rejects:
            assert r["temporal_state"] == "cross_gen"
            assert r["reason"]  # audit surface is populated
        facts = result.facts
        assert "A —[ruled]→ B  [B]" not in facts
        assert "B —[ruled]→ F (2-hop via context)  [F]" not in facts
        # ACCEPT (overlap), SOFT (propagation downgrade), D1 passthrough kept.
        assert "A —[ruled]→ C  [C]" in facts
        assert "A —[influenced]→ E  [E]" in facts
        assert "A —[disputes]→ D  [D]" in facts
        # to_dict exposes the provenance for the runtime/validator to consume.
        assert result.to_dict()["temporal_rejects"] == rejects

    def test_d1_prefilter_disputes_never_gated(self):
        """disputes/reinterprets are outside the taxonomy -> never gated, never
        handed to the gate to be rejected (defense-in-depth pre-filter)."""
        builder = GroundingBuilder(
            _l5_knowledge_service(), tuning=GroundingTuningConfig(tol=50.0)
        )
        result = builder.build(["A"], "why?")
        # disputes edge is present as a fact and produces NO temporal reject.
        assert "A —[disputes]→ D  [D]" in result.facts
        assert all(r["relationship"] != "disputes" for r in result.temporal_rejects)


class _L5ValidatorStubKS:
    """Minimal read-only KnowledgeService for the validator L5 tests."""

    def __init__(self):
        self._entities = {
            "A": ent_start_end(100, 200),
            "B": ent_start_end(1500, 1600),
        }

    def find_by_global_id(self, gid):
        e = self._entities.get(gid)
        return ("topic", gid, e) if e else None

    def global_neighbors(self, gid, direction="both"):
        if gid == "A":
            return [
                {"global_id": "B", "name": "B", "relationship": "ruled", "direction": "outgoing"}
            ]
        return []

    def global_subgraph(self, roots, max_depth=2):
        class _G:
            node_count = 0
        return _G()

    def get_timeline_index(self, topic):
        return []


class TestL5ResponseValidation:
    def test_dormant_passthrough_keeps_citation(self):
        """tuning=None (production default) -> no temporal re-check."""
        validator = ResponseValidator(_L5ValidatorStubKS())
        assert validator._tuning is None
        cit = Citation(global_id="B", kind="relationship", label="ruled")
        result = validator.validate([cit], ["A"])
        assert result.temporal_rejects == []
        # HARD cross-gen citation is NOT rejected while dormant.
        assert cit in result.valid_citations

    def test_active_gating_rejects_incoherent_citation(self):
        """tol set -> a temporally-incoherent relationship citation is rejected
        and recorded for audit."""
        validator = ResponseValidator(
            _L5ValidatorStubKS(), tuning=GroundingTuningConfig(tol=50.0)
        )
        cit = Citation(global_id="B", kind="relationship", label="ruled")
        result = validator.validate([cit], ["A"])
        assert cit in result.rejected_citations
        assert len(result.temporal_rejects) == 1
        reject = result.temporal_rejects[0]
        assert reject["global_id"] == "B"
        assert reject["relationship"] == "ruled"
        assert "Contract §3" in reject["reason"]
        # No valid citation -> not grounded.
        assert result.grounded is False

    def test_d1_prefilter_disputes_passthrough(self):
        """disputes is outside the taxonomy -> never gated, always kept when the
        neighbor edge itself is real."""
        validator = ResponseValidator(
            _L5ValidatorStubKS(), tuning=GroundingTuningConfig(tol=50.0)
        )
        cit = Citation(global_id="B", kind="relationship", label="disputes")
        result = validator.validate([cit], ["A"])
        assert cit in result.valid_citations
        assert result.temporal_rejects == []

