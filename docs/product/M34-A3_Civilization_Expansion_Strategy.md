# M34-A3 — Civilization Expansion Strategy (Product Strategy, docs-only)

> **Status:** Draft for PO review (M34 Implementation Phase 3, A3 deliverable).
> **Nature:** Strategy / planning document only. **No code, no schema, no data, no
> dependency change.** This document does not by itself modify any frozen artifact.
> **Freeze posture:** Fully within the M34 Scope Freeze. It proposes expansion of
> *content* (datasets / topics) using the *already-frozen* vocabulary — it does not
> propose new entity types, new relationship types, new endpoints, or new
> dependencies. Any actual dataset addition is a separate, gated data milestone
> (see §6) that must pass `scripts/freeze-check.mjs` and the data-governance gates.

---

## 1. Purpose

M34-A1 (Exploration UX hardening) and M34-A2 (Knowledge Graph Visualization MVP)
shipped the *presentation* layer for a civilization knowledge graph. A2 draws, with
self-written SVG and **zero new dependencies**, the current topic's **main entity +
its direct neighbours** (hard cap ≤30 nodes / ≤60 edges, per `M34-ADR-001`).

What the product still lacks is a **content-expansion strategy**: a repeatable,
freeze-safe plan for growing the number of civilizations / topics the explorer can
cover, so that the graph view and the existing panel views become progressively
richer without ever breaching the frozen contract.

This document answers three questions for the PO:

1. What is the **current coverage** and where are the gaps?
2. What is the **frozen vocabulary** any new civilization must be expressed in?
3. What is the **repeatable process** to add a civilization safely, and what is the
   suggested **sequencing**?

---

## 2. Current Coverage (baseline evidence)

The explorer today ships **8 example datasets** under `data/examples/`:

| Dataset file | Civilizational focus |
|---|---|
| `ancient_india_example.json` | Ancient India (Maurya/Gupta era) |
| `roman_empire_example.json` | Roman Empire |
| `greek_philosophy_example.json` | Greek philosophy (pre-Hellenistic) |
| `hellenistic_world_example.json` | Hellenistic successor kingdoms |
| `persian_empire_example.json` | Achaemenid Persian Empire |
| `egypt_technology_religion_example.json` | Ancient Egypt (technology + religion lens) |
| `early_christianity_example.json` | Early Christianity (Late Antique) |
| `silk_road_example.json` | Silk Road (trans-civilizational network) |

Observations:

- Coverage is **Mediterranean + South-Asian centric**. Strong on Greco-Roman,
  Persian, Indian, Egyptian; one trans-Eurasian network (Silk Road).
- **Under-covered / absent regions** (candidates for expansion, §5):
  - East Asia: Han/Chen Chinese, Japanese (Asuka/Nara), Korean.
  - Mesoamerica: Maya, Aztec, Teotihuacan.
  - Andes: Inca, Moche, Tiwanaku.
  - Sub-Saharan Africa: Mali/Ghana, Great Zimbabwe, Axum.
  - Near East / Levant: Phoenician, Babylonian, Assyrian, Hittite.
  - Steppe / Central Asia: Xiongnu, Sogdian, Mongol.
  - Insular / Oceania: Polynesian navigation, Maori.
  - Later periods: Islamic Caliphates, Medieval Europe, Song China.
- The `silk_road` and `hellenistic_world` datasets already demonstrate *cross-topic
  bridging* (`exploration.cross_topic_related`), which is the mechanism A2's graph
  can later extend beyond a single topic's direct neighbours (deferred; see §7).

---

## 3. The Frozen Vocabulary (hard constraint)

Every new civilization MUST be modeled **entirely** within the two frozen sets.
There is **no Freeze Revision Gate escape hatch for content** — adding a civilization
is a *data* operation, not a *schema* operation.

### 3.1 Entity types — exactly 8 (`backend/app/validation.py`, `ENTITY_TYPES`)

```
Event · Person · Civilization · Location · Time Period · Technology · Religion · Idea
```

