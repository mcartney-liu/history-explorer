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

## 6. Audit Rules

- Three read-only gates: **Commit Audit → Release Audit → Retrospective**.
- Freeze compliance is machine-checked by `scripts/freeze-check.mjs`:
  forbidden tokens (after stripping comments/strings), forbidden deps,
  `FROZEN_SCOPE=frontend` path guard, and the
  `ENTITY_TYPES=8` / `RELATIONSHIP_TYPES=18` enum guard.
- **D-class (business-logic) freeze hits must be zero.** A/B/C-class findings
  are warnings only.
- QA holds an unoverridable FAIL right; a Lead may decide whether a failure
  blocks flow, but never re-judge a FAIL as PASS.

## 7. Freeze Red Lines (M3.5-000, summary)

| Allowed | Forbidden |
|---------|-----------|
| Frontend changes | Backend / API / schema changes |
| Existing API fields | New AI / LLM / RAG runtime |
| Deterministic rules | Graph DB (Neo4j) / Redis |
| Current TimeValue model | Recommendation / ranking / similarity / confidence inference |
| Additive data (seam files) | New runtime dependencies |

To change any red line, the Product Owner must revise M3.5-000 explicitly.

## 8. Local Pre-Push Checklist

```bash
# on feature branch, after commit
node scripts/freeze-check.mjs            # expect PASSED
cd frontend && npm test && npm run build # expect 220 passed / 0 errors
cd ../backend && python -m pytest -q     # expect green
```

## 9. References

- `TEAM_OPERATING_SPEC_v1.2.md` — permanent team/role/decision spec.
- `.github/workflows/ci.yml` — CI definition.
- `scripts/freeze-check.mjs` — freeze guard.
- `CHANGELOG.md` — per-release notes (single source of truth = `package.json`).
