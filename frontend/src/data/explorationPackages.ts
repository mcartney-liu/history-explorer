// P1-⑤: all package/reference JSON imports live in ./DataSource (single source
// of truth). Import the raw values from there instead of the JSON files.
import {
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
} from "./DataSource";

// ============================================================================
// M69 — Exploration Package Layer (core product object)
// ----------------------------------------------------------------------------
// An Exploration Package is a CURATED VIEW over the frozen Knowledge Graph.
// It owns no facts: every field is either curated copy (title/summary/goals)
// or a pointer (global_id / source_id) into the graph. This is what keeps the
// experience "graph-grounded, no hallucination".
//
// PO adjustment A (2026-07-31): `type/visibility/status` are reserved for the
// future User / Community layers, but M69 RUNTIME only supports type=official.
// `status` and `visibility` are stored, never branched on by M69 logic.
// PO adjustment B (2026-07-31): `recommended_next_exploration` uses STABLE ID
// POINTERS (global_id or package slug); display text is a hint only and the
// runtime must resolve via `ref`, never rely on the label.
// ============================================================================

export type PackageType = "official" | "user" | "community";
export type PackageVisibility = "private" | "public";
export type PackageStatus = "draft" | "reviewed" | "featured";

// P5-S4 — Placement: which home tab renders this package.
//   "understand" → 了解 tab（浏览主题库）
//   "research"   → 研究 tab（提问式探索）
// Defaults to "understand" when absent so legacy data stays on the 了解 tab.
export type PackagePlacement = "understand" | "research";

export interface LocalizedText {
  zh: string;
  en: string;
  ja?: string;
}

export interface RelationshipPathRef {
  from: string; // global_id
  to: string; // global_id
  type: string; // one of the 18 frozen relationship types
  evidence?: string[]; // ec-* ids
}

export type RecommendationKind = "entity" | "relationship" | "package" | "timeline_slice";

export interface NextExplorationPointer {
  kind: RecommendationKind;
  ref: string; // stable ID: global_id (entity/relationship/timeline) or package slug
  label?: LocalizedText; // display-only hint; runtime resolves via `ref`
}

export interface ExplorationPackage {
  slug: string;
  type: PackageType;
  visibility: PackageVisibility;
  status: PackageStatus;
  category?: string;
  /** P5-S4: home tab placement. Optional — defaults to "understand". */
  placement?: PackagePlacement;
  title: LocalizedText;
  summary: LocalizedText;
  seed_topic: string;
  /** M86.2 — the curator-authored "why" question shown in the Question Header
   *  (C1 Curiosity Entry / EO-001). A real interrogative sentence, NOT a topic
   *  pointer. Falls back to `title` when absent. */
  question?: LocalizedText;
  exploration_goals: LocalizedText;
  entity_references: string[];
  relationship_paths: RelationshipPathRef[];
  timeline_slices: { entity: string }[];
  source_references: string[];
  recommended_next_exploration: NextExplorationPointer[];
  // M73 Phase1 — @future M77 Creator Ecosystem compatibility reservation.
  // OPTIONAL reserved-only fields: no UI, no business logic, no validation
  // depends on them today; they exist so Official / User / Community packages
  // can later carry ownership + versioning without a schema break.
  owner?: string;
  version?: string;
  sourcePackage?: string;
}

interface PackageRegistry {
  packages: ExplorationPackage[];
}

const example = exampleRaw as any;
const evidenceClaims = evidenceClaimsRaw as any[];
const sources = sourcesRaw as any[];
const registryData = registry as PackageRegistry;

// M70 — cross-dataset Knowledge Graph index. An Exploration Package may
// reference entities from ANY frozen example dataset (china / silk_road /
// roman_empire), and relationship paths may even cross datasets (e.g.
// silk_road:silk_road -> roman_empire:civ-roman : traded_with). The index maps
// every global_id to its owning dataset + local id so validation resolves
// endpoints regardless of which dataset a Package is curated over. Pure index
// build — no schema / contract change.
const DATASETS = [
  { id: "china_civilization_v1", data: example },
  { id: "silk_road", data: silkRoadRaw },
  { id: "roman_empire", data: romanEmpireRaw },
  { id: "ancient_india", data: ancientIndiaRaw },
  { id: "early_christianity", data: earlyChristianityRaw },
  { id: "egypt_technology_religion", data: egyptTechRaw },
  { id: "greek_philosophy", data: greekPhilosophyRaw },
  { id: "hellenistic_world", data: hellenisticRaw },
  { id: "persian_empire", data: persianEmpireRaw },
  { id: "textbook_cn_history_v1", data: textbookRaw },
] as const;

