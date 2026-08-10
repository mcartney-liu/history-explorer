# ADR-0019: Add disputes / reinterprets relationship types (Truth layer P09)

- Status: Accepted (2026-08-08, PO 拍板 via "按你推荐的来" + explicit choice)
- Decider: 翔哥 (PO)
- Amends: Freeze Baseline §Enum Guard — RELATIONSHIP_TYPES 18 → 20 (additive only)
- Related: ADR-0013 (Article 0), ADR-0018 (Truth layer fields), Product_Constitution P09 (真相可逼近性)

## Background

Article 0's third layer ("帮用户无限逼近真相") requires that a user can SEE
dissent, not just consensus. P09 mandates: 任一结论可见证据强度/来源分级/异议叙述.

ADR-0018 already gave every evidence claim `truth:{confidence, scholar_consensus,
controversy_level, interpretation_note}` — the dissent is *annotated* but not
*navigable*. The relationship graph (the platform's core exploration surface) has
18 frozen relationship types, none of which expresses scholarly disagreement or
reinterpretation. A user asking "罗马为什么灭亡?" sees `caused`/`influenced` edges
with a single curated narrative, never the fact that historians genuinely dispute
the causes. The truth layer is therefore *visible but not explorable*.

Inspection confirmed: 216 evidence claims, 0 with controversy_level medium/high —
no dissent data exists to anchor such relationships. Adding types without data
would create empty UI shells (a known anti-pattern in this codebase, cf. the
removed "扩展 敬请期待" tab).

## Decision

1. **Add two relationship types** to the frozen enum (18 → 20, additive only):
   - `disputes` — two entities hold opposing positions on the same matter
     (e.g. Caesar vs Senate; 秦始皇坑儒 contested). Semantic: 立场对立.
   - `reinterprets` — one entity/school offers a new interpretation of another's
     thesis or of a shared subject (e.g. Annales school reinterprets the French
     Revolution). Semantic: 解释演化.
2. **Mirror both ends**: backend `app/validation.py` RELATIONSHIP_TYPES,
   frontend `data/relationshipUtils.ts` RELATIONSHIP_TYPES, and the
   `scripts/freeze-check.mjs` guard `EXPECTED_RELATIONSHIP_TYPES = 18 → 20`.
3. **Anchor with real curated data** (PO-approved): hand-curate 6 genuine
   scholarly disputes/reinterpretations into `data/evidence_claims.json`
   (controversy_level medium/high + interpretation_note stating both sides)
   and matching `disputes`/`reinterprets` edges in the affected dataset
   files (≥ china_civilization_v1, roman_empire_exploration). Sources are
   real literature (sources.json), no AI fabrication.
4. **Display**: relationship rendering already buckets unknown types as
   `unknown`; the two new types flow through the existing UI vocabulary
   (RelationshipView / RelationshipContext / ThemesPanel) once enumerated —
   no new components, no new endpoints. Type-specific label styling follows
   the existing per-type color/token conventions.

## Consequences

- Positive: dissent becomes a first-class, navigable relationship — a user
  traversing "Rome's fall" can now step onto a `disputes` edge and see both
  camps with their evidence; truth layer shifts from annotated to explorable
  (P09 satisfied in the graph, not just the JSON).
- Negative: enum count increases (18→20); any consumer that assumed exactly 18
  must be updated (tests assert size 18 — updated to 20); curated data is
  hand-maintained and must stay historically honest.
- Risk mitigation: additive-only change (no type removed, no semantics
  rewritten); data curated from real literature with interpretation_note
  stating both positions; freeze-check guard updated in the same commit so
  the invariant never goes red.

## Consequences (enforcement)

- `validation.py` warning `RELATIONSHIP_UNKNOWN_TYPE` now accepts the new pair.
- `test_mapping.py` white-list mirror + `relationshipUtils.test.ts` size-18
  assertion updated to 20 in the same commit (no drift window).
- No schema change (relationship type is a string field), no runtime version
  bump, no new dependency, no API contract change.

## Related

- ADR-0013 (Article 0 / Mirror firewall — untouched), ADR-0018 (truth fields —
  this ADR makes them navigable), ADR-0015 (enum governance), Product_Constitution P09.
