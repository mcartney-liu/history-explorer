"""ADR-0028 Phase 1 -- Temporal Coherence Gate (pure core, NOT wired).

Behavioural source of truth
---------------------------
`docs/15_DECISIONS/CONTRACT_vNext_1.2_research_context.md` **§3 Temporal Rule
Matrix (FROZEN)**. This module implements §3 verbatim. It adds NO semantics of
its own and freezes NO tuning value.

Scope discipline (ADR-0028 Phase 1)
-----------------------------------
* PURE FUNCTIONS ONLY. No IO, no clock, no randomness, no logging, no network.
  Deterministic for identical inputs (invariant I-14).
* NOT WIRED. Nothing in `grounding_builder` / `response_validator` /
  `answer_service` imports this module in Phase 1. Wiring is Phase 2 / Phase 3.
* Reads no configuration. `tol` is always supplied by the caller (see D2).

Contract §3 precedence (strict)
-------------------------------
1. **Date availability** -- either side without a usable date -> SOFT
   (evaluated BEFORE classification).
2. **Relation classification** -- HARD / BEFORE_AFTER / PROPAGATION / SOFT-WEAK.
3. **Interval comparison** -- only for classes that perform it; SOFT-WEAK
   SKIPS this step.

Contract §3 decision matrix
---------------------------
| relation class        | overlap / adjacent | cross-generation |
|-----------------------|--------------------|------------------|
| HARD (10 types)       | ACCEPT             | REJECT           |
| before / after (2)    | ACCEPT (<= TOL)    | REJECT           |
| propagation (5)       | ACCEPT             | SOFT (downgrade) |
| SOFT-WEAK (related_to)| SOFT               | SOFT             |
| no-date               | SOFT (neutral)     | SOFT (neutral)   |

Two independent SOFT paths (Contract §3, normative)
---------------------------------------------------
`PROPAGATION` cross-generation and `SOFT-WEAK` both end at decision level SOFT,
but the Contract forbids merging them into one path:

* `PROPAGATION -> SOFT` : interval comparison IS executed, cross-gen is
  detected, and the result is **downgraded** to SOFT.
* `SOFT-WEAK  -> SOFT` : interval comparison is **skipped** entirely; SOFT is
  emitted directly.

`decide()` therefore returns from the SOFT-WEAK branch *before* any call to
`compare_intervals`, so the skip is observable (white-box testable) rather than
merely documented.

PO decisions honoured verbatim
------------------------------
* **D1 (unmapped relation)** -- a relation type outside the frozen 18-type
  temporal taxonomy is an EXPLICIT DEFENSIVE FAILURE: `classify_relation`
  raises `UnmappedRelationError`. There is deliberately NO
  `UNKNOWN -> SOFT_WEAK` fallback, NO silent downgrade and NO audit-log
  swallow. `disputes` / `reinterprets` exist in `validation.RELATIONSHIP_TYPES`
  (20 types) but are NOT part of this gate's taxonomy (18 types); feeding them
  here is a caller contract violation and must surface as such.
* **D2 (tolerance)** -- `tol` is a REQUIRED explicit argument. This module
  never reads `GroundingTuningConfig.tol` and never converts `None -> 0`.
  A `None` tolerance raises `MissingToleranceError`. Contract vNext 1.2 freezes
  no TOL value ([T] runtime tuning), and `0` carries no "LEGACY" meaning here.

Interval extraction note (implementation detail, NOT Contract semantics)
------------------------------------------------------------------------
Entities in the frozen KG carry structured time as `start_date` / `end_date`
OR `birth` / `death`, each a `{value:int, precision, certainty, label}` object.
Field preference is `start_date`/`end_date` first, then `birth`/`death`. On the
real dataset the 26 entities carrying both expose IDENTICAL values, so the
preference is behaviourally neutral; it exists so that entities carrying ONLY
`birth`/`death` are no longer read as date-less (the pre-existing
`exploration_engine._rep_year` defect, deliberately not carried forward).

Invariant I-01 is honoured: comparison uses an interval-overlap primitive.
A single representative year is never used.
"""
from dataclasses import dataclass
from typing import Any, NamedTuple, Optional

# ---------------------------------------------------------------------------
# Relation classes (Contract §3)
# ---------------------------------------------------------------------------
CLASS_HARD = "HARD"
CLASS_BEFORE_AFTER = "BEFORE_AFTER"
CLASS_PROPAGATION = "PROPAGATION"
CLASS_SOFT_WEAK = "SOFT_WEAK"

# ---------------------------------------------------------------------------
# Decisions (Contract §3)
# ---------------------------------------------------------------------------
DECISION_ACCEPT = "ACCEPT"
DECISION_REJECT = "REJECT"
DECISION_SOFT = "SOFT"

