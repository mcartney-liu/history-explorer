# L6a — Architecture

Current implementation architecture and the freeze baseline.

- **Current Architecture Baseline (single entry):** `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`. Origin: `docs/M3.5-000_Schema_Freeze_Review.md` (Schema Freeze).
- **Decisions (ADRs):** live in `docs/15_DECISIONS/` — use `docs/15_DECISIONS/ADR_TEMPLATE.md` for any architecture / feature / technology decision (including freeze revisions).
- **Technical architecture (current):** deterministic, in-memory Knowledge Core. See `PROJECT_CONTEXT.md` §5 (Current State) and the milestone reports under `docs/`. A dedicated `TECHNICAL_ARCHITECTURE.md` is a future addition.
- The freeze is a **baseline, not permanent**; it evolves via the Freeze Revision Gate (ADR + baseline revision). Code guard: `scripts/freeze-check.mjs` (CI).