A new dataset may use any subset of these 8. It may **not** introduce a 9th type
(e.g. "Artifact", "Text", "Dynasty"). Where a modeler wants such a concept, it must
be folded into the nearest existing type (e.g. a dynasty → `Civilization` or
`Time Period`; a text → `Idea` or `Religion` depending on intent).

### 3.2 Relationship types — exactly 18 (`RELATIONSHIP_TYPES`)

```
caused · influenced · participated_in · located_at · related_to · before · after
contemporary_with · part_of · ruled · traded_with · invented · discovered
practiced · spoke · inherited · conquered · spread
```

A new dataset may use any subset. It may **not** introduce a 19th type (e.g.
"borrowed", "allied"). Indistinguishable nuances must collapse onto the nearest of
the 18 (e.g. "allied_with" → `traded_with` or `related_to`; "conquered →
`conquered` already exists).

### 3.3 Why this is a feature, not a limitation

The freeze is what makes the graph view (A2) and every downstream panel *stable*:
the 8 type colors and 18 edge labels are a **closed palette**. A civilization
expansion that respects the vocabulary is automatically renderable, searchable,
clickable, and provenance-tracked with **zero frontend/backend change**. This is the
core economic argument for the freeze: content scales, code does not.

---

## 4. Content Source & Provenance Standard (non-negotiable)

Expansion must inherit the **Gold Dataset standard** established by M33 A-1.5
(Gold Governance Migration) and the source-registry / evidence-claim model from
M26.1 / M27.1. Specifically:

- Every entity relationship in a new dataset must be backed by an **evidence claim**
  (`data/evidence_claims.json`) referencing a registered **source**
  (`data/sources.json`) with a declared **tier** (primary / secondary / tertiary).
- The `UNSET` source placeholder is a migration *in-progress* marker, not a shipping
  state. No new dataset may ship with `UNSET` as a permanent source.
- Provenance projection (M29.1 / M30-A) and the `ProvenancePanel` already surface
  this; new civilizations automatically inherit that UI.
- New relationships must satisfy `scripts/freeze-check.mjs` (entity/relationship
  enumeration guards) and the data validation gate (`backend/app/validation.py`)
  with **zero errors** (warnings tolerated but must trend to zero before release).

---

## 5. Suggested Expansion Candidates (prioritized, illustrative)

Priority is a *product* recommendation; the PO decides. The ranking heuristic:
**(a)** fill the largest geographic/chronological gaps, **(b)** maximize cross-topic
bridge potential with existing datasets, **(c)** low research-risk (well-attested,
single authoritative survey exists).

| Tier | Candidate | Rationale | Natural bridges to existing |
|---|---|---|---|
| P1 | **Han / Imperial China** | Largest East-Asian gap; extremely well-documented; rich tech/religion/idea graph | silk_road, persian_empire |
| P1 | **Maya civilization** | Flagship Mesoamerican case; self-contained; strong Event/Person/Location graph | silk_road (indirect via Eurasia) |
| P2 | **Mali / Ghana (West Africa)** | Closes Sub-Saharan gap; gold-trade bridge to Mediterranean | roman_empire, silk_road |
| P2 | **Phoenician / Carthaginian** | Maritime trade network; natural `traded_with` / `spread` demo | roman_empire, persian_empire, egypt |
| P2 | **Islamic Caliphates (Umayyad–Abbasid)** | Bridges Late Antiquity → Medieval; strong `inherited`/`spread` story | early_christianity, roman_empire, persian_empire |
| P3 | **Inca (Andes)** | Second Andean pillar | maya (indirect) |
| P3 | **Japanese (Asuka–Nara)** | East-Asia complement to Han | han_china (deferred) |
| P3 | **Babylonian / Assyrian** | Deep Near-East root; `before`/`conquered` demo | persian_empire, egypt |

This list is **illustrative**, not a commitment. The process in §6 is what matters;
the candidate set can be revised by the PO at any time without touching code.

---

## 6. Repeatable Addition Process (the "civilization intake" pipeline)

Each new civilization is a **separate, small, gated data milestone** — never a bulk
import. This keeps every change auditable and freeze-safe.

