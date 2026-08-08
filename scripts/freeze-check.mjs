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
    // NOTE (M73 Phase3-B Bug Sweep): do NOT .trim() the raw output before
    // splitting. Porcelain lines are "<XY> <path>" — a leading space is the
    // X (staged) column for modified files. Trimming the whole string strips
    // that space from the FIRST line, so the 3-char status strip below eats
    // the path's first letter (e.g. "rontend/...") and the file silently
    // escapes the scope check. split/filter already drop trailing empties.
    const st = execSync("git status --porcelain", { cwd: ROOT }).toString();
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
  //   M65-A03 (H7 fix): entity visual identity SSOT — domain semantic color
  //   source migrated out of the graph components (PO-approved A+ 2026-07-30).
  "frontend/src/lib/entityColors.ts",
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
  // ADR-0017 (PO-approved 2026-08-08): domestic OpenAI-compatible provider support.
  // provider.py gains base_url + model passthrough (redirects the whitelisted
  // openai SDK to DeepSeek/通义/智谱). Zero new dependency; grounding + fallback
  // unchanged; default behaviour byte-identical when AI_BASE_URL/AI_MODEL unset.
  "backend/app/ai_gateway/provider.py",
  "frontend/src/data/aiClient.ts",
  "frontend/src/data/aiClient.test.ts",  // M65-A04 (PO-approved) — AI client contract tests (H9 real-AI link)
  // M74-003 (C3-2, PO-approved): AI exploration suggestions build-time flag.
  // Pure frontend additive; default OFF keeps M73 behaviour byte-identical
  // (parent-mount gate => zero render + zero request).
  "frontend/src/data/aiFeatureFlag.ts",
  "frontend/src/data/aiFeatureFlag.test.ts",
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
  // M45 Phase 4 — ProductIntelligence (product insights from events)
  "frontend/src/data/ProductIntelligence.ts",
  "frontend/src/data/ProductIntelligence.test.ts",
  // M46 Phase 3 — ProductUsageAnalysis (unified analysis entry point)
  "frontend/src/data/ProductUsageAnalysis.ts",
  "frontend/src/data/ProductUsageAnalysis.test.ts",
  // M47 — OptimizationPriority + CapabilityHealth (decision intelligence)
  "frontend/src/data/OptimizationPriority.ts",
  "frontend/src/data/OptimizationPriority.test.ts",
  // M48 — ExplorationBehaviors (behavioral pattern detection)
  "frontend/src/data/ExplorationBehaviors.ts",
  "frontend/src/data/ExplorationBehaviors.test.ts",
  // M49 — ExplorationDepth (exploration depth scoring)
  "frontend/src/data/ExplorationDepth.ts",
  "frontend/src/data/ExplorationDepth.test.ts",
  // M43-M49 pipeline integration smoke tests
  "frontend/src/data/__smoke__/pipeline-integration.test.ts",
  // M50 — KnowledgeUsageCoverage (usage-informed knowledge coverage)
  "frontend/src/data/KnowledgeUsageCoverage.ts",
  "frontend/src/data/KnowledgeUsageCoverage.test.ts",
  // M51 — Intelligence Activation Audit (pipeline validation)
  "frontend/src/data/M51_activation_audit.test.ts",
  // M52 — ProductDecisionInsight (decision fusion layer)
  "frontend/src/data/ProductDecisionInsight.ts",
  "frontend/src/data/ProductDecisionInsight.test.ts",
  // M53 — Pipeline Auto-Activation (intelligence activation gate)
  "frontend/src/data/ProductIntelligenceActivation.ts",
  "frontend/src/data/ProductIntelligenceActivation.test.ts",
  // M54 — Reality Validation (pipeline output validation)
  "frontend/src/data/M54_reality_validation.test.ts",
  // M57 — Reality Validation 2 (5-scenario pipeline validation)
  "frontend/src/data/M57_reality_validation.test.ts",
  // M59 — UI Design System Foundation
  "frontend/src/components/ui/",
  // M59-005 — EntityViewModel data layer
  "frontend/src/data/entity/",
  // M59-006 — EntityHero component
  "frontend/src/components/entity/",
  // M59-009 — Exploration Workspace
  "frontend/src/components/workspace/",
  // M59-011 — AI Companion Architecture
  "frontend/src/data/ai/",
  "frontend/src/components/ai/",
  // M59 — index.html (Earth background + Google Fonts)
  "frontend/index.html",
  // M59-016 — entity flow consolidation (test updates)
  "frontend/src/__tests__/M2_003.test.tsx",
  "frontend/src/__tests__/SearchEntity.test.tsx",
  // M60-003 — Landing page productization
  "frontend/src/components/LandingPage.tsx",
  "frontend/src/components/SearchBox.tsx",
  "frontend/src/components/AppShell.tsx",
  // M59-020 — Exploration Memory & Workspace
  "frontend/src/data/workspace/",
  // M59-021 — Layout Grid + Dev Catalog + Visual QA
  "frontend/src/styles/",
  "frontend/src/main.tsx",
  "frontend/src/pages/DevCatalog.tsx",
  "frontend/src/data/locale.tsx",
  "frontend/src/__tests__/",
  // M61-bridge-build (TypeScript cleanup) — Frontend Freeze Revision Gate
  // (lightweight ADR-0004; PO-approved 2026-07-29 as part of the vM60 harvest
  // route). ConnectionsExplainedPanel was consumed by EntityPage from M36/M37
  // but never registered in the allowlist; the M61 fix is a pure dead-code
  // removal (unused-destructure TS6133). No backend / schema / enum / runtime
  // / dependency change; runtime stays 0.13.0.
  "frontend/src/components/ConnectionsExplainedPanel.tsx",
  "scripts/visual-check.mjs",
  // M62.5 (Global Language Experience System) — Frontend Freeze Revision Gate
  // (lightweight ADR-M62.5-Freeze-Revision; same mechanism as M30-A/M34/M35/M59/M61).
  // Purely additive frontend change: i18n resource framework + Language UX +
  // unified preference foundation. ZERO backend / schema / enum / dependency
  // change; runtime stays 0.13.0.
  //   - locales/                       : i18n resource framework (terminology.ts + zh/en/ja/*)
  //   - lib/format.ts                  : Intl date/number formatting (O6)
  //   - lib/preferences.ts             : unified preference store (he-prefs) + migration (PF-01)
  //   - components/LanguageSwitcher.tsx: LUX-01 language switch UX
  // Least Privilege notes:
  //   - lib/ has NO directory prefix (only exact entries, e.g. graphLayout.ts),
  //     so each new lib file is enumerated precisely — not a broad lib/ open.
  //   - components/ has NO broad prefix; LanguageSwitcher is an exact top-level entry.
  //   - PreferencePanel (P1) and context/PreferenceContext.tsx (D7 prefers lib/)
  //     are intentionally EXCLUDED from M62.5 scope.
  //   - Test files (format.test.ts / preferences.test.ts) are NOT pre-added to the
  //     allowlist; they will be registered only when W1 actually creates them.
  "frontend/src/locales/",
  "frontend/src/lib/format.ts",
  "frontend/src/lib/preferences.ts",
  "frontend/src/components/LanguageSwitcher.tsx",
  // M62.5 W10 (Test Migration) — Frontend Freeze Revision Gate continuation.
  // W10 migrates component co-located integration tests to locale-aware
  // assertions (wrap in <LocaleProvider>, assert zh). These tests live under
  // frontend/src/components/__tests__/ (distinct from the already-allowlisted
  // frontend/src/__tests__/ dir). Directory-prefix entry, test files only.
  "frontend/src/components/__tests__/",

  // M65 Phase 1 (Exploration Space Foundation) — Frontend Freeze Revision Gate
  // (PO-approved 2026-07-30). Adds the exploration shell directory prefix:
  //   - ExplorationShell.tsx         unified spatial layout (slot-based)
  //   - CompanionPlaceholder.tsx     static AI placeholder (no logic)
  // Least Privilege: directory prefix gated to components/shell/ ONLY.
  // No backend / dependency / runtime / schema / enum change.
  "frontend/src/components/shell/",

  // M65 Phase 2A (Discover Component Extraction) — Frontend Freeze Revision Gate
  // (PO-approved 2026-07-30). Adds the discover shared components directory:
  //   - QuickStartChips.tsx        shared quick-start question buttons
  //   - TopicCard.tsx              shared topic card (presentational)
  //   - TopicCardGrid.tsx          shared topic card grid (≤2 variants)
  // Least Privilege: directory prefix gated to components/discover/ ONLY.
  // No backend / dependency / runtime / schema / enum change.
  "frontend/src/components/discover/",

  // M65 Phase 2C (Connections Merge) — Frontend Freeze Revision Gate
  // (PO-approved 2026-07-30). Adds the unified RelationshipContext entry:
  //   - RelationshipContext.tsx     wraps ConnectionsPanel + ConnectionsExplainedPanel
  //                                + RelationshipInsightPanel (composition only)
  // Exact file path — Least Privilege. No backend / dependency / schema change.
  "frontend/src/components/RelationshipContext.tsx",

  // M65 Phase 2C (Journey Merge) — Frontend Freeze Revision Gate
  // (PO-approved 2026-07-30). Adds the unified ExplorationPath entry:
  //   - ExplorationPath.tsx         wraps ExplorationPathTree + ExplorationJourney
  //                                + JourneyPanel (composition only)
  // Exact file path — Least Privilege. No backend / dependency / schema change.
  "frontend/src/components/ExplorationPath.tsx",

  // M65 Phase 2C (CrossTopic Merge) — Frontend Freeze Revision Gate
  // (PO-approved 2026-07-30). Adds the unified CrossTopicView entry:
  //   - CrossTopicView.tsx           wraps CrossTopicBridge (which composes
  //                                CrossTopicConnectionsPanel + CrossTopicTopicList)
  // Exact file path — Least Privilege. No backend / dependency / schema change.
  "frontend/src/components/CrossTopicView.tsx",

  // M65 Phase 2C (Research Panel Merge) — Frontend Freeze Revision Gate
  // (PO-approved 2026-07-30). Adds the unified ResearchSuite entry:
  //   - ResearchSuite.tsx            wraps ResearchSummary + ResearchReport
  //                                + ResearchDimensionCard + ResearchRecommendationCard
  //                                (composition only — no AI state migration)
  // Exact file path — Least Privilege. No backend / dependency / schema change.
  "frontend/src/components/ResearchSuite.tsx",

  // M65 Phase 3A (Timeline Foundation) — Frontend Freeze Revision Gate
  // (PO-approved 2026-07-30). Adds the TimelineStrip entry:
  //   - TimelineStrip.tsx            bottom-axis timeline bar (presentational)
  // Exact file path — Least Privilege. No backend / dependency / schema change.
  "frontend/src/components/TimelineStrip.tsx",

  // M65 Phase 3B (Workspace Completion) — Frontend Freeze Revision Gate
  // (PO-approved 2026-07-30). Adds the pinned entity store:
  //   - lib/pinnedStore.ts            localStorage-backed pin/unpin store
  // Exact file path — Least Privilege. No backend / dependency / schema change.
  "frontend/src/lib/pinnedStore.ts",

  // M65 Phase 3B (Workspace Completion) — unified persistence layer
  // (PO-approved 2026-07-30). Adds the workspace store:
  //   - lib/workspaceStore.ts          unified he-workspace key with migration
  // Exact file path — Least Privilege. No backend / dependency / schema change.
  "frontend/src/lib/workspaceStore.ts",

  // M62.5 W0-bis Freeze Supplement (ADR-M62.5-Freeze-Revision, continuation).
  // Adds the precise set of files that Stage B i18n externalization will touch.
  // Least Privilege: every entry is an EXACT file path — NO components/** broad
  // prefix, NO backend / dependency / runtime / schema / enum opening.
  // ADR restriction per entry: "仅允许 i18n 字符串外置 — 禁止业务逻辑修改、
  // 禁止 API 修改、禁止数据结构修改、禁止枚举修改。"
  // Rationale: each listed component/data file contains user-visible hardcoded
  // strings (zh + en, per R14 English-string blind-spot audit) that Stage B will
  // externalize via t()/getTermLabel()/getDisplayName() only.

  // --- B1/B3/B4/B6 data-layer source strings (exact paths) ---
  "frontend/src/data/understandingRules.ts",        // B1 relationship "meaning/perspective" templates (en)
  "frontend/src/data/insightExport.ts",             // B1/B6 export report copy (zh)
  "frontend/src/data/explorationStarters.ts",       // B4 Discover starter descriptions (en)
  "frontend/src/data/compareTemporal.ts",           // B3 TemporalComparison sentences (en)

  // --- Top-level components requiring i18n externalization (exact paths, no broad prefix) ---
  "frontend/src/components/TimelinePanel.tsx",
  "frontend/src/components/Breadcrumb.tsx",
  "frontend/src/components/ConnectionsPanel.tsx",
  "frontend/src/components/ContinueExploringPanel.tsx",
  "frontend/src/components/CrossTopicBridge.tsx",
  "frontend/src/components/CrossTopicConnectionsPanel.tsx",
  "frontend/src/components/CrossTopicTopicList.tsx",
  "frontend/src/components/EmptyState.tsx",
  "frontend/src/components/EntityExplorationGuide.tsx",
  "frontend/src/components/EntitySearchBox.tsx",
  "frontend/src/components/ErrorCard.tsx",
  "frontend/src/components/ExplorationJourney.tsx",
  "frontend/src/components/ExplorationPathTree.tsx",
  "frontend/src/components/ExplorationPathsPanel.tsx",
  "frontend/src/components/ExplorationTrail.tsx",
  "frontend/src/components/FeaturedTopics.tsx",
  "frontend/src/components/FirstExplorationGuide.tsx",
  "frontend/src/components/HistoryBar.tsx",
  "frontend/src/components/InterpretationPanel.tsx",
  "frontend/src/components/LoadingSkeleton.tsx",
  "frontend/src/components/MainEntityCard.tsx",
  "frontend/src/components/MultiEntityTimeline.tsx",
  "frontend/src/components/RecentExplorations.tsx",
  "frontend/src/components/RecommendationPanel.tsx",
  "frontend/src/components/RelatedEntityList.tsx",
  "frontend/src/components/SummaryPanel.tsx",
  "frontend/src/components/TemporalComparisonPanel.tsx",
  "frontend/src/components/ThemesPanel.tsx",
  "frontend/src/components/TopicComparisonPanel.tsx",
  "frontend/src/components/SearchResults.tsx",
  "frontend/src/components/EntityPickerPanel.tsx",
  "frontend/src/components/EntityPickerPanel.test.tsx",        // B7 co-located test (i18n wrap)
  "frontend/src/components/MultiEntityContextPanel.tsx",
  "frontend/src/components/MultiEntityContextPanel.test.tsx",  // B7 co-located test (i18n wrap)
  "frontend/src/components/RelationshipPathGraph.tsx",
  "frontend/src/components/RelationshipPathGraph.test.tsx",    // B7 co-located test (i18n wrap)
  "frontend/src/components/RelationshipInsightPanel.tsx",
  "frontend/src/components/RelationshipInsightPanel.test.tsx", // B7 co-located test (i18n wrap)

  // M69 (Exploration Package — Core Product Object) — Frontend Freeze Revision Gate
  // (PO-approved 2026-07-31). Adds the official Exploration Package layer:
  //   - data/explorationPackages.ts        Package type + loader + graph-grounded validator
  //   - data/explorationPackages.test.ts   reference-resolvability gate (no dangling ids)
  //   - data/userPackage.ts                UserPackage type-only stub (@future, no logic)
  //   - components/package/                 PackageCard / PackageJourney / TimelineChain /
  //                                         RelationshipChain / SourceChain / RecommendedNext (+ tests)
  // Least Privilege: no backend / dependency / schema / enum / runtime change.
  // backend diff = 0; runtime 0.13.0 unchanged. No AI/LLM runtime (future AI steps are
  // contract-only placeholders, never executed). data/ JSON is out of scope-check by design.
  "frontend/src/data/explorationPackages.ts",
  "frontend/src/data/explorationPackages.test.ts",
  "frontend/src/data/userPackage.ts",
  "frontend/src/components/package/",

  // M70 (Exploration Guide — deterministic exploration navigation) — Frontend
  // Freeze Revision Gate (PO-approved 2026-07-31). Adds the deterministic
  // Exploration Guide: a NON-AI navigation aid (current position / next
  // graph-reachable step / reason via relationship templates / coverage) built
  // purely from the frozen Knowledge Graph + Package contract + behavior events.
  //   - data/explorationGuide.ts        pure-function engine (no LLM, no scoring)
  //   - data/explorationGuide.test.ts   unit tests incl. Package Generalization
  //   - components/guide/                GuidePanel presentation (+ tests)
  // Least Privilege: no backend / LLM / accounts / storage / recommendation
  // algorithm. backend diff = 0; runtime 0.13.0 unchanged. Existing files
  // (pages/, App.tsx, data/explorationPackages.*) already covered above.
  "frontend/src/data/explorationGuide.ts",
  "frontend/src/data/explorationGuide.test.ts",
  "frontend/src/components/guide/",

  // M71 (Exploration Validation — minimal telemetry + deterministic metrics) —
  // Frontend Freeze Revision Gate (PO-approved 2026-07-31). Validates whether
  // Package + Journey + Guide drive real exploration. Only behavior-analysis
  // telemetry + read-only metric aggregation; NO recommendation / personalization.
  //   - data/explorationMetrics.ts     deterministic metric engine (Depth /
  //                                    Coverage Rate / Cross-Package Expansion /
  //                                    Guide Interaction; Completion deferred —
  //                                    complete_package lacks stable product def)
  //   - data/explorationMetrics.test.ts  metric unit tests (test file follows
  //                                    the main file — not a separate request)
  // UserBehaviorEvent.ts is ALREADY allowlisted (M43) — this gate only approves
  // its content change (+4 BehaviorAction, +packageSlug?/+sourceId? optional
  // fields; recordEvent/read/write signatures unchanged).
  // Least Privilege: no KG / Package-contract / Guide-logic / backend / LLM /
  // accounts / cloud / personalization change. backend diff = 0; runtime 0.13.0.
  "frontend/src/data/explorationMetrics.ts",
  "frontend/src/data/explorationMetrics.test.ts",

  // M73 (Alpha Hardening — architecture debt + UI polish + QA + readiness) —
  // Frontend Freeze Revision Gate (PO-approved 2026-07-31). Alpha product
  // hardening: reduce tech debt, raise stability, prepare for M74 external
  // user validation. NO new product capability / community / creator /
  // accounts / cloud / LLM / personalization.
  //   - hooks/                 useNavigationHistory + usePackageContext
  //                            (App.tsx de-complexity: hash parse, history
  //                            state machine, package lifecycle, telemetry
  //                            moved out of App's direct responsibility)
  //   - package.json           devDependencies ONLY += @playwright/test (local
  //                            Alpha regression test infra; dependencies
  //                            untouched — DEP rule below guards it)
  //   - e2e/ + playwright.config.ts   three critical-path specs
  //                            (main chain / cross-package / edge cases);
  //                            vitest include stays src/** so no interference
  // Existing-file content changes approved here: App.tsx (hook adoption),
  // explorationPackages.ts (+owner?/version?/sourcePackage? reserved-only),
  // components/ui/ (Badge/Tabs/EmptyState — dir already listed),
  // package/page components (5-8 high-frequency button consolidation).
  // data/examples/*.json labels.zh patch is out of scope-check by design
  // (data/ skipped — M33 precedent; content change approved: additive only).
  // Phase2-C: frontend/public/ — favicon.svg (kills /favicon.ico 404 noise);
  // index.html (already allowlisted) now links it. Static asset, zero logic.
  // Phase3-A: frontend/package-lock.json — npm install -D @playwright/test
  // touches the lockfile (checkScope scans frontend/* without extension filter);
  // DEP lockdown guarantees dependencies/ stays frozen, only devDependencies
  // may add @playwright/test.
  // M74 Phase1 (PO-approved): frontend/src/data/topicResolver.ts + .test.ts —
  // deterministic Topic Resolution (中文问题/别名 -> 包/实体 slug)。Pure
  // frontend, zero AI, zero backend, zero data change. Backend diff stays 0.
  // M74 Phase2 (Freeze Gate APPROVED): backend Grounding Claim Binding —
  // knowledge_service.py gains a READ-ONLY local-id->global-id mapping
  // (Step 1); ai_gateway modules gain claim/source grounding (Steps 3-5).
  // All changes read-only, no new endpoints, no new deps; AI_GATEWAY_ENABLED
  // stays false (runtime default OFF — M73 behaviour byte-identical).
  // Least Privilege: no backend / LLM / accounts / cloud / community change.
  // backend diff = 0; runtime 0.13.0 unchanged.
  "frontend/src/data/topicResolver.ts",
  "frontend/src/data/topicResolver.test.ts",
  "backend/app/core/knowledge_service.py",
  "backend/tests/test_ai_gateway_grounding_claim.py",
  "backend/app/ai_gateway/grounding_builder.py",
  "backend/app/ai_gateway/citation_model.py",
  "backend/app/ai_gateway/response_validator.py",
  "backend/app/ai_gateway/answer_service.py",
  // M74-004-002 (PO-approved): Exploration Planner backend orchestration —
  // state-aware recommendations (P7 self-fix / P2 visited / deterministic
  // reason). Pure additive inside the approved ai_gateway module; no
  // ClaimGraph / Evidence contract change, no LLM / provider / prompt touch.
  "backend/app/ai_gateway/exploration_planner.py",
  "backend/app/main.py",
  "frontend/src/hooks/",
  "frontend/package.json",
  "frontend/package-lock.json",
  "frontend/e2e/",
  "frontend/playwright.config.ts",
  // M74-003 (C3-2, PO-approved): Feature-ON E2E config (vite :5174 with
  // VITE_AI_SUGGESTIONS_ENABLED=true) — pure frontend test infra addition.
  "frontend/playwright.ai.config.ts",
  "frontend/public/",
  "frontend/.gitignore",
  // M78 (Freeze Revision ADR-M78-FR) — register domain framework into Freeze
  // Governance. The multi-domain framework under backend/app/core/domain/ was
  // released in M77-A (commit 73a8cbd) but was not present in SCOPE_ALLOWLIST,
  // so changes under this path were not included in freeze-check scope
  // evaluation. This entry brings the already-released directory under formal
  // Freeze Governance. Additive only; no Runtime Freeze boundary, no Runtime
  // behaviour, and no framework semantic change. See docs/10_ARCHITECTURE/ADR-M78-FR.md.
  "backend/app/core/domain/",
  // M78.2 (Freeze Revision via ADR-M78-RL) — AdapterRegistry unregister
  // lifecycle test. Companion to backend/app/core/domain/ above; verifies the
  // additive unregister contract without touching Runtime Freeze. See
  // docs/10_ARCHITECTURE/ADR-M78-RL.md.
  "backend/tests/test_m78_2_registry_lifecycle.py",
  // M78.3 (Freeze Revision via ADR-M78-SB enforcement) — Domain Contract
  // Enforcement test. Verifies the ADR-M78-SB decoupling (Ontology stays a
  // pure vocabulary, independent of the Global Schema Constraint 8/18) without
  // touching Runtime Freeze or opening a new ADR. See
  // docs/10_ARCHITECTURE/ADR-M78-SB.md.
  "backend/tests/test_m78_3_domain_contract.py",
  // M79 (Freeze Revision) — Causal Semantic Layer foundation. Adds an
  // independent backend/app/core/causal/ package (interpretive semantic layer,
  // NOT a domain vocabulary extension) plus its enforcement test. Does not
  // touch Runtime Freeze boundaries (Ontology / DomainSchema / Global
  // Constraint 8/18). See docs/10_ARCHITECTURE/ADR-M79.md.
  "backend/app/core/causal/",
  "backend/tests/test_m79_causal_layer.py",
  // DB-B01 Freeze Revision Gate (PO-approved 2026-08-02):
  // pytest fixture only. Isolates Domain Registry state between tests.
  // No runtime, schema, dependency, or business logic impact.
  "backend/conftest.py",
  // M76-C1 contract test allowlist (PO-approved 2026-08-02):
  // cross-platform data path fix only. No runtime, schema, dependency,
  // or business logic impact.
  "backend/tests/test_ontology_contract.py",
  // Phase 5 (A3 red-line downgrade, ADR-0015 D1) — Freeze Revision Gate (PO-approved 2026-08-07).
  // Backend: rename recommend_next -> generate_candidates + retire public /recommendations endpoint.
  "backend/app/core/exploration_engine.py",
  "backend/tests/test_recommend.py",
  // Frontend: NextStepPanel replaces RecommendationPanel (no recommendation vocabulary).
  // CompanionShell/CompanionRouter thread ExplorationAction[] into NextStepPanel (discover mode).
  "frontend/src/components/NextStepPanel.tsx",
  "frontend/src/components/NextStepPanel.test.tsx",
  "frontend/src/components/ai/CompanionShell.tsx",
  "frontend/src/components/ai/CompanionRouter.tsx",

  // M60 type-debt cleanup — Frontend Freeze Revision Gate (PO-approved 2026-08-07).
  // Pure TypeScript type fixes + dead-code removal (tsc --noEmit 55 -> 0; no
  // behavioural change). No backend / schema / enum / dependency / runtime
  // change; runtime 0.13.0. Least Privilege: exact file paths ONLY (deliberately
  // NO broad prefix for data/ next/ routing/ primitives/).
  "frontend/src/components/primitives/EvidenceBlock.tsx",
  "frontend/src/data/causalStatement.ts",
  "frontend/src/next/companion/ExplanationReplay.ts",
  "frontend/src/next/memory/MemoryPolicy.ts",
  "frontend/src/next/memory/MemoryProjection.ts",
  "frontend/src/routing/legacyRedirect.ts",
  "frontend/src/routing/parseRoute.ts",

  // P5-S2 Step 0 — VS-01 Token layer (PO-approved 2026-08-07). Additive CSS
  // variables only (VS-01 semantic names, dark-compatible values); old tokens
  // retained. No backend / schema / enum / dependency / runtime change.
  "frontend/src/styles/tokens.css",
  "frontend/src/styles/ui.css",
  "frontend/src/styles/layout-grid.css",
  "frontend/src/styles/package.css",
  "frontend/src/styles/explorer-experience.css",
  "frontend/src/styles/components.css",
  "frontend/src/pages/m89/m89.css",
  "frontend/src/App.css",
  "frontend/src/styles/legacy-theme.css",
  "frontend/src/main.tsx",
  "frontend/src/components/shell/ExplorerShell.tsx",
  "frontend/src/components/primitives/UnderstandingCard.tsx",
  "frontend/src/pages/DevCatalog.tsx",
  "frontend/src/components/GraphViewPanel.tsx",
  "frontend/src/components/RelationshipPathGraph.tsx",
  "frontend/src/components/RelationshipInsightPanel.tsx",
  "frontend/src/components/InterpretationPanel.tsx",

  // ADR-0018 (PO-approved 2026-08-08) — Truth layer + Research persistence.
  // The PO lifted red line C6 ("no persistence") SOLELY to serve COMPASS
  // Article 0 ①: a research package is the visible form of the user's
  // cognitive structure, and a structure that dies on page reload never
  // accumulates. Storage is stdlib `sqlite3` ONLY — ZERO new dependency, no
  // ORM, no external DB process; the .db file is gitignored runtime state.
  // The 3 hard red lines (no vector DB / RAG, no Neo4j / Redis / GraphQL,
  // no ungrounded AI output) remain fully in force.
  //   - research_store.py   (sqlite3 storage, payload-opaque)
  //   - research_router.py  (POST/GET/DELETE /api/v1/research, X-Session-Id)
  // `backend/app/main.py` is already allowlisted above (M29.1-B / M74) and
  // only gains the router mount — no storage logic leaks into it.
  "backend/app/ai_gateway/research_store.py",
  "backend/app/ai_gateway/research_router.py",

  // Wave2-#135 (Test-drift alignment) — Freeze Revision Gate (PO-approved
  // 2026-08-08, "按你推荐的来"). Backend test suite had drifted 13 failures
  // behind the shipped data/feature reality. These two test files carry STALE
  // ASSERTIONS ONLY (no backend/app business logic, schema, enum, dependency
  // or runtime change):
  //   - test_api_v1.py  : topics contract gained the real `category` field
  //                       shipped with the P5 landing page.
  //   - test_explore.py : roman_empire dataset titles are localized to Chinese
  //                       (consistent with greek / egypt), so "Roman Empire"
  //                       was a stale English expectation.
  // Same mechanism/precedent as the M35 `test_search_index.py` entry above.
  "backend/tests/test_api_v1.py",
  "backend/tests/test_explore.py",

  // Wave2-#136 (Evidence-layer source expansion) — Freeze Revision Gate
  // (PO-approved 2026-08-08, "按你推荐的来"). M26.1 curated source registry
  // (data/sources.json) grew from 43 → 105 well-curated sources as part of the
  // truth-layer evidence coverage expansion. The pipeline (acquisition/
  // pipeline.py) is UNCHANGED — it merely reads the now-larger curated
  // registry. This test file carries a STALE HARDCODED COUNT ASSERTION ONLY
  // (43 sources), which must track the registry size; no business-logic /
  // schema / enum / dependency / runtime change.
  "backend/tests/test_ontology_contract.py",

  // Wave2-#137 (Semantic entry retrieval) — Freeze Revision Gate (PO-approved
  // 2026-08-08, "按你推荐的来"). topicResolver.ts is upgraded from a
  // title/name-only matcher (M74) to a deterministic lexical/semantic entry
  // resolver: enriched index (package title/summary/category/seed + referenced
  // entity names; entity name/alias/label/description/type), CJK bigram +
  // latin tokenization, curated synonym expansion, weighted token-score
  // ranking (searchTopics) and question-intent detection (understanding mode).
  // ZERO AI/LLM/network, read-only, deterministic. App.tsx (already allowlisted
  // at L240) is rewired to resolveEntryQuery; french-revolution special-case
  // folded into the resolver. No schema / enum / dependency / runtime change.
  "frontend/src/data/topicResolver.ts",
  "frontend/src/data/topicResolver.test.ts",

  // Wave2-#140 (DiscoverPage test-drift alignment + empty-shell fix) — Freeze
  // Revision Gate (PO-approved 2026-08-08, "按你推荐的来"). Closes OD-08.
  // 1) ProductIntro was extracted out of DiscoverPage in M90.3 but its tests
  //    were orphaned in DiscoverPage.test.tsx (3 permanently-failing
  //    assertions). Coverage is MOVED, not deleted, to a new
  //    ProductIntro.test.tsx alongside the component that owns the markup.
  // 2) The category-card test rendered DiscoverPage without the `topics` prop
  //    the cards are derived from, so it asserted cards that can never appear;
  //    it now supplies a categorised-topics fixture.
  // 3) DiscoverPage.tsx: the 探索主题 block rendered as a titled EMPTY shell
  //    whenever backend topics are loading / unreachable / uncategorised.
  //    Now gated on categoryCards.length > 0 (render-guard only).
  // Test-only + one conditional render guard. No schema / enum / dependency /
  // API / runtime change.
  "frontend/src/components/shell/ProductIntro.test.tsx",
  "frontend/src/pages/DiscoverPage.test.tsx",
  "frontend/src/pages/DiscoverPage.tsx",

  // Wave2-#140b (red-guard cleanup surfaced by the #140 regression run) —
  // Freeze Revision Gate (PO-approved 2026-08-08, "按你推荐的来").
  // 4) P0-1 VIOLATION in shipped source: UnderstandingWorkspace drew the
  //    understanding-path status with circle dingbat glyphs, which the M62.5
  //    symbol guard bans as functional icons (guard was RED). Replaced with
  //    the already-registered 2px-stroke SVG set (check / circle) + aria-label;
  //    m89.css .m89-path-dot switched from text centring to inline-flex.
  // 5) App.smoke.test.tsx contained its entire describe block TWICE (verbatim
  //    copy-paste) and still asserted the pre-M85.11 always-on rails, so it
  //    could never pass. Deduplicated and realigned to the shipped contract.
  // 6) ExplorationShell gains optional defaultWorkspaceOpen /
  //    defaultCompanionOpen INITIAL-state props so the expanded four-area
  //    layout is testable again (repo has no DOM/interaction harness — frozen
  //    deps). Defaults reproduce current behaviour exactly; callers unchanged.
  // No schema / enum / dependency / API-contract / runtime change.
  "frontend/src/pages/m89/UnderstandingWorkspace.tsx",
  "frontend/src/pages/m89/m89.css",
  "frontend/src/__tests__/App.smoke.test.tsx",
  "frontend/src/components/shell/ExplorationShell.tsx",
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
// M73 (PO-approved 2026-07-31) dependency lockdown, enforced against git HEAD:
//   - `dependencies`   MUST be byte-identical to HEAD (no production dep may be
//                      added / removed / version-changed — ever)
//   - `devDependencies` may ONLY add "@playwright/test" (local Alpha e2e infra);
//                      any other new devDep requires a new Freeze Revision Gate.
// Baseline = git HEAD:frontend/package.json. Skipped if HEAD is unavailable
// (fresh clone before first commit).
function checkM73DependencyLockdown(violations, pkg, root) {
  let headPkg = null;
  try {
    headPkg = JSON.parse(
      execSync("git show HEAD:frontend/package.json", {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      })
    );
  } catch {
    return; // no HEAD baseline available — skip lockdown (AI-SDK checks still run)
  }
  const cur = pkg.dependencies || {};
  const base = headPkg.dependencies || {};
  for (const d of Object.keys(cur)) {
    if (base[d] === undefined) {
      violations.push(`DEP: frontend/package.json dependencies must not gain "${d}" (M73 lockdown)`);
    } else if (base[d] !== cur[d]) {
      violations.push(`DEP: frontend/package.json dependencies version change for "${d}" (M73 lockdown)`);
    }
  }
  for (const d of Object.keys(base)) {
    if (cur[d] === undefined) {
      violations.push(`DEP: frontend/package.json dependencies must not remove "${d}" (M73 lockdown)`);
    }
  }
  const curDev = pkg.devDependencies || {};
  const baseDev = headPkg.devDependencies || {};
  for (const d of Object.keys(curDev)) {
    if (baseDev[d] === undefined && d !== "@playwright/test") {
      violations.push(
        `DEP: frontend/package.json devDependencies may only add "@playwright/test" (got "${d}") (M73 lockdown)`
      );
    }
  }
}

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
    checkM73DependencyLockdown(violations, pkg, root);
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
