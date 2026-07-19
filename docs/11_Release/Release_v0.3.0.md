# History Explorer v0.3.0

**Version:** 0.3.0
**Tag:** v0.3.0
**Branch:** `master` (merged from `feature/m5-a1-topic-catalog`)
**Date:** 2026-07-19
**Milestone:** M5-A — Discovery & Onboarding

---

## Summary

v0.3.0 completes the **M5-A Discovery & Onboarding** milestone: the entry journey a first-time user takes from landing to a connected, interpretable exploration session. It adds the topic catalog, a curated landing experience, featured "start here" topics, first-exploration and entity-exploration guides, and a rule-based interpretation layer — all without introducing AI/LLM, new dependencies, or breaking the frozen schema.

## What's New (M5-A, A-1 → A-6)

- **A-1 Topic Catalog API** — `GET /topics` returning `{topic,title,summary}`, mounted under both `/api/v1` and the legacy route (v1==legacy).
- **A-2 Landing Catalog** — curated landing page topic grid with loading/empty/error states, single navigation path.
- **A-3 Featured Topics** — editorial "Start here" strip (4 real topic slugs) derived as a filtered view of the catalog.
- **A-4 First Exploration Guide** — presentational nudge on the topic page with 3 real, grounded starters; session-only dismissible.
- **A-5 Entity Exploration Guide** — entity-level exploration starters in a frozen-safe dedicated component.
- **A-6 Interpretation Layer** — rule-based "why these connections are worth exploring" panel rendering the backend's verbatim `explanation`; ordered after Connections Explained (WHAT → WHY → HOW).

## Freeze Compliance

- No change to `exploration_engine.py`, `navigation.ts`, Knowledge Model, or backend core.
- No AI / LLM / Provider / Prompt introduced.
- No new dependency (`package.json` / `requirements.txt` unchanged).
- Additive only; API & frontend remain backward compatible.

## Test & Build

- Frontend: `97 passed` (17 files), `vite build` 0 errors.
- Backend: `115 passed` (pytest).

## Upgrade Notes

- Version bumped in `frontend/package.json` and `backend/app/config.py` (default `APP_VERSION`).
- No schema or API contract changes; safe in-place upgrade from v0.2.0.