```
Phase 0  Propose        — one-line scope + candidate source survey. PO ok.
Phase 1  Author dataset — new data/examples/<topic>_example.json, ENTIRELY within
                           the 8 entity + 18 relationship vocabulary.
Phase 2  Source + claim — register source(s) in data/sources.json (with tier);
                           add evidence_claims.json entries backing each relationship.
Phase 3  Validate       — backend validation.py: 0 errors. freeze-check.mjs: PASS.
Phase 4  Cross-topic    — optionally add cross_topic_related to existing datasets
                           for bridge edges (reuses existing field; no schema change).
Phase 5  Review         — data-governance review (tier assignment, citation quality).
Phase 6  Commit + tag   — additive commit on feature branch; PO-approved release
                           (ff-only merge, annotated tag per RELEASE_VERSION_POLICY).
Phase 7  Verify         — consistency check 7/7; graph view (A2) renders the new
                           topic's main entity + direct neighbours automatically.
```

Key properties:

- **Additive only.** No existing dataset is rewritten to fit a new one; bridges are
  *additional* edges. The "改动只增不改" rule holds.
- **No code change.** A2's `GraphViewPanel` reads `exploration.main_entity` +
  `exploration.related_entities` — present in every topic response. A new civilization
  is visible in the graph the moment its dataset is valid.
- **Bounded blast radius.** One civilization per milestone ⇒ a regression is one
  revert, not a multi-civilization rollback.

---

## 7. What Expansion Does NOT Change (guardrails)

To keep the freeze intact, the following are **explicitly out of scope** for content
expansion and remain deferred to separately-gated milestones:

1. **Graph scope cap (A2 MVP).** Expansion adds *more topics*, not *bigger graphs per
   topic*. The ≤30 node / ≤60 edge cap and "main + direct neighbours" scope stay. A
   full cross-topic graph view (bridges rendered as a second ring / cluster) is a
   future A2.1 decision, not part of A3.
2. **No new entity/relationship types.** §3 is closed. Ever, without a Freeze
   Revision Gate (ADR + architecture review + PO approval).
3. **No new dependency.** A2's self-drawn SVG stays. No graph library enters because
   we have "more" data.
4. **No backend / schema change.** `data/*.json` grows; `backend/app/` does not.
5. **Runtime stays `0.13.0`.** Content is data; it does not warrant a runtime bump.
6. **No AI ingestion pipeline.** Authoring remains human-curated Gold standard
   (M33 A-1.5). An AI-assisted ingestion helper is a deferred, separately-gated
   capability (would itself require its own ADR re: the AI/LLM red line).

---

## 8. Success Metrics (for the PO to track)

- **Coverage:** number of shipped civilizations (target: +3 in the next content
  cycle, drawn from P1/P2 of §5).
- **Bridge density:** average `cross_topic_related` edges per topic (measuring how
  interconnected the graph is becoming).
- **Provenance quality:** % of relationships with a non-`UNSET`, tiered source
  (target: 100% before any release).
- **Zero regression:** `freeze-check.mjs` PASS + `validation.py` 0 errors on every
  added dataset; vitest / pytest green.

---

## 9. Open Questions for PO

1. Should P1 be **Han China + Maya** (two flagship, geographically opposed cases) or
   **Han China + Mali** (closes two different gaps)?
2. Do we want a **hard cap on total topics** per release for QA bandwidth, or a
   rolling intake?
3. Is the cross-topic bridge *visualization* (A2.1) a near-term priority, or do we
   stay strictly per-topic for now?

---

## 10. Relationship to other M34 artifacts

- **M34-ADR-001** (A1+A2 implementation) — this strategy consumes the A2 graph view;
  it does not modify it.
- **M34 Proposal (Phase 0) / Design Freeze (Phase 1) / Implementation Plan (Phase 2)**
  — upstream context.
- **M33 A-1.5 Gold Governance Migration** — the data-quality bar every new
  civilization must meet.
- **docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md** — the frozen contract this
  strategy is bound by (unchanged by this document).

---

*This document is strategy-only. No frozen artifact is modified by its existence.
Any execution of §6 is a separate, gated milestone subject to the freeze guards in
§7 and the release policy in `docs/RELEASE_VERSION_POLICY.md`.*
