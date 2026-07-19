# History Explorer v0.5.0

**Version:** 0.5.0
**Tag:** v0.5.0
**Branch:** `master` (merged from `feature/m5-c-cross-topic-comparison`)
**Date:** 2026-07-19
**Milestone:** M5-C — Cross-Topic Comparative Synthesis

---

## Summary

v0.5.0 completes the **M5-C Cross-Topic Comparative Synthesis** milestone: a comparison surface that lets a user see *which* other topics are worth comparing against the current one and *which* entities bridge into them — then jump straight across via the single existing navigation entry. It adds a *Topic Comparison Panel* (driven by the already-present `cross_topic_related` data) and a small pure helper module, all without introducing AI/LLM, new dependencies, or breaking the frozen schema or public API.

## What's New (M5-C, C-1 + C-3)

- **C-1 Topic Comparison Panel** — on a Topic view (after *Continue Exploring*), surfaces the de-duplicated list of comparison-target topics drawn from `cross_topic_related`, and — once a target is selected — the bridge entities that belong to that target. Clicking a bridge node routes through `openEntity` → `navigateTo`; clicking a target chip routes through `navigateTo`. No re-sorting, no recommender, no score — existing backend data is presented verbatim.
- **C-3 comparison helper** (`comparison.ts`) — three pure functions, filter/map/transform only:
  - `pickComparisonTargets(crossTopicRelated)` — `Set` de-dup preserving order.
  - `deriveBridgedEntities(entities, targetTopic)` — `.filter(e => e.topic === targetTopic)`.
  - `extractTopicFromGlobalId(globalId)` — `indexOf(':')` + `slice`.
- **C-2** side-by-side theme synthesis is **deferred** to a Future Extension (any similarity/recommendation would cross the freeze red line).

## Freeze Compliance

- No change to `exploration_engine.py`, `navigation.ts`, Knowledge Model, or backend core.
- No AI / LLM / Provider / Recommendation / score / similarity introduced.
- No new dependency (`package.json` / `requirements.txt` unchanged; only `version` / `APP_VERSION` bumped).
- Additive only; API & frontend remain backward compatible (`v1 == legacy`).

## Test & Build

- Frontend: `116 passed` (21 files), `vite build` 0 errors, `tsc --noEmit` 0 errors.
- Backend: `115 passed` (pytest, zero backend change).

## Upgrade Notes

- Version bumped in `frontend/package.json` and `backend/app/config.py` (default `APP_VERSION`).
- No schema or API contract changes; safe in-place upgrade from v0.4.0.

## Acknowledgements

M5-C builds directly on the cross-topic data laid down in M4-002/M4-003 and the deterministic engine from M3.5: M4 made the connections *exist*; M5-C makes them *comparable*.
