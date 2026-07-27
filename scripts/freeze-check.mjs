#!/usr/bin/env node
// History Explorer — M3.5 Freeze Guard (+ M11 ADR-0003 controlled AI allowance)
//
// Automated protection for the M3.5-000 Schema Freeze + Team Operating Spec
// v1.2 invariant: no AI / LLM / graph-DB / Redis / new dependency / backend
// schema changes enter through the frontend-only milestones — EXCEPT the
// approved M11 AI Gateway, which passed the Freeze Revision Gate (ADR-0003).
//
// Design (from M8.6-003 Design Freeze):
//   - Token scan first strips ALL comments (//, #, /* */, """ docstrings),
//     string/template literals, then scans only real code logic. This keeps
//     the documented "AI is a future capability" notes (which are LEGAL)
//     from false-FAILing. Only genuine code-logic hits are D-class.
//   - The bare words `ai`/`llm` are deliberately EXCLUDED: they are product-concept
//     words that legally appear in docs, UI copy, and tests. Runtime introduction
//     is caught via dependency + path-scope checks instead.
//
// M11 (ADR-0003) evolution:
//   - AI runtime is permitted ONLY inside `backend/app/ai_gateway/` (the approved
//     module), behind an approved provider abstraction, with grounding required.
//   - A single approved LLM provider SDK is whitelisted (currently `openai`).
//     Any OTHER AI/LLM/vector SDK is still forbidden (unknown AI dependency FAILs).
//   - Outside the approved module, the absolute AI prohibition is unchanged.
//   - Vector DB / RAG / Neo4j / Redis / GIS remain forbidden everywhere.
//
// M24 (Freeze Gate Revision) evolution — scope guard upgraded to allowlist mode:
//   - The old "frontend-only" scope model (default allow backend except tests/
//     deps/ai_gateway/main.py) is replaced by an explicit SCOPE_ALLOWLIST.
//   - DEFAULT: every backend/ and frontend/ change is FROZEN. A change passes
//     ONLY when it matches SCOPE_ALLOWLIST (exact file or directory prefix).
//   - M24 adds exactly two entries: backend/app/core/dataset.py and
//     backend/tests/test_dataset_metadata.py (approved backend additive
//     foundation change). All other backend/frontend paths stay frozen and
//     require a new Freeze Revision Gate to be allowlisted.
//
// Severity model (M8.6 Playbook): only D-class (business-logic) hits FAIL.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const FROZEN_SCOPE = process.env.FROZEN_SCOPE || "frontend";

// ---- M11 (ADR-0003) approved AI allowance --------------------------------
// AI runtime is permitted ONLY inside this module, additive and grounded.
const APPROVED_AI_MODULE = "backend/app/ai_gateway/";
// Single approved LLM provider SDK (whitelisted). Change ONLY via a new ADR + Gate.
const APPROVED_AI_DEPS = new Set(["openai"]);
// M11-2 (ADR-0003): the FastAPI composition root `backend/app/main.py` must mount
// the AI Gateway routers (/ai/explain, /ai/chat). This is the ONLY backend/app file
// (besides ai_gateway/) permitted under FROZEN_SCOPE=frontend. Allowed content is
// STRICTLY route mounting — no AI logic, no graph mutation, no business logic. Any
// other change to main.py requires a new Freeze Revision Gate. Reviewed under ADR-0003
// + the M11-2 Architecture Acceptance Review (verdict: CONDITIONAL PASS).
const APPROVED_AI_MAIN = "backend/app/main.py";

// Tokens forbidden everywhere EXCEPT inside the approved AI module.
const FORBIDDEN_TOKENS = /\b(gpt|openai|rag|neo4j|graphql|redis|vectordb)\b/i;
// Inside the approved AI module the provider SDK is allowed, but these stay forbidden.
const APPROVED_MODULE_TOKENS = /\b(rag|neo4j|graphql|redis|vectordb)\b/i;

// Known AI/LLM/vector SDKs. Any that match but are NOT in APPROVED_AI_DEPS FAIL.
const AI_SDK_PATTERN = /(openai|anthropic|cohere|langchain|huggingface|gemini|claude|llamaindex|ollama|mistral|bedrock|azure-ai|semantic-kernel|chromadb|pinecone|weaviate|qdrant|faiss|milvus)/i;
// Always-forbidden infrastructure (never allowed, even outside the AI module).
const FORBIDDEN_INFRA = /(neo4j|redis|graphql|tensorflow|torch|pytorch|spacy|nltk|scikit-learn|sklearn)/i;

