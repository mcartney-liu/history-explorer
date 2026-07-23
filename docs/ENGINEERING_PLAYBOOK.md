# Engineering Playbook

> History Explorer — proven product-engineering workflow.
> Captures the milestone lifecycle validated across M5–M8 and formalized in
> M8.6. New developers should be able to reproduce a release end-to-end using
> only this document + `TEAM_OPERATING_SPEC_v1.2.md`.

## 1. Principles

- **Release Approval is always the Product Owner's call.** A Lead may prepare
  and recommend a release; only the Product Owner authorizes merge + tag + push.
- **The freeze is real.** M3.5-000 Schema Freeze is active: frontend-only
  milestones, no AI / LLM / graph-DB / Redis / new dependency / backend schema
  change unless the Product Owner revises the freeze.
- **Additive, not redesign.** Features extend; they do not rewrite architecture.
- **Automated gates beat heroics.** CI (`.github/workflows/ci.yml`) + freeze
  guard (`scripts/freeze-check.mjs`) are the quality floor — not human memory.

## 2. Milestone Lifecycle (10 steps)

| # | Phase | Owner | Output | Gate |
|---|-------|-------|--------|------|
| 1 | Baseline Audit | Lead | Read-only repo + git state | clean tree confirmed |
| 2 | Design Freeze | Lead + Architect | Design Freeze Proposal (read-only) | Product Owner approval |
| 3 | Implementation | Role (on feature branch) | Code + tests | self-review |
| 4 | Test | Role | New/updated tests pass | regression green |
| 5 | Commit Audit | Release Engineer | Explicit stage + commit | D-class freeze hits = 0 |
| 6 | Release Audit | Release Engineer | Read-only pre-release check | READY FOR MERGE |
| 7 | Merge | Release Engineer | `--no-ff` merge to master | topology verified |
| 8 | Tag | Release Engineer | Annotated tag `vX.Y.Z` | points at merge commit |
| 9 | Remote Verification | Release Engineer | `push` + `git ls-remote` | remote matches local |
| 10 | Retrospective | Lead + EM + Architect | Retro report + next-milestone rec | STOP, await decision |

## 3. Branch Rules

- **Never commit directly to `master`.** Every milestone starts on
  `feature/<milestone>-<slug>`.
- Branch off the current `master` HEAD (the latest released tag).
- Keep the feature branch focused; one milestone per branch.
- After merge, the feature branch is retained (not deleted) until retro closes.

## 4. Commit Rules

- **Conventional commits**: `feat(scope): ...`, `fix(scope): ...`,
  `chore(scope): ...`, `docs(scope): ...`.
- **Explicit staging only** — never `git add .` / `git add -A`. List the
  approved files.
- No `amend` / `rebase` / `reset` after a shared commit; corrections are new
  commits.
- Commit messages state what changed and why, never "wip" / "fix".

## 5. Release Rules

- Merge strategy: **`git merge --no-ff`** (preserves milestone as a node).
- Tag: **annotated** (`git tag -a vX.Y.Z -m "..."`) pointing at the merge
  commit. `package.json` version is the single source of truth; the tag marks
  the release event.
- Remote: push master + the tag, then `git ls-remote origin` to verify the
  remote `refs/heads/master` and `refs/tags/vX.Y.Z` match the local merge SHA.
- **Credentials**: when behind the corporate Sangfor MITM proxy, push with
  `http.sslBackend=openssl -c http.sslVerify=false` and an inline
  `url.https://<user>:<token>@github.com/.insteadOf=...` — the token lives only
  in process memory, never on disk.
- Version bumps live in `package.json` + `CHANGELOG.md` + (Project Status)
  `README.md`, applied in the milestone that earns the bump.

## 6. Release Workflow Hardening

> Origin: M9-008. Derived from M9-006 (release-metadata desync after tag) and
> M9-007 (`.gitignore` overwrite during hygiene). This section hardens the
> *release workflow only*. It does **not** change the Version Policy
> (`RELEASE_VERSION_POLICY.md`), the freeze, the checkers
> (`scripts/freeze-check.mjs`, `scripts/release-consistency-check.mjs`), or the
> runtime. It adds three mandatory gates around the existing Release Rules (§5):
> **Pre-Commit**, **Pre-Tag**, **Post-Tag**.

### 6.1 Pre-Commit Release Gate

Run before any release commit is staged (after implementation + tests pass).

- **H1 — Working Tree Classification.** Run `git status --short` and classify
  every entry:
  - `M` (modified) entries **must** fall within the approved scope. Anything
    outside scope → **STOP**.
  - `??` (untracked) entries **must** be classified into one of three buckets:
    - **Tracked Changes** — a legitimate release artifact; add it to version
      control explicitly.
    - **Temporary Files** — delete, or ignore through `.gitignore` (append
      only, never overwrite existing rules).
    - **Unknown Files** — **STOP**, await Product Owner decision.