const GLOBAL_INDEX = new Map<string, { dataset: string; localId: string }>();
for (const ds of DATASETS) {
  for (const e of (ds.data as any).entities ?? []) {
    if (e.global_id) GLOBAL_INDEX.set(e.global_id, { dataset: ds.id, localId: e.id });
  }
}

export function getPackages(): ExplorationPackage[] {
  return registryData.packages;
}

// P5-S4 — placement-driven filtering. Every package carries a placement;
// callers that render a specific home tab must use this instead of getPackages()
// so new data with a placement lands in the right tab automatically.
export function getPackagesByPlacement(placement: PackagePlacement): ExplorationPackage[] {
  return registryData.packages.filter((p) => (p.placement ?? "understand") === placement);
}

export function getPackageBySlug(slug: string): ExplorationPackage | undefined {
  return registryData.packages.find((p) => p.slug === slug);
}

// M86.2 — topic-click (Search/Catalog/CrossTopic) must reuse the SAME curator
// question/goal as the package path, so Curiosity Entry is identical regardless
// of entry point. Packages key their topic by `seed_topic` (== topic slug), not
// by `slug` (which is the package's own id), so match on seed_topic.
export function getPackageByTopic(topic: string): ExplorationPackage | undefined {
  return registryData.packages.find((p) => p.seed_topic === topic);
}

function globalToLocal(globalId: string): string | null {
  return GLOBAL_INDEX.get(globalId)?.localId ?? null;
}

// True iff a real frozen edge exists between the two global_ids. Edges may be
// written in ANY indexed dataset's relationships[], and cross-dataset edges use
// global_id endpoints while intra-dataset edges use local ids — so the search
// scans every dataset and accepts both id forms for source and target.
function hasRealEdge(fromGid: string, toGid: string, type: string): boolean {
  const fromLocal = globalToLocal(fromGid);
  const toLocal = globalToLocal(toGid);
  if (!fromLocal || !toLocal) return false;
  return DATASETS.some((ds) =>
    (ds.data as any).relationships.some(
      (r: any) =>
        (r.source === fromLocal || r.source === fromGid) &&
        (r.target === toLocal || r.target === toGid) &&
        r.type === type,
    ),
  );
}

export interface ValidationReport {
  ok: boolean;
  errors: string[];
}

// Graph-grounded validator: proves every Package reference resolves to the
// frozen Knowledge Graph / sources / evidence. Used by tests and future
// runtime guards. Zero tolerance for dangling pointers (no hallucination).
export function validatePackage(pkg: ExplorationPackage): ValidationReport {
  const errors: string[] = [];
  const evIds = new Set((evidenceClaims as any[]).map((c: any) => c.id));
  const srcIds = new Set((sources as any[]).map((s: any) => s.id));

  // PO adjustment A: M69 runtime only supports type=official.
  if (pkg.type !== "official") {
    errors.push(`package ${pkg.slug}: type must be 'official' in M69 (got '${pkg.type}')`);
  }

  for (const ref of pkg.entity_references) {
    if (!GLOBAL_INDEX.has(ref)) errors.push(`package ${pkg.slug}: entity_reference '${ref}' not in Knowledge Graph`);
  }
  for (const slice of pkg.timeline_slices) {
    if (!GLOBAL_INDEX.has(slice.entity)) errors.push(`package ${pkg.slug}: timeline_slice '${slice.entity}' not in Knowledge Graph`);
  }
  for (const path of pkg.relationship_paths) {
    const fromLocal = globalToLocal(path.from);
    const toLocal = globalToLocal(path.to);
    if (fromLocal == null || toLocal == null) {
      errors.push(`package ${pkg.slug}: relationship_path endpoint unresolved ('${path.from}'/'${path.to}')`);
      continue;
    }
    if (!hasRealEdge(path.from, path.to, path.type)) {
      errors.push(`package ${pkg.slug}: relationship_path ${path.from}->${path.to}:${path.type} is not a real edge`);
    }
    for (const ev of path.evidence ?? []) {
      if (!evIds.has(ev)) errors.push(`package ${pkg.slug}: evidence '${ev}' not in evidence_claims.json`);
    }
  }
  for (const src of pkg.source_references) {
    if (!srcIds.has(src)) errors.push(`package ${pkg.slug}: source_reference '${src}' not in sources.json`);
  }
  // PO adjustment B: recommended_next must be stable ID pointers.
  // entity / timeline_slice refs must resolve to the Knowledge Graph.
  for (const rec of pkg.recommended_next_exploration) {
    if (rec.kind === "entity" || rec.kind === "timeline_slice") {
      if (!GLOBAL_INDEX.has(rec.ref)) errors.push(`package ${pkg.slug}: recommended_next ref '${rec.ref}' not in Knowledge Graph`);
    }
    // package-kind refs are forward pointers (may not exist yet); allowed.
  }
  return { ok: errors.length === 0, errors };
}