# ---------------------------------------------------------------------------
# Temporal states
#
# `no_date`  -> precedence (1) short-circuit: a usable interval is missing.
# `skipped`  -> precedence (3) not executed (SOFT-WEAK only).
# ---------------------------------------------------------------------------
STATE_OVERLAP = "overlap"
STATE_ADJACENT = "adjacent"
STATE_CROSS_GEN = "cross_gen"
STATE_NO_DATE = "no_date"
STATE_SKIPPED = "skipped"

# ---------------------------------------------------------------------------
# Frozen 18-type -> temporal class binding (Contract §3 "18 型类别绑定（冻结）").
#
# Set closure: this table's key set is exactly `exploration_engine
# .RELATIONSHIP_MEANING` (18) == `M4-002_Architecture.md:14` authoritative
# enumeration == frozen REL=18 invariant.
# Category closure: 10 HARD + 2 BEFORE_AFTER + 5 PROPAGATION + 1 SOFT-WEAK = 18
# (Contract §3 "I-03 澄清").
#
# This table is a MIRROR of frozen Contract semantics. It must not be extended
# to add a new taxonomy member without an ADR + PO approval.
# ---------------------------------------------------------------------------
RELATION_TEMPORAL_CLASS = {
    # --- HARD (10) : co-existence is required; cross-generation is a defect ---
    "spoke": CLASS_HARD,
    "participated_in": CLASS_HARD,
    "located_at": CLASS_HARD,
    "contemporary_with": CLASS_HARD,
    "part_of": CLASS_HARD,
    "ruled": CLASS_HARD,
    "traded_with": CLASS_HARD,
    "invented": CLASS_HARD,
    "discovered": CLASS_HARD,
    "conquered": CLASS_HARD,
    # --- BEFORE / AFTER (2) : ordering, adjacency-tolerant ---
    "before": CLASS_BEFORE_AFTER,
    "after": CLASS_BEFORE_AFTER,
    # --- PROPAGATION (5) : cross-generation does NOT negate the relation ---
    "caused": CLASS_PROPAGATION,
    "influenced": CLASS_PROPAGATION,
    "inherited": CLASS_PROPAGATION,
    "spread": CLASS_PROPAGATION,
    "practiced": CLASS_PROPAGATION,
    # --- SOFT-WEAK (1) : no gate-enforceable temporal constraint ---
    "related_to": CLASS_SOFT_WEAK,
}

# Ordered class -> members view, for audit / test enumeration only.
TEMPORAL_TAXONOMY = {
    CLASS_HARD: tuple(
        r for r, c in RELATION_TEMPORAL_CLASS.items() if c == CLASS_HARD
    ),
    CLASS_BEFORE_AFTER: tuple(
        r for r, c in RELATION_TEMPORAL_CLASS.items() if c == CLASS_BEFORE_AFTER
    ),
    CLASS_PROPAGATION: tuple(
        r for r, c in RELATION_TEMPORAL_CLASS.items() if c == CLASS_PROPAGATION
    ),
    CLASS_SOFT_WEAK: tuple(
        r for r, c in RELATION_TEMPORAL_CLASS.items() if c == CLASS_SOFT_WEAK
    ),
}


# ---------------------------------------------------------------------------
# Errors -- explicit defensive failures (PO decisions D1 / D2)
# ---------------------------------------------------------------------------
class TemporalGateError(Exception):
    """Base class for Temporal Gate contract violations."""


class UnmappedRelationError(TemporalGateError):
    """Relation type is outside the frozen 18-type temporal taxonomy (D1).

    Raised instead of degrading to SOFT_WEAK. Callers that may hold relation
    types beyond the taxonomy (e.g. `disputes` / `reinterprets`, which are
    valid `validation.RELATIONSHIP_TYPES` members but NOT temporal-taxonomy
    members) must decide explicitly how to handle them -- the gate refuses to
    decide on their behalf.
    """


class MissingToleranceError(TemporalGateError):
    """`tol` was not supplied (D2).

    Contract vNext 1.2 does not freeze a TOL value, and this module must not
    invent one. `None` is not silently coerced to `0`.
    """


# ---------------------------------------------------------------------------
# Interval primitive (invariant I-01)
# ---------------------------------------------------------------------------
class Interval(NamedTuple):
    """A closed year interval; negative years are BCE.

    `start`/`end` may be `-inf`/`+inf` to model an open-ended bound (a known
    start with an unknown end, or vice versa). A fully unknown entity yields
    `None` rather than an infinite interval, so that precedence (1) can
    distinguish "no date at all" from "open-ended".
    """

    start: float
    end: float


