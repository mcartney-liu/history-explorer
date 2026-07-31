import registry from "../../../data/exploration_packages.json";
import exampleRaw from "../../../data/examples/china_civilization_v1_example.json";
import evidenceClaimsRaw from "../../../data/evidence_claims.json";
import sourcesRaw from "../../../data/sources.json";

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
  title: LocalizedText;
  summary: LocalizedText;
  seed_topic: string;
  exploration_goals: LocalizedText;
  entity_references: string[];
  relationship_paths: RelationshipPathRef[];
  timeline_slices: { entity: string }[];
  source_references: string[];
  recommended_next_exploration: NextExplorationPointer[];
}

interface PackageRegistry {
  packages: ExplorationPackage[];
}

const example = exampleRaw as any;
const evidenceClaims = evidenceClaimsRaw as any[];
const sources = sourcesRaw as any[];
const registryData = registry as PackageRegistry;

export function getPackages(): ExplorationPackage[] {
  return registryData.packages;
}

export function getPackageBySlug(slug: string): ExplorationPackage | undefined {
  return registryData.packages.find((p) => p.slug === slug);
}

function globalToLocal(globalId: string): string | null {
  const found = (example.entities as any[]).find((e: any) => e.global_id === globalId);
  return found ? found.id : null;
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
  const entIds = new Set((example.entities as any[]).map((e: any) => e.global_id));
  const relSet = new Set(
    (example.relationships as any[]).map((r: any) => `${r.source}->${r.target}:${r.type}`)
  );
  const evIds = new Set((evidenceClaims as any[]).map((c: any) => c.id));
  const srcIds = new Set((sources as any[]).map((s: any) => s.id));

  // PO adjustment A: M69 runtime only supports type=official.
  if (pkg.type !== "official") {
    errors.push(`package ${pkg.slug}: type must be 'official' in M69 (got '${pkg.type}')`);
  }

  for (const ref of pkg.entity_references) {
    if (!entIds.has(ref)) errors.push(`package ${pkg.slug}: entity_reference '${ref}' not in Knowledge Graph`);
  }
  for (const slice of pkg.timeline_slices) {
    if (!entIds.has(slice.entity)) errors.push(`package ${pkg.slug}: timeline_slice '${slice.entity}' not in Knowledge Graph`);
  }
  for (const path of pkg.relationship_paths) {
    const fromLocal = globalToLocal(path.from);
    const toLocal = globalToLocal(path.to);
    if (fromLocal == null || toLocal == null) {
      errors.push(`package ${pkg.slug}: relationship_path endpoint unresolved ('${path.from}'/'${path.to}')`);
      continue;
    }
    if (!relSet.has(`${fromLocal}->${toLocal}:${path.type}`)) {
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
      if (!entIds.has(rec.ref)) errors.push(`package ${pkg.slug}: recommended_next ref '${rec.ref}' not in Knowledge Graph`);
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
  const found = (example.entities as any[]).find((e: any) => e.global_id === globalId)
  return found ?? null
}

export function getEntityDisplayName(globalId: string, locale: Locale = 'zh'): string {
  const e = getEntityByGlobalId(globalId)
  if (!e) return globalId
  if (locale !== 'zh' && e.labels && e.labels[locale]) return e.labels[locale] as string
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
