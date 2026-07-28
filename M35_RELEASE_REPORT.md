# M35 Release Report — User Exploration Experience MVP (vM35.1)

**Release Date:** 2026-07-27
**Release Tag:** `vM35.1` (annotated, object `6ccf36e` → commit `651b284`)
**Runtime Version:** `v0.13.0` (unchanged — non-runtime release)
**Project Release:** `vM35.1` (M35)
**PO Decision:** 翔哥 (via ChatGPT-derived instruction set)
**Branch:** `master` (no feature branch — per PO adjustment)

---

## 1. Release Flow Executed

```
C1 commit  → C2 commit → C3 commit → annotated tag vM35.1 → consistency 7/7
          → push master → push tag → ls-remote verify → RELEASE REPORT
```

| Step | Action | Result |
|------|--------|--------|
| C1 | `feat(frontend): M35 User Exploration Experience MVP` | commit `ee5add7` |
| C2 | `docs(release): sync vM35.1 documentation` | commit `da362e7` |
| C3 | `fix(ci,data,test): M35 Release Quality Corrections` | commit `651b284` |
| T1 | annotated tag `vM35.1` (real timestamp) | object `6ccf36e` |
| V1 | `release-consistency-check.mjs` | **7/7 PASS**, EXIT 0 |
| V2 | `git push origin master` | `35e800a..651b284` |
| V3 | `git push origin vM35.1` | `[new tag] vM35.1 -> vM35.1` |
| V4 | `git ls-remote` verify | master + tag match local ✅ |

---

## 2. Commits (source: `git show --stat`)

### C1 — `ee5add7` · `feat(frontend): M35 User Exploration Experience MVP`
16 files changed, 838 insertions(+)
- `frontend/src/App.tsx` (+29)
- `frontend/src/components/EntityPage.tsx` (+9)
- `frontend/src/components/FeedbackWidget.tsx` (+90) + `.test.tsx` (+20)
- `frontend/src/components/exploration/StorySection.tsx` (+28) + `.test.tsx` (+31)
- `frontend/src/components/exploration/WhyImportantPanel.tsx` (+27) + `.test.tsx` (+29)
- `frontend/src/components/journey/JourneyPanel.tsx` (+67) + `.test.tsx` (+43)
- `frontend/src/data/narrative.ts` (+53) + `.test.ts` (+84)
- `frontend/src/lib/journey.ts` (+67) + `.test.ts` (+81)
- `frontend/src/pages/DiscoverPage.tsx` (+121) + `.test.tsx` (+59)

### C2 — `da362e7` · `docs(release): sync vM35.1 documentation`
4 files changed, 128 insertions(+), 2 deletions(-)
- `README.md` (+1) — adds `vM35.1` Project Release entry
- `PROJECT_CONTEXT.md` (+4/−2) — §5 rewritten to vM35.1
- `CHANGELOG.md` (+14) — new `[vM35.1]` top entry + Quality Corrections section
- `M35_PRE_RELEASE_PRODUCT_ACCEPTANCE_REPORT.md` (+111) — §5 M35 Release Quality Corrections

### C3 — `651b284` · `fix(ci,data,test): M35 Release Quality Corrections`
4 files changed, 34 insertions(+), 4 deletions(-)
- `.github/workflows/ci.yml` (+2/−2) — frontend CI `npm install` (lockfile gitignored)
- `backend/tests/test_search_index.py` (+1/−1) — assert Augustus `location == "Roman Italy"`
- `data/examples/roman_empire_example.json` (−1) — drop duplicate `Byzantium` alias on `civ-byzantine`
- `scripts/freeze-check.mjs` (+31) — register `backend/tests/test_search_index.py` in SCOPE_ALLOWLIST (PO single-file gate)

---

## 3. Verification Matrix (real output)

| Gate | Command | Result |
|------|---------|--------|
| Freeze Guard | `node scripts/freeze-check.mjs` | **EXIT 0** — `[M3.5 Freeze Guard] PASSED — no D-class violations` |
| Backend tests | `pytest tests/ -q` | **219 passed** |
| Frontend tests | `vitest run` | **569 passed** (62 files) — +29 vs vM34.1 |
| Consistency | `release-consistency-check.mjs` | **7/7 PASS**, EXIT 0 (Runtime `0.13.0` / Project `vM35.1`) |
| Governance self-test | `node scripts/freeze-check.test.mjs` | **9/9 passed** (TAP `# pass 9, # fail 0`) |

---

## 4. M35 Release Quality Corrections (PO-approved)

| ID | Area | Fix | Freeze impact |
|----|------|-----|---------------|
| A1-c | CI (`.github/workflows/ci.yml`) | frontend job `npm ci` → `npm install`; cache path pinned to `frontend/package.json` | None — `.github/` skipped by scope guard |
| B1 | Data (`data/examples/roman_empire_example.json`) | removed duplicate `"Byzantium"` alias from `civ-byzantine` (keeps `["Eastern Roman Empire","Romaion"]`); `loc-constantinople` retains `"Byzantium"` | None — `data/` skipped by scope guard |
| RI | Test + gate (`backend/tests/test_search_index.py`, `scripts/freeze-check.mjs`) | assert Augustus `location == "Roman Italy"`; test file registered in SCOPE_ALLOWLIST via PO single-file Freeze Revision Gate | None — test-only + allowlist registration |

---

## 5. M35 Release Invariants (preserved, verified)

1. **No new feature** added (M35 feature landed in C1; C3 is correction-only)
2. **No `backend/app` code** changed (C3 touches test + freeze-check + data + CI only)
3. **No schema** changed
4. **ENTITY_TYPES unchanged** (8)
5. **RELATIONSHIP_TYPES unchanged** (18)
6. **No new dependency** introduced (frontend `package.json` unchanged; CI uses existing `npm install`)
7. **Runtime version unchanged** (`v0.13.0`)

---

## 6. Remote Verification (`git ls-remote`)

```
651b2841d1ff739c6adcb5527a5aa2c167d12a2b   refs/heads/master
6ccf36eb302486536494dc317f3fca89e5a87443   refs/tags/vM35.1
```

Local matches:
- `master` HEAD = `651b284` ✅
- tag `vM35.1` object = `6ccf36e` ✅

---

## 7. Status

**✅ PUBLISHED** — `vM35.1` is live on `origin`. Local and remote are consistent.

### Deferred (NOT included — per PO instruction)
- **M35.1 Narrative Consistency Patch** (U1/U2 narrative key consistency) — remains **frozen**, not implemented in this release.

### Next
- Await PO decision on M35.1 Narrative Consistency Patch as a separate release.