const EXPECTED_ENTITY_TYPES = 8;
const EXPECTED_RELATIONSHIP_TYPES = 18;
const SCAN_DIRS = ["frontend/src", "backend/app"];

function log(msg) {
  process.stderr.write(msg + "\n");
}

// ---- changed files (for scope check) ----
function getChangedFiles() {
  const tryDiff = (base) => {
    try {
      const out = execSync(`git diff --name-only ${base}...HEAD`, {
        cwd: ROOT,
      })
        .toString()
        .trim();
      return out ? out.split("\n").filter(Boolean) : null;
    } catch {
      return null;
    }
  };
  let files = null;
  if (process.env.GITHUB_BASE_REF) files = tryDiff(process.env.GITHUB_BASE_REF);
  if (!files) files = tryDiff("master");
  if (!files) {
    const st = execSync("git status --porcelain", { cwd: ROOT })
      .toString()
      .trim();
    files = st
      ? st.split("\n").filter(Boolean).map((l) => l.replace(/^[\w\W]{3}/, "").trim())
      : [];
  }
  return files;
}

// ---- 1. scope check (M24 Freeze Gate Revision: allowlist mode) ----
// Upgraded from the old "frontend-only" mode. Now the DEFAULT is: every change
// under `backend/` or `frontend/` is FROZEN. A change is permitted ONLY when it
// matches an entry in SCOPE_ALLOWLIST — the explicit, PO-approved allowlist.
//
// M24 (Data Foundation) was approved via the Freeze Revision Gate and adds
// exactly two files to the allowlist:
//   - backend/app/core/dataset.py              (new Dataset identity layer)
//   - backend/tests/test_dataset_metadata.py   (its unit tests)
//
// M25.1 (Dataset Provider Layer) was approved via a subsequent Freeze Revision
// Gate and ADDS four more files to the allowlist (additive, no change to M24
// entries; all other guards/DEP/TOKEN/ENUM unchanged):
//   - backend/app/core/dataset_provider.py     (DatasetProvider composition layer)
//   - backend/app/core/dataset_validator.py     (Dataset-level validation orchestration)
//   - backend/tests/test_dataset_provider.py   (its unit tests)
//   - backend/tests/test_dataset_validator.py   (its unit tests)
//
// M26.1 (Source Registry + Evidence Claim) was approved via a subsequent Freeze
// Revision Gate and ADDS six more files to the allowlist (additive, no change
// to M24/M25.1 entries; all other guards/DEP/TOKEN/ENUM unchanged):
//   - backend/app/core/source_registry.py      (human-curated Source Registry)
//   - backend/app/core/evidence_claim.py       (typed Evidence Claim + link model)
//   - backend/tests/test_source_registry.py    (its unit tests)
//   - backend/tests/test_evidence_claim.py     (its unit tests)
//   - data/sources.json                        (curated sources, OUTSIDE data/examples)
//   - data/evidence_claims.json                (curated evidence, OUTSIDE data/examples)
//
// M29.1-A (ProvenanceIndex module) was approved via the Freeze Revision Gate and
// ADDS one file to the allowlist (the dormant read-model module created in M29.1-A;
// no runtime wiring, no schema change):
//   - backend/app/core/provenance_index.py    (ProvenanceIndex read model)
//
// M29.1-B (Runtime Projection Activation) was approved via the Freeze Revision Gate
// (ADR-005) and ADDS main.py to the allowlist (provenance read-model wiring only —
// additive composition-root singleton; no AI logic / graph mutation / business logic
// / schema change):
//   - backend/app/main.py
//
// M30-A (Frontend Provenance UI) was approved via the Frontend Freeze Revision
// Gate (lightweight ADR) and ADDS five frontend files to the allowlist (additive;
// consumes the existing M29.1 provenance projection endpoint; no backend / schema
// / enum change; runtime version stays 0.13.0):
//   - frontend/src/data/provenanceApi.ts           (provenance API client)
//   - frontend/src/data/provenanceApi.test.ts      (its unit tests)
//   - frontend/src/components/ProvenancePanel.tsx  (provenance UI panel)
//   - frontend/src/components/ProvenancePanel.test.tsx (its unit tests)
//   - frontend/src/components/EntityPage.tsx       (mounts ProvenancePanel)
//
// Explicitly FORBIDDEN from the allowlist (require a new Freeze Revision Gate):
//   backend/app/api/*,
//   backend/app/ai_gateway/* EXCEPT the four M36.0-gated files listed below
//   (provider.py / response_validator.py / fallback_handler.py /
//   citation_model.py / context_serializer.py remain frozen),
//   backend/app/core/global_graph.py, backend/app/core/registry.py,
//   data/examples/*, frontend/* (except entries listed below).
export const SCOPE_ALLOWLIST = [
  // M24 (Data Foundation) — Freeze Revision Gate
  "backend/app/core/dataset.py",
  "backend/tests/test_dataset_metadata.py",
  // M25.1 (Dataset Provider Layer) — Freeze Revision Gate
  "backend/app/core/dataset_provider.py",
  "backend/app/core/dataset_validator.py",
  "backend/tests/test_dataset_provider.py",
  "backend/tests/test_dataset_validator.py",
  // M26.1 (Source Registry + Evidence Claim) — Freeze Revision Gate
  "backend/app/core/source_registry.py",
  "backend/app/core/evidence_claim.py",
  "backend/tests/test_source_registry.py",
  "backend/tests/test_evidence_claim.py",
  "data/sources.json",
  "data/evidence_claims.json",
  // M29.1-A (ProvenanceIndex module) — Freeze Revision Gate
  "backend/app/core/provenance_index.py",
  // M29.1-B (Runtime Projection Activation) — Freeze Revision Gate (ADR-005)
  "backend/app/main.py",
  // M29.1-C / M29.2 (Provenance API + tests) — Freeze Revision Gate (ADR-005)
  // Endpoint is additive (no new router file, mounts on v1 + legacy). These two
  // test files exercise the read model + the HTTP endpoint; no feature-scope
  // change beyond what the gate already approved for M29.1-A/B.
  "backend/tests/test_provenance_index.py",
  "backend/tests/test_provenance_api.py",
  // M30-A (Frontend Provenance UI) — Frontend Freeze Revision Gate (lightweight
  // ADR). Consumes the existing M29.1 provenance projection endpoint; purely
  // additive frontend change — no backend / schema / enum change; runtime stays 0.13.0.
  "frontend/src/data/provenanceApi.ts",
  "frontend/src/data/provenanceApi.test.ts",
  "frontend/src/components/ProvenancePanel.tsx",
  "frontend/src/components/ProvenancePanel.test.tsx",
  "frontend/src/components/EntityPage.tsx",
  // M30-B (Exploration UX Upgrade) — Frontend Freeze Revision Gate (lightweight
  // ADR). Pure additive frontend UX closure; consumes the existing M29.1
  // provenance projection + M30-A UI. No backend / schema / enum / runtime
  // change; runtime stays 0.13.0.
  //   - RelationshipView.tsx           (S2: lazy "查看依据" entry per branch)
  //   - RelationshipEvidence.tsx        (S1: lazy per-relationship evidence container+view)
  //   - RelationshipEvidence.test.tsx   (its unit tests)
  //   - ExplorationFlowGuide.tsx        (S3: stateless exploration-flow closure guide)
  //   - ExplorationFlowGuide.test.tsx    (its unit tests)
  "frontend/src/components/RelationshipView.tsx",
  "frontend/src/components/RelationshipEvidence.tsx",
  "frontend/src/components/RelationshipEvidence.test.tsx",
  "frontend/src/components/ExplorationFlowGuide.tsx",
  "frontend/src/components/ExplorationFlowGuide.test.tsx",
  // M31 Pilot (Knowledge Model Expansion) — DATA-LEVEL Freeze Gate (M31-G0).
  // Pilot validates the Knowledge Model Expansion on a single high-density
  // dataset (ancient_india) WITHOUT touching schema/runtime/enum/API. This is
  // a curated-data change only; it must NOT introduce new entity/relationship
  // TYPES, new dependencies, or any AI/LLM/DB/neo4j/ES/vector component.
  // NOTE: `checkScope` skips `data/` files, so this entry is a no-op for the
  // checker but documents the PO-approved Pilot gate explicitly (audit trail,
  // consistent with how M26.1 listed data/sources.json + data/evidence_claims.json).
  "data/examples/ancient_india_example.json",
  // M34-A1/A2 (Exploration UX Hardening + Knowledge Graph Visualization MVP) —
  // Frontend Freeze Revision Gate (M34-ADR-001, lightweight ADR; same mechanism
  // as M30-A/M30-B). Purely additive frontend change; self-drawn SVG graph with
  // ZERO new dependency; reuses the existing /explore + /entity relationship
  // data (no new endpoint / backend / schema / enum change; runtime stays 0.13.0).
  //   A1: AppShell (nav shell) + EntityHeader extraction; App.tsx/App.css adopt them.
  //   A2: GraphViewPanel (SVG renderer) + graphLayout (pure, capped ≤30 nodes/≤60 edges).
  "frontend/src/components/AppShell.tsx",
  "frontend/src/components/AppShell.test.tsx",
  "frontend/src/components/EntityHeader.tsx",
  "frontend/src/components/EntityHeader.test.tsx",
  "frontend/src/components/GraphViewPanel.tsx",
  "frontend/src/components/GraphViewPanel.test.tsx",
  "frontend/src/lib/graphLayout.ts",
  "frontend/src/lib/graphLayout.test.ts",
  "frontend/src/App.tsx",
  "frontend/src/App.css",
  // M35 (User Exploration Experience MVP) — Frontend Freeze Revision Gate
  // (lightweight ADR; same mechanism as M30-A/M30-B/M34). Purely additive
  // frontend change: Discover landing page, static narrative layer
  // (StorySection / WhyImportantPanel sourced from hand-curated narrative.ts,
  // NO AI generation), localStorage-only Journey trace, and a no-op/localStorage
  // FeedbackWidget. ZERO new dependency; no backend / schema / data JSON /
  // enum / API change; runtime stays 0.13.0.
  // NOTE: `git status --porcelain` reports untracked dirs with a trailing "/",
  // so directory-style prefixes (not just exact file entries) are required to
  // match the `frontend/src/pages/` path the checker actually enumerates.
  "frontend/src/pages/",
  "frontend/src/components/discover/",
  "frontend/src/components/exploration/",
  "frontend/src/components/journey/",
  "frontend/src/components/FeedbackWidget.tsx",
  "frontend/src/lib/journey.ts",
  "frontend/src/data/narrative.ts",
  // M35 co-located unit tests (same convention as M30-A/M34: every gated
  // source file ships with its test file registered explicitly; the three
  // directory-style entries above already cover their nested tests).
  "frontend/src/components/FeedbackWidget.test.tsx",
  "frontend/src/lib/journey.test.ts",
  "frontend/src/data/narrative.test.ts",
  // M35 (Roman Italy test/data drift fix) — Backend Test Freeze Revision Gate
  // (PO-approved, 2026-07-27). The single backend test file
  // `backend/tests/test_search_index.py` is updated to assert the
  // legitimately-enriched `person-augustus.location == "Roman Italy"` (the
  // example data carries `region: "Roman Italy"`, propagated by
  // `backend/app/core/search.py`). No backend/app business logic, schema,
  // enum, or dependency change — purely a stale assertion aligned to data.
  "backend/tests/test_search_index.py",
  // M36.0 (AI Interpretation Layer Activation) — Freeze Revision Gate
  // (PO-approved, 2026-07-27; ADR-0003 grounded-AI exception evolution).
  // Activates & enhances the EXISTING ai_gateway (grounding 2-hop expansion,
  // prompt mode system, additive response contract) plus the frontend AI UX.
  // EXACT-FILE entries only (deliberately NOT a directory prefix): provider.py,
  // response_validator.py, fallback_handler.py, citation_model.py and
  // context_serializer.py stay frozen. No new dependency / schema / enum /
  // DB / RAG / vector change; OpenAI remains the only whitelisted provider.
  "backend/app/ai_gateway/grounding_builder.py",
  "backend/app/ai_gateway/prompt_service.py",
  "backend/app/ai_gateway/answer_service.py",
  "backend/app/ai_gateway/config.py",
  "frontend/src/data/aiClient.ts",
  "frontend/src/components/AIExplanationPanel.tsx",
  "frontend/src/components/GroundedAnswer.tsx",
  "frontend/src/components/CitationList.tsx",
  "backend/tests/test_ai_gateway.py",
  "frontend/src/components/AIExplanationPanel.test.tsx",
  "frontend/src/components/GroundedAnswer.test.tsx",
  "frontend/src/components/CitationList.test.tsx",
  // M36.1 (Event Intelligence Layer Step 1) — Frontend Freeze Revision Gate
  // Adds EventCausalChain component + test. Pure-additive frontend change
  // consuming existing EntityPage relationships data; no backend / schema /
  // enum / dependency change. Same light-weight mechanism as M30-A/M30-B/M34/M35.
  "frontend/src/components/EventCausalChain.tsx",
  "frontend/src/components/EventCausalChain.test.tsx",
  // M36.1 Step 3 — EventImpactPanel (Event→non-Event long-term impact view)
  "frontend/src/components/EventImpactPanel.tsx",
  "frontend/src/components/EventImpactPanel.test.tsx",
  // M36.1 Step 1 test-only fix: adjust explore_from limit to account for
  // enriched dataset density. No production-logic change.
  "backend/tests/test_exploration_engine.py",
  // M36.2 (Event Narrative Intelligence) — Frontend Freeze Revision Gate
  // EventNarrativeCard: AI-powered historical narrative entry point for Event
  // pages. Reuses existing AIExplanationPanel + M36.0 AI modes; no new API /
  // backend / schema / enum / dependency.
  "frontend/src/components/EventNarrativeCard.tsx",
  "frontend/src/components/EventNarrativeCard.test.tsx",
  // M36.2 Step 2 — EventNarrativeJourney (event exploration path visualization)
  "frontend/src/components/EventNarrativeJourney.tsx",
  "frontend/src/components/EventNarrativeJourney.test.tsx",
  // M37 Phase 1 (AI Historian Chat) — Frontend Freeze Revision Gate
  // HistorianChat: conversational AI historian with multi-turn chat state,
  // suggested questions, and follow-up. Reuses M36.0 explainAI + GroundedAnswer.
  "frontend/src/components/HistorianChat.tsx",
  "frontend/src/components/HistorianChat.test.tsx",
  // M37 Phase 2 (Journey Intelligence) — Frontend Freeze Revision Gate
  // JourneyCard: relationship-driven exploration recommendations. Pure
  // frontend — uses existing entity.relationships data; no new API/AI Gateway.
  "frontend/src/components/JourneyCard.tsx",
  "frontend/src/components/JourneyCard.test.tsx",
  // M38 Phase 1 (AI Research Mode) — Frontend Freeze Revision Gate
  // ResearchPanel + ResearchDimensionCard: multi-dimensional AI research
  // with parallel explainAI() calls. Pure frontend orchestrator; zero
  // backend / AI Gateway / schema changes. Grounding First per dimension.
  "frontend/src/components/ResearchPanel.tsx",
  "frontend/src/components/ResearchPanel.test.tsx",
  "frontend/src/components/ResearchDimensionCard.tsx",
  "frontend/src/components/ResearchDimensionCard.test.tsx",
  // M38 Phase 3 — ResearchReport (structured historical research report view)
  "frontend/src/components/ResearchReport.tsx",
  "frontend/src/components/ResearchReport.test.tsx",
  // M39 Phase 1 — ResearchSummary (cross-dimensional research synthesis)
  // explainAI-powered summary from completed dimension results. Zero backend.
  "frontend/src/components/ResearchSummary.tsx",
  "frontend/src/components/ResearchSummary.test.tsx",
  // M39 Phase 2 — MultiEntitySelector (multi-entity comparison research)
  "frontend/src/components/MultiEntitySelector.tsx",
  "frontend/src/components/MultiEntitySelector.test.tsx",
  // M40 Phase 1 — ResearchHistory (localStorage research persistence)
  "frontend/src/data/ResearchHistory.ts",
  "frontend/src/data/ResearchHistory.test.ts",
  // M40 Phase 2 — ResearchBookmarkButton (bookmark toggle UI)
  "frontend/src/components/ResearchBookmarkButton.tsx",
  "frontend/src/components/ResearchBookmarkButton.test.tsx",
  // M40 Phase 3 — ResearchLibrary (saved research list view)
  "frontend/src/components/ResearchLibrary.tsx",
  "frontend/src/components/ResearchLibrary.test.tsx",
  // M41 Phase 1 — ResearchPlanner (deterministic recommendation engine)
  "frontend/src/data/ResearchPlanner.ts",
  "frontend/src/data/ResearchPlanner.test.ts",
  // M41 Phase 2 — ResearchRecommendationCard (exploration suggestion UI)
  "frontend/src/components/ResearchRecommendationCard.tsx",
  "frontend/src/components/ResearchRecommendationCard.test.tsx",
  // M41 Phase 3 — ResearchDiscoveryPanel (recommendation container UI)
  "frontend/src/components/ResearchDiscoveryPanel.tsx",
  "frontend/src/components/ResearchDiscoveryPanel.test.tsx",
  // M41 Phase 4 — ResearchInsights (deterministic research analytics)
  "frontend/src/data/ResearchInsights.ts",
  "frontend/src/data/ResearchInsights.test.ts",
  // M42 Phase 1 — EntityPageShell (platform tab navigation)
  "frontend/src/components/EntityPageShell.tsx",
  "frontend/src/components/EntityPageShell.test.tsx",
  // M42 Phase 3 — KnowledgeCoverage (data quality analysis utility)
  "frontend/src/data/KnowledgeCoverage.ts",
  "frontend/src/data/KnowledgeCoverage.test.ts",
  // M43 Phase 1 — UIAudit (page section audit model)
  "frontend/src/data/UIAudit.ts",
  "frontend/src/data/UIAudit.test.ts",
  // M43 Phase 2 — UserJourney (funnel path mapping)
  "frontend/src/data/UserJourney.ts",
  "frontend/src/data/UserJourney.test.ts",
  // M43 Phase 3 — UserBehaviorEvent (local behavior telemetry)
  "frontend/src/data/UserBehaviorEvent.ts",
  "frontend/src/data/UserBehaviorEvent.test.ts",
  // M43 Phase 4 — ExplorationFunnelAnalysis (funnel metrics from events)
  "frontend/src/data/ExplorationFunnelAnalysis.ts",
  "frontend/src/data/ExplorationFunnelAnalysis.test.ts",
  // M44 Phase 2 — EntityTabGuidance (tab description model)
  "frontend/src/data/EntityTabGuidance.ts",
  "frontend/src/data/EntityTabGuidance.test.ts",
];

