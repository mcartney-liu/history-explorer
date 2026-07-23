# Release Version Policy

- **Status:** Active (adopted in M9-006)
- **Owner:** Product Owner — Release authority per `docs/TEAM_OPERATING_SPEC_v1.2.md` §D8
- **Scope:** Every release-version artifact in this repository
- **Enforced by:** `scripts/release-consistency-check.mjs` (CI gate)

---

## 1. Why this policy exists

History Explorer uses a **dual-track versioning** model. Two independent version streams
intentionally coexist:

- **Runtime Version** — the version of the runnable code (frontend + backend).
- **Project Release Version** — the version of a project / data milestone (a tagged release
  event that may or may not change runtime code).

Before M9-006 these two streams leaked into each other (e.g. `package.json` lagging behind the
actual runtime, `README.md` / `PROJECT_CONTEXT.md` disagreeing on the latest version,
`CHANGELOG.md` missing project releases). This policy assigns a **single responsibility** to each
artifact and **forbids mixing** the two streams.

---

## 2. The seven artifacts and their single responsibility

| # | Artifact | Responsibility | Format | Must contain |
|---|----------|----------------|--------|--------------|
| 1 | `frontend/package.json` → `version` | **Runtime Version ONLY** | semver `X.Y.Z` | the runtime code version; nothing else |
| 2 | Git Tag — runtime | Runtime release event marker | `vX.Y.Z` (annotated) | points at the merge commit of a runtime release |
| 3 | Git Tag — project | Project / data release event marker | `vM9-XXX` (annotated) | points at the merge commit of a project release |
| 4 | `README.md` → Project Status | User-facing latest status | both shown side by side | Latest Runtime Version **and** Latest Project Release Version |
| 5 | `PROJECT_CONTEXT.md` → §5 Current State | Internal "current reality" | references both | latest Project Release Version + live data counts |
| 6 | `CHANGELOG.md` | Chronological release notes | dated, typed entries | an entry per runtime release **and** per project release |
| 7 | `scripts/release-consistency-check.mjs` | CI guard | `EXIT 0` = consistent | verifies artifacts 1–6 agree |

---

## 3. "不得混用" (Do not mix) — formal rules

1. **`package.json.version` is Runtime Version and nothing else.** It SHALL NEVER be set to a
   Project Release Version (`vM9-XXX`). Bumping it always means "runtime code changed".
2. **Runtime releases use semver tags (`vX.Y.Z`); project releases use `vM9-XXX` tags.** The two
   tag namespaces are distinct and MUST NOT be conflated. A project release that does not change
   runtime code does **not** bump `package.json.version` and does **not** require a semver tag.
3. **`README.md` MUST show both streams.** The Project Status section displays
   *Latest Runtime Version* and *Latest Project Release Version* as two distinct values. Hiding
   one behind the other is non-compliant.
4. **`PROJECT_CONTEXT.md` §5 MUST reference the latest Project Release Version** and the live data
   counts (topics / entities / relations / cross-topic edges / timelines / warnings) from
   `validation.py` / `GET /health`. It is the internal mirror of reality, not a summary.
5. **`CHANGELOG.md` MUST record both streams.** A `[X.Y.Z]` entry is a runtime release; a
   `[vM9-XXX]` entry is a project release. Each entry states which stream it is. A project release
   entry MUST be marked *Non-runtime release* when no runtime code changed.
6. **No artifact is the sole source of truth for both streams.** Each artifact has exactly one job
   from the table above. Disagreement between artifacts is a bug caught by the Consistency Checker
   (rule 7).
7. **The Consistency Checker is authoritative.** `scripts/release-consistency-check.mjs` is the
   single automated guard. It exits non-zero when any of rules 1–6 are violated. CI runs it on
   every release.

---

## 4. Canonical current state (established by M9-006)

| Artifact | Value |
|----------|-------|
| Runtime Version (`frontend/package.json`) | `0.13.0` |
| Latest Project Release (Git tag) | `vM9-004.2` |
| Data (from `validation.py` / `GET /health`) | 8 topics / 99 entities / 154 relations / 45 cross-topic edges / 15 timelines / 0 warnings |

---

## 5. How to cut a release (reminder)

Follow `docs/ENGINEERING_PLAYBOOK.md`. In short: feature branch → explicit stage →
`--no-ff` merge to `master` → annotated tag (`vX.Y.Z` for runtime, `vM9-XXX` for project) →
push + `ls-remote` verify. Release approval is always the Product Owner's call
(`docs/TEAM_OPERATING_SPEC_v1.2.md` §D8).

---

## 6. Drift remediation

If the Consistency Checker fails, fix the *wrong* artifact against the table above — do **not**
"align everything to one number". The sources of truth are:

- Data counts → `validation.py` / `GET /health`
- Runtime Version → `frontend/package.json`
- Latest Project Release → the Git tag `vM9-XXX`

The Consistency Checker derives the expected Runtime Version from `package.json` and the expected
Project Release from the latest `vM*` Git tag, then verifies `README.md`, `PROJECT_CONTEXT.md`, and
`CHANGELOG.md` all reference both.