- **H2 — Gitignore Integrity.** Confirm `.gitignore`:
  - exists;
  - retains **all** previously-existing ignore rules;
  - new rules are **appended only**, never a wholesale replacement.
  - Principle: *Existing ignore rules may only be extended, never replaced
    wholesale.*
- **H3 (Pre-Commit phase) — Metadata Synchronization.** Confirm Scope, Freeze,
  Working Tree, and Untracked Classification are all validated and still hold
  before staging.

> These gates complement — they do not replace — the read-only Audit Rules (§7).

### 6.2 Pre-Tag Release Gate

Run after `--no-ff` merge to `master` is complete, before creating the
annotated tag.

- **H3 (Pre-Tag phase) — Metadata Synchronization.** Confirm:
  - `CHANGELOG.md`, `README.md`, `PROJECT_CONTEXT.md` are release-ready;
  - Project Release Metadata (per `RELEASE_VERSION_POLICY.md`) is fully
    consistent across all artifacts.
  - Scope / Freeze / Working Tree / Untracked Classification validated at
    Pre-Commit must still hold.

### 6.3 Post-Tag Release Gate

Run after the annotated tag is created, before `push`.

- **Push Gate (Release Workflow rule).** `push` is forbidden until **both**
  pass:
  - **Freeze Check PASS** — `node scripts/freeze-check.mjs`; and
  - **Release Consistency Check R1–R7 PASS** — `node scripts/release-consistency-check.mjs`.
  If either fails → **STOP**, do not push; await remediation. This gate only
  *adds* a workflow requirement; it does not modify the checkers or the Version
  Policy.
- **H3 (Post-Tag phase) — Metadata Synchronization.** Re-run
  `scripts/release-consistency-check.mjs`. Requirement: **R1–R7 all PASS**
  (this is the consistency half of the Push Gate above). If it fails →
  **STOP**, do not push.
- **H4 — Tag Verification.** Never infer tag existence from a command's exit
  status alone — exit-code behavior varies across shells (Git Bash, PowerShell,
  Linux). Always verify by:
  - inspecting the returned tag list (e.g. `git tag --list "vM*"`), **or**
  - explicit object verification (e.g. `git rev-parse -q --verify <tag>` /
    `git cat-file -t <tag>`).
  - Proceed to push only when the tag is positively confirmed present, the Push
    Gate above is satisfied, and the tag points at the intended commit.

### 6.4 Hardening Boundaries

This section is **workflow-only**. It must **not**:
- modify the Release Model or Version Strategy;
- modify the Runtime Strategy;
- modify the Freeze Strategy;
- modify `scripts/freeze-check.mjs` or `scripts/release-consistency-check.mjs`.

It only *adds* gates around the existing process. The semantics of the existing
Release Rules (§5) are unchanged.

## 7. Audit Rules

- Three read-only gates: **Commit Audit → Release Audit → Retrospective**.
- Freeze compliance is machine-checked by `scripts/freeze-check.mjs`:
  forbidden tokens (after stripping comments/strings), forbidden deps,
  `FROZEN_SCOPE=frontend` path guard, and the
  `ENTITY_TYPES=8` / `RELATIONSHIP_TYPES=18` enum guard.
- **D-class (business-logic) freeze hits must be zero.** A/B/C-class findings
  are warnings only.
- QA holds an unoverridable FAIL right; a Lead may decide whether a failure
  blocks flow, but never re-judge a FAIL as PASS.

## 8. Freeze Red Lines (M3.5-000, summary)

| Allowed | Forbidden |
|---------|-----------|
| Frontend changes | Backend / API / schema changes |
| Existing API fields | New AI / LLM / RAG runtime |
| Deterministic rules | Graph DB (Neo4j) / Redis |
| Current TimeValue model | Recommendation / ranking / similarity / confidence inference |
| Additive data (seam files) | New runtime dependencies |

To change any red line, the Product Owner must revise M3.5-000 explicitly.

## 9. Local Pre-Push Checklist

```bash
# on feature branch, after commit
node scripts/freeze-check.mjs            # expect PASSED
cd frontend && npm test && npm run build # expect 220 passed / 0 errors
cd ../backend && python -m pytest -q     # expect green
```

## 10. References

- `TEAM_OPERATING_SPEC_v1.2.md` — permanent team/role/decision spec.
- `.github/workflows/ci.yml` — CI definition.
- `scripts/freeze-check.mjs` — freeze guard.
- `CHANGELOG.md` — per-release notes (single source of truth = `package.json`).