def _date_value(field: Any) -> Optional[int]:
    """Read `.value` from a structured time object, or `None`.

    Accepts the frozen KG shape `{"value": int, "precision": ..., ...}`.
    Anything else (missing, null, non-dict, non-int value) reads as unknown.
    `bool` is rejected explicitly: it is an `int` subclass in Python and a
    boolean year is always malformed data, never year 0 or 1.
    """
    if not isinstance(field, dict):
        return None
    value = field.get("value")
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return int(value)


def _interval_from_pair(lo: Any, hi: Any) -> Optional[Interval]:
    """Build an interval from a (start-ish, end-ish) structured-time pair."""
    lo_v = _date_value(lo)
    hi_v = _date_value(hi)
    if lo_v is None and hi_v is None:
        return None
    start = float(lo_v) if lo_v is not None else float("-inf")
    end = float(hi_v) if hi_v is not None else float("inf")
    if start > end:
        # Defensive normalisation for inverted source data. Swapping keeps the
        # primitive total (never raises on real data) without inventing any
        # temporal semantics.
        start, end = end, start
    return Interval(start, end)


def extract_interval(entity: Any) -> Optional[Interval]:
    """Extract an entity's year interval, or `None` when it has no usable date.

    Field preference: `start_date`/`end_date`, then `birth`/`death`. See the
    module docstring -- this preference is an implementation detail and is
    behaviourally neutral on the real dataset.

    Returning `None` is what drives Contract §3 precedence (1) (-> SOFT).
    """
    if not isinstance(entity, dict):
        return None
    primary = _interval_from_pair(entity.get("start_date"), entity.get("end_date"))
    if primary is not None:
        return primary
    return _interval_from_pair(entity.get("birth"), entity.get("death"))


def compare_intervals(
    a: Optional[Interval], b: Optional[Interval], tol: Optional[float]
) -> str:
    """Compare two intervals -> `overlap` | `adjacent` | `cross_gen`.

    This is Contract §3 precedence (3), the interval-overlap primitive required
    by invariant I-01. It is intentionally NOT responsible for precedence (1):
    a `None` interval is a caller error here, because `decide()` short-circuits
    the no-date case before reaching this function.

    `tol` is REQUIRED (D2). `None` raises `MissingToleranceError`; it is never
    coerced to `0`.

    Semantics:
      * overlap   -- the two intervals intersect (inclusive bounds).
      * adjacent  -- disjoint, but the gap between them is `<= tol`.
      * cross_gen -- disjoint with a gap `> tol`.
    """
    if tol is None:
        raise MissingToleranceError(
            "compare_intervals() requires an explicit `tol`; Contract vNext 1.2 "
            "freezes no TOL value and this gate must not invent one (D2)."
        )
    if isinstance(tol, bool) or not isinstance(tol, (int, float)):
        raise TypeError("`tol` must be a real number, got %r" % (type(tol).__name__,))
    if tol < 0:
        raise ValueError("`tol` must be non-negative, got %r" % (tol,))
    if a is None or b is None:
        raise ValueError(
            "compare_intervals() received a None interval; the no-date case is "
            "Contract §3 precedence (1) and is handled by decide()."
        )

    # Inclusive-bound intersection test (I-01: interval overlap, never a single
    # representative year). Open-ended bounds fall out naturally via +/-inf.
    if a.start <= b.end and b.start <= a.end:
        return STATE_OVERLAP

    # Disjoint: exactly one ordering holds, and the facing bounds are finite
    # (an infinite bound would have produced an overlap above).
    gap = (b.start - a.end) if a.end < b.start else (a.start - b.end)
    if gap <= tol:
        return STATE_ADJACENT
    return STATE_CROSS_GEN


def classify_relation(rel_type: Any) -> str:
    """Map a relation type to its Contract §3 temporal class.

    Raises `UnmappedRelationError` for anything outside the frozen 18-type
    taxonomy (PO decision D1: explicit defensive failure, no SOFT_WEAK
    fallback, no silent downgrade).
    """
    if not isinstance(rel_type, str) or not rel_type:
        raise UnmappedRelationError(
            "relation type must be a non-empty string, got %r" % (rel_type,)
        )
    try:
        return RELATION_TEMPORAL_CLASS[rel_type]
    except KeyError:
        raise UnmappedRelationError(
            "relation type %r is not a member of the frozen 18-type Temporal "
            "Rule Matrix taxonomy (Contract vNext 1.2 §3). The gate refuses to "
            "classify it; the caller must decide explicitly (D1). Known types: "
            "%s" % (rel_type, ", ".join(sorted(RELATION_TEMPORAL_CLASS)))
        ) from None


