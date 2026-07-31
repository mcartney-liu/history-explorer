// @future M69 — User / Community Exploration Package layer.
//
// M69 SCOPE: contract reservation ONLY. This file defines the shape of a
// user-created or community-featured package but implements NO logic:
//   - no localStorage persistence
//   - no generation / AI orchestration
//   - no cloud sync / auth
//
// A future User/Community Package is a LOCAL OVERRIDE LAYER that references the
// same ExplorationPackage contract via global_id / source_id pointers. Users
// create exploration paths, narratives, and learning perspectives — NEVER new
// historical facts. All references must resolve to the frozen Knowledge Graph.

import type {
  PackageType,
  PackageVisibility,
  PackageStatus,
  LocalizedText,
  RecommendationKind,
} from "./explorationPackages";

export interface UserPackagePointer {
  kind: RecommendationKind;
  ref: string; // global_id or package slug
}

export interface UserPackage {
  slug: string;
  type: PackageType; // future: "user" | "community"
  visibility: PackageVisibility;
  status: PackageStatus;
  title: LocalizedText;
  summary: LocalizedText;
  created_by?: string; // future user id (no auth in M69)
  references: UserPackagePointer[];
  annotations?: string;
}