export function validateAllPackages(): ValidationReport {
  const all = getPackages().flatMap((p) => validatePackage(p).errors);
  return { ok: all.length === 0, errors: all };
}

// ============================================================================
// M69 — Presentational helpers (read-only over the frozen Knowledge Graph).
// These resolve Package pointers (global_id / source_id / evidence_id) to the
// real entities / sources / evidence so the UI can render a graph-grounded
// journey with NO backend call and NO fabricated facts. All data comes from the
// already-loaded example / evidence_claims / sources JSON.
// ============================================================================

export type Locale = 'zh' | 'en' | 'ja'

export function getEntityByGlobalId(globalId: string): any | null {
  const idx = GLOBAL_INDEX.get(globalId);
  if (!idx) return null;
  const ds = DATASETS.find((d) => d.id === idx.dataset);
  if (!ds) return null;
  return (ds.data as any).entities.find((e: any) => e.id === idx.localId) ?? null;
}

export function getEntityDisplayName(globalId: string, locale: Locale = 'zh'): string {
  const e = getEntityByGlobalId(globalId)
  if (!e) return globalId
  // M73 Phase2-A: localized labels win for any locale (zh/en/ja); falls back to
  // the data-level `name` when that locale has no label. Previously zh always
  // returned `name`, so roman/silk/india entities stayed English in the zh UI.
  if (e.labels && e.labels[locale]) return e.labels[locale] as string
  return (e.name as string) || globalId
}

export function getEntityType(globalId: string): string {
  return getEntityByGlobalId(globalId)?.type ?? ''
}

export function getEntityStartYear(globalId: string): number | null {
  const d = getEntityByGlobalId(globalId)?.start_date
  return typeof d?.value === 'number' ? d.value : null
}

export function getEvidenceClaim(id: string): any | null {
  return (evidenceClaims as any[]).find((c: any) => c.id === id) ?? null
}

export function getSource(id: string): any | null {
  return (sources as any[]).find((s: any) => s.id === id) ?? null
}

export interface PackageSourceRef {
  id: string
  title: string
  tier: string
  creator?: string
  year?: number
}

export interface PackageEvidenceRef {
  claimId: string
  claim: string
  confidence?: string
  sources: PackageSourceRef[]
}

// Resolve a list of evidence ids to { claim + resolved sources } for the
// Source Chain. Degrades gracefully (unknown source → id shown) so the view
// never throws on a dangling id (validatePackage already guards this anyway).
export function getEvidenceWithSources(evidenceIds: string[]): PackageEvidenceRef[] {
  return evidenceIds.map((id) => {
    const c = getEvidenceClaim(id)
    const srcIds: string[] = c ? (c.source_ids ?? (c.source_id ? [c.source_id] : [])) : []
    const resolved: PackageSourceRef[] = srcIds.map((sid: string) => {
      const s = getSource(sid)
      return s
        ? { id: s.id, title: s.title, tier: s.tier, creator: s.creator, year: s.year }
        : { id: sid, title: sid, tier: '' }
    })
    return {
      claimId: id,
      claim: c?.claim ?? '',
      confidence: c?.confidence,
      sources: resolved,
    }
  })
}
