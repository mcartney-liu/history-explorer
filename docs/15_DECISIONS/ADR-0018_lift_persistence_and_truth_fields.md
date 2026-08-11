# ADR-0018: Lift "no-persistence" red line + connect Truth layer (Article 0 mandate)

- Status: Accepted (2026-08-08, PO verbal authorization + written "无限权力，含红线")
- Decider: 翔哥 (PO)
- Supersedes: Freeze Baseline §3 "C6 无持久化 / Memory 仅前端 localStorage"; C1 Allowlist 硬闸

## Background
Product telemetry showed "0% of research is saved, no user completes the research loop".
Inspection (4 agents) confirmed three structural gaps blocking Article 0:
1. Research save button is dead code; backend has zero persistence endpoints (C6).
2. Interest-discovery (Article 0 ②) reads a data source that is never written → permanently empty.
3. Truth layer (Article 0 ③) is fully built (Phase2 grounding, evidence_claims.json with
   confidence/controversy) but the AI path bypasses it; dissent fields are dropped at the
   ClaimEntry/EvidenceClaim boundary.

PO authorized modifying ANY code including constraints/red lines solely to serve Article 0.

## Decision
- **Lift C6**: add server-side anonymous research persistence. Use stdlib `sqlite3`
  (single file `backend/data/research.db`), NO new dependency, NO Postgres/Neo4j/ES.
  Session identified by an optional `X-Session-Id` header (generated client-side, anonymous).
- **Connect Truth layer**: AI answer path MUST run Phase2 grounding; pass
  `expanded_global_ids` (not raw context) to the citation validator; surface
  `source_title/source_tier/next_exploration` in responses; extend `ClaimEntry`/`EvidenceClaim`
  with `truth:{confidence, scholar_consensus, controversy_level, interpretation_note}` read from
  `data/evidence_claims.json`; `perspectives` generated from `interpretation_note` (not free LLM).
- **Soften C1**: freeze-check stays as a soft gate; 3 hard red lines remain FAIL
  (KG not writable / no credentials → no output / Mirror firewall ADR-0013 D3).
- **KEEP** (do NOT lift): C8 Mirror firewall, C5 AI-gateway-only boundary, Trust Rules 1-5.
  These ARE the truth layer; lifting them degrades "approach truth" into "dwell time".

## Consequences
- Positive: research loop becomes completable & restorable; interest discovery gains a real
  signal; AI answers carry evidence strength + dissent → genuine truth approach.
- Negative: first database in the project; minor privacy surface (anonymous session only).
- Risk mitigation: sqlite3 only; research.db gitignored; no PII collected.

## Related
- ADR-0003 (AI gateway approved), ADR-0017 (domestic provider), ADR-0013 (Article 0 / Mirror firewall)
- OPEN-DECISIONS: OD-06 (no persistence) RESOLVED by this ADR.
