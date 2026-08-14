// ============================================================================
// DataSource — SINGLE SOURCE OF TRUTH for all static package / reference data.
// ----------------------------------------------------------------------------
// P1-⑤ (Engineering Health, 2026-08-14, PO-approved): unify the previously
// scattered `import ... from "../../../data/*.json"` calls (explorationPackages.ts
// had 13, App.tsx had 1) into one module. Consumers MUST import from here,
// never from the JSON files directly — this is what keeps the loading strategy
// in exactly one place.
//
// Loading strategy (one place to change):
//   - Today: local JSON import. This is the ONLY source, because exploration
//     packages have NO backend API in the frozen baseline (see Product_Constitution
//     freeze red lines: no new backend routes/endpoints without a Freeze Revision
//     Gate). Do NOT add backend endpoints from this file.
//   - Future: if/when a backend serves packages, swap the import for a remote
//     fetch here. Consumers do NOT change. The remote base would be API_BASE
//     (see ../config/api) — kept as a comment, not a dead-code fetch call, so we
//     don't imply a backend that doesn't exist yet.
// ============================================================================

import registry from "../../../data/exploration_packages.json";
import exampleRaw from "../../../data/examples/china_civilization_v1_example.json";
import silkRoadRaw from "../../../data/examples/silk_road_example.json";
import romanEmpireRaw from "../../../data/examples/roman_empire_example.json";
import ancientIndiaRaw from "../../../data/examples/ancient_india_example.json";
import earlyChristianityRaw from "../../../data/examples/early_christianity_example.json";
import egyptTechRaw from "../../../data/examples/egypt_technology_religion_example.json";
import greekPhilosophyRaw from "../../../data/examples/greek_philosophy_example.json";
import hellenisticRaw from "../../../data/examples/hellenistic_world_example.json";
import persianEmpireRaw from "../../../data/examples/persian_empire_example.json";
import textbookRaw from "../../../data/examples/textbook_cn_history_v1_example.json";
import evidenceClaimsRaw from "../../../data/evidence_claims.json";
import sourcesRaw from "../../../data/sources.json";
import causalObjectsRaw from "../../../data/causal_objects.json";

export {
  registry,
  exampleRaw,
  silkRoadRaw,
  romanEmpireRaw,
  ancientIndiaRaw,
  earlyChristianityRaw,
  egyptTechRaw,
  greekPhilosophyRaw,
  hellenisticRaw,
  persianEmpireRaw,
  textbookRaw,
  evidenceClaimsRaw,
  sourcesRaw,
  causalObjectsRaw,
};
