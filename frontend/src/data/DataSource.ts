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
//   - The synchronous `causalObjectsRaw` below is the BUNDLED dataset and
//     remains the default single source of truth. App.tsx consumes it
//     synchronously (it cannot await a fetch during render), so the bundle is
//     the offline / first-paint fallback and is never removed.
//   - M86.2 (2026-08-18, Freeze Revision Gate): the semantic layer gained a
//     read-only backend surface — GET /api/v1/causal-objects (+ /{id}), mounted
//     on both v1 and legacy in the backend. `fetchCausalObjects()` is the seam
//     that prefers the live backend and degrades to the bundle on any failure
//     (offline, 5xx, malformed payload). Callers that can await use it; the
//     synchronous `causalObjectsRaw` keeps the existing render path untouched.
//     A future phase may promote App.tsx to async hydration — this seam is the
//     single place that changes when that happens.
// ============================================================================

import { API_BASE } from "../config/api";
import { CausalObjectData } from "./causalStatement";
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

/**
 * M86.2 — Read-only CausalObject fetch seam.
 *
 * Prefers the backend `/api/v1/causal-objects` surface and falls back to the
 * bundled `causalObjectsRaw` dataset on any failure (offline, non-2xx, or
 * malformed payload). The backend is additive and read-only; this function
 * never mutates data. Keeping the bundle as the fallback preserves the
 * synchronous first-paint path used by App.tsx.
 */
export async function fetchCausalObjects(): Promise<CausalObjectData[]> {
  try {
    const res = await fetch(`${API_BASE}/causal-objects`);
    if (!res.ok) throw new Error(`causal-objects backend returned HTTP ${res.status}`);
    const body = (await res.json()) as { causal_objects: CausalObjectData[] };
    if (!body || !Array.isArray(body.causal_objects)) {
      throw new Error("causal-objects backend returned a malformed payload");
    }
    return body.causal_objects;
  } catch (err) {
    // Graceful degradation: the bundled dataset is the single source of truth
    // when the backend is unreachable.
    // eslint-disable-next-line no-console
    console.warn(
      "[DataSource] causal-objects backend unavailable, using bundled dataset:",
      err,
    );
    return causalObjectsRaw as CausalObjectData[];
  }
}

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