function _scopeAllowed(file) {
  return SCOPE_ALLOWLIST.some((p) => {
    if (file === p) return true;
    // directory-style entry (trailing "/") permits nested files
    if (p.endsWith("/") && file.startsWith(p)) return true;
    return false;
  });
}

export function checkScope(violations, changed) {
  for (const f of changed) {
    if (!f.startsWith("backend/") && !f.startsWith("frontend/")) continue;
    if (!_scopeAllowed(f)) {
      violations.push(
        `SCOPE: backend/frontend change outside approved allowlist not allowed -> ${f}`
      );
    }
  }
}

// ---- 2. token check (strip comments + strings, then scan logic) ----
function walk(dir, cb) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, cb);
    else cb(p);
  }
}

export function checkTokens(violations, root = ROOT) {
  const exts = new Set([".ts", ".tsx", ".py"]);
  for (const dir of SCAN_DIRS) {
    const full = path.join(root, dir);
    if (!fs.existsSync(full)) continue;
    walk(full, (file) => {
      if (!exts.has(path.extname(file))) return;
      const rel = path.relative(root, file).split(path.sep).join("/");
      const inApprovedAi = rel.startsWith(APPROVED_AI_MODULE);
      const tokenRe = inApprovedAi ? APPROVED_MODULE_TOKENS : FORBIDDEN_TOKENS;
      let src = fs.readFileSync(file, "utf8");
      // Remove cross-line block constructs FIRST (replace content with spaces
      // but KEEP newlines so line numbers stay accurate).
      src = src.replace(/"""[\s\S]*?"""/g, (m) => m.replace(/[^\n]/g, " ")); // py docstrings
      src = src.replace(/'''[\s\S]*?'''/g, (m) => m.replace(/[^\n]/g, " ")); // py docstrings
      src = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")); // js block
      src.split("\n").forEach((raw, i) => {
        // strip line comments
        let code = raw.replace(/\/\/.*$/, "").replace(/#.*$/, "");
        // strip string + template literals (UI copy / docstrings never FAIL)
        code = code
          .replace(/"[^"]*"/g, "")
          .replace(/'[^']*'/g, "")
          .replace(/`[^`]*`/g, "");
        const m = code.match(tokenRe);
        if (m) {
          violations.push(
            `TOKEN: ${rel}:${i + 1} forbidden token "${m[0]}"${
              inApprovedAi ? " (inside approved AI module)" : ""
            }`
          );
        }
      });
    });
  }
}

// ---- 3. dependency check ----
export function checkDeps(violations, root = ROOT) {
  const pkgPath = path.join(root, "frontend/package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    for (const d of Object.keys(deps)) {
      if (AI_SDK_PATTERN.test(d) && !APPROVED_AI_DEPS.has(d.toLowerCase())) {
        violations.push(
          `DEP: frontend/package.json contains non-approved AI SDK "${d}" (approved: ${[
            ...APPROVED_AI_DEPS,
          ]})`
        );
      }
      if (FORBIDDEN_INFRA.test(d)) {
        violations.push(`DEP: frontend/package.json contains forbidden dependency "${d}"`);
      }
    }
  }
  for (const rf of ["backend/requirements.txt", "backend/requirements-dev.txt"]) {
    const p = path.join(root, rf);
    if (!fs.existsSync(p)) continue;
    fs.readFileSync(p, "utf8")
      .split("\n")
      .forEach((l) => {
        const name = l.split(/[=<>~ ]/)[0].trim();
        if (!name) return;
        if (AI_SDK_PATTERN.test(name) && !APPROVED_AI_DEPS.has(name.toLowerCase())) {
          violations.push(`DEP: ${rf} contains non-approved AI SDK "${name}"`);
        }
        if (FORBIDDEN_INFRA.test(name)) {
          violations.push(`DEP: ${rf} contains forbidden dependency "${name}"`);
        }
      });
  }
}

// ---- 4. enum guard ----
export function checkEnums(violations, root = ROOT) {
  const vp = path.join(root, "backend/app/validation.py");
  if (!fs.existsSync(vp)) return;
  const c = fs.readFileSync(vp, "utf8");
  const eB = c.match(
    /ENTITY_TYPES:\s*frozenset(?:\[[^\]]*\])?\s*=\s*frozenset\(\s*\{([\s\S]*?)\}/
  );
  const rB = c.match(
    /RELATIONSHIP_TYPES:\s*frozenset(?:\[[^\]]*\])?\s*=\s*frozenset\(\s*\{([\s\S]*?)\}/
  );
  const count = (b) =>
    b ? (b[1].match(/"[^"]+"|'[^']+'/g) || []).length : -1;
  const eC = count(eB);
  const rC = count(rB);
  if (eC !== EXPECTED_ENTITY_TYPES)
    violations.push(`ENUM: ENTITY_TYPES count=${eC} expected=${EXPECTED_ENTITY_TYPES}`);
  if (rC !== EXPECTED_RELATIONSHIP_TYPES)
    violations.push(
      `ENUM: RELATIONSHIP_TYPES count=${rC} expected=${EXPECTED_RELATIONSHIP_TYPES}`
    );
}

// ---- orchestration (pure, testable) ----
export function runChecks(opts = {}) {
  const root = opts.root ?? ROOT;
  const files = opts.files ?? getChangedFiles();
  const violations = [];
  checkScope(violations, files); // allowlist mode: default frozen, only SCOPE_ALLOWLIST passes
  checkTokens(violations, root);
  checkDeps(violations, root);
  checkEnums(violations, root);
  return violations;
}

// ---- CLI entry ----
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  const violations = runChecks();
  if (violations.length) {
    log(`\n[M3.5 Freeze Guard] FAILED — ${violations.length} D-class violation(s):`);
    for (const v of violations) log("  - " + v);
    log("\nFix the violation or escalate to Product Owner before merge.");
    process.exit(1);
  }
  log("[M3.5 Freeze Guard] PASSED — no D-class violations.");
  process.exit(0);
}
