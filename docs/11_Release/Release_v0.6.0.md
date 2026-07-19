# History Explorer v0.6.0

**Version:** 0.6.0
**Tag:** v0.6.0
**Branch:** `master` (merged from `feature/m5-d-historical-meaning-layer`)
**Date:** 2026-07-19
**Milestone:** M5-D — Historical Meaning Layer

---

## Summary

v0.6.0 completes the **M5-D Historical Meaning Layer** milestone: a deterministic, rule-based layer that explains *why* a connection exists and *what it meant historically*, derived purely from the already-present relationship data (`type` + `direction`) via fixed templates — with no AI/LLM, no new dependencies, and no backend change. It deepens **User Journey Stage 4 (Deep Understanding)** while staying fully within the freeze envelope (explainable, not generative).

## What's New (M5-D, A–E)

- **A — Understanding rule engine** (`understandingRules.ts`): pure `filter`/`map`/`transform` + fixed templates with `{actor}`/`{target}`/`{type}` substitution, covering all 18 `RELATIONSHIP_TYPES` plus a guaranteed fallback. No scoring, ranking, similarity, or recommendation logic. Exposes `buildUnderstanding`, `buildUnderstandingsFromRelationships`, `buildUnderstandingsFromConnectionsExplained`.
- **B — InterpretationPanel enhancement**: optional `understandings?` prop appends a "Historical Meaning" block (meaning + perspective tag) after the existing M5-A interpretation list. When absent/empty, behavior is 100% unchanged. No `navigation.ts` import.
- **C — EntityPage wiring**: derives understandings from `entity.relationships` and passes them to InterpretationPanel.
- **D — Topic view wiring**: derives understandings from `result.connections_explained` + a local `global_id→name` map; no new API endpoint, no backend contract change.

## Freeze Compliance

- No change to `exploration_engine.py`, `validation.py`, `navigation.ts`, Knowledge Model, or backend core.
- No AI / LLM / Provider / Recommendation / score / similarity introduced.
- No new dependency (`package.json` / `requirements.txt` unchanged; only `version` / `APP_VERSION` bumped).
- Additive only; API & frontend remain backward compatible (`v1 == legacy`).

## Test & Build

- Frontend: `127 passed` (22 files), `vite build` 0 errors, `tsc --noEmit` 0 errors.
- Backend: `115 passed` (pytest, zero backend change).

## Upgrade Notes

No action required. The public API and frontend behavior are backward compatible. The "Historical Meaning" block appears automatically wherever relationship data is present.
