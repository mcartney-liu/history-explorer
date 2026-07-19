# History Explorer v0.4.0

**Version:** 0.4.0
**Tag:** v0.4.0
**Branch:** `master` (merged from `feature/m5-b-continuous-discovery`)
**Date:** 2026-07-19
**Milestone:** M5-B — Continuous Discovery

---

## Summary

v0.4.0 completes the **M5-B Continuous Discovery** milestone: the "keep exploring" layer that turns a single exploration session into a continuous, self-directed journey. It adds a *Continue Exploring* action area (re-presenting the engine's already-ranked next steps, seen-aware), an *Exploration Trail* (the full footprint of where you've been, jump-back to continue), and a dead-end fallback to cross-topic / related topics — all without introducing AI/LLM, new dependencies, or breaking the frozen schema or public API.

## What's New (M5-B, B-1 → B-3)

- **B-1 Continue Exploring panel** — after a Topic or Entity view, surfaces the engine's top-N ranked `connections_explained` as concrete next-step actions. Already-visited nodes are softened (not hidden, not reordered) using the local `recent` store. No re-sorting, no recommender, no score — the engine's order is preserved verbatim.
- **B-2 Exploration Trail** — renders the full exploration footprint from the in-app `history`/`cursor` (distinct from the cursor-only breadcrumb). Clicking any past step reuses the existing `goTo` to jump back and continue from there.
- **B-3 Dead-end fallback** — when direct connections are sparse, the panel falls back to `cross_topic_related` / `related_topics` so discovery never dead-ends.

## Freeze Compliance

- No change to `exploration_engine.py`, `navigation.ts`, Knowledge Model, or backend core.
- No AI / LLM / Provider / Recommendation / score introduced.
- No new dependency (`package.json` / `requirements.txt` unchanged).
- Additive only; API & frontend remain backward compatible (`v1 == legacy`).

## Test & Build

- Frontend: `107 passed` (19 files), `vite build` 0 errors, `tsc --noEmit` 0 errors.
- Backend: `115 passed` (pytest, zero backend change).

## Upgrade Notes

- Version bumped in `frontend/package.json` and `backend/app/config.py` (default `APP_VERSION`).
- No schema or API contract changes; safe in-place upgrade from v0.3.0.

## Acknowledgements

M5-B is the natural continuation of M5-A (Discovery & Onboarding): M5-A gets a first-time user *in*; M5-B keeps them *going*.