@dataclass(frozen=True)
class TemporalDecision:
    """An auditable Temporal Gate outcome.

    Attributes:
        decision: `ACCEPT` | `REJECT` | `SOFT`.
        relation_class: the Contract §3 class the relation was bound to.
        temporal_state: `overlap` | `adjacent` | `cross_gen` | `no_date`
            | `skipped`.
        reason: human-readable justification naming the precedence step that
            produced `decision`. Audit surface only; never parsed for control
            flow.
    """

    decision: str
    relation_class: str
    temporal_state: str
    reason: str


def decide(
    rel_type: Any,
    entity_a: Any,
    entity_b: Any,
    tol: Optional[float],
) -> TemporalDecision:
    """Apply Contract §3 to one (relation, entity, entity) triple.

    `tol` is REQUIRED and explicit (D2); it is only consulted when precedence
    (3) actually runs.

    Precedence is applied strictly in Contract order. `classify_relation` is
    called first purely as INPUT VALIDATION (D1 fail-fast on an unmapped type),
    which is behaviourally equivalent to classifying later: under precedence
    (1) every class yields SOFT, so the ordering cannot change any decision for
    a valid 18-type input.
    """
    # --- D1 input validation: unmapped relation fails loudly, never degrades.
    relation_class = classify_relation(rel_type)

    interval_a = extract_interval(entity_a)
    interval_b = extract_interval(entity_b)

    # --- Contract §3 precedence (1): date availability, BEFORE classification.
    if interval_a is None or interval_b is None:
        missing = []
        if interval_a is None:
            missing.append("A")
        if interval_b is None:
            missing.append("B")
        return TemporalDecision(
            decision=DECISION_SOFT,
            relation_class=relation_class,
            temporal_state=STATE_NO_DATE,
            reason=(
                "precedence (1) date availability: side(s) %s carry no usable "
                "date -> SOFT (neutral, not a hard rejection)"
                % ("/".join(missing),)
            ),
        )

    # --- Contract §3 precedence (2)+(3), as INDEPENDENT per-class branches. ---

    # SOFT-WEAK: interval comparison is SKIPPED. This returns BEFORE any call
    # to compare_intervals, so the skip is observable, not merely asserted.
    # (Contract §3 "两种 SOFT 的语义来源区分", path 2.)
    if relation_class == CLASS_SOFT_WEAK:
        return TemporalDecision(
            decision=DECISION_SOFT,
            relation_class=CLASS_SOFT_WEAK,
            temporal_state=STATE_SKIPPED,
            reason=(
                "precedence (2) class=SOFT-WEAK: no gate-enforceable temporal "
                "constraint; precedence (3) interval comparison skipped -> SOFT"
            ),
        )

    state = compare_intervals(interval_a, interval_b, tol)
    coexists = state in (STATE_OVERLAP, STATE_ADJACENT)

    if relation_class == CLASS_HARD:
        if coexists:
            return TemporalDecision(
                DECISION_ACCEPT,
                CLASS_HARD,
                state,
                "precedence (3) class=HARD, temporal_state=%s: co-existence "
                "satisfied -> ACCEPT" % (state,),
            )
        return TemporalDecision(
            DECISION_REJECT,
            CLASS_HARD,
            state,
            "precedence (3) class=HARD, temporal_state=cross_gen: co-existence "
            "required but absent -> REJECT",
        )

    if relation_class == CLASS_BEFORE_AFTER:
        if coexists:
            return TemporalDecision(
                DECISION_ACCEPT,
                CLASS_BEFORE_AFTER,
                state,
                "precedence (3) class=before/after, temporal_state=%s: within "
                "adjacency tolerance -> ACCEPT" % (state,),
            )
        return TemporalDecision(
            DECISION_REJECT,
            CLASS_BEFORE_AFTER,
            state,
            "precedence (3) class=before/after, temporal_state=cross_gen: gap "
            "exceeds tolerance -> REJECT",
        )

    if relation_class == CLASS_PROPAGATION:
        if coexists:
            return TemporalDecision(
                DECISION_ACCEPT,
                CLASS_PROPAGATION,
                state,
                "precedence (3) class=propagation, temporal_state=%s -> ACCEPT"
                % (state,),
            )
        # Downgrade path: comparison WAS executed and cross-gen WAS detected;
        # cross-generation does not negate a propagation relation.
        # (Contract §3 "两种 SOFT 的语义来源区分", path 1.)
        return TemporalDecision(
            DECISION_SOFT,
            CLASS_PROPAGATION,
            STATE_CROSS_GEN,
            "precedence (3) class=propagation, temporal_state=cross_gen: "
            "cross-generation does not negate propagation -> downgraded to SOFT",
        )

    # Unreachable while RELATION_TEMPORAL_CLASS only contains the four frozen
    # classes. Kept as an explicit defensive failure rather than a silent
    # fallthrough, consistent with D1.
    raise TemporalGateError(
        "relation class %r has no Contract §3 decision branch" % (relation_class,)
    )
