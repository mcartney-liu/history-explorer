// ============================================================
// Site Configuration runtime overlay (ADR-0021 sibling)
//
// Mirrors the content runtime's contract: surfaces keep their compiled-in
// defaults (tier ②) and this module holds a tiny in-memory overlay of
// whatever the backend configured (tier ①). A read is a synchronous map
// lookup with the compiled default as the fallback, so:
//
//   - with no backend, first paint is already the finished page;
//   - nothing here can throw into a render path;
//   - unit tests see the compiled defaults, untouched.
//
// Components that want configured switches to appear without a reload call
// `useSiteConfigRevision()`; the first such call primes the overlay once per
// session and re-renders subscribers when it lands.
// ============================================================

import { useSyncExternalStore } from 'react'
import {
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_STARTERS,
  DEFAULT_TOPIC_ORDERING,
  fetchSiteConfig,
  type SiteConfigDocument,
} from './siteConfigApi'

let doc: SiteConfigDocument | null = null
let revision = 0
let primed = false

const listeners = new Set<() => void>()

function emit(): void {
  revision += 1
  for (const listener of listeners) listener()
}

/**
 * Adopt a fetched document as the overlay. The admin console calls this after
 * a save so the rest of the SPA reflects the new switches without a reload.
 */
export function applySiteConfig(document: SiteConfigDocument | null): void {
  if (!document || typeof document !== 'object') return
  doc = document
  primed = true
  emit()
}

/**
 * Fetch the configured switches once per session.
 *
 * Fire-and-forget by design: callers never await it, and a failure simply
 * leaves the compiled defaults in place.
 */
export function primeSiteConfig(): void {
  if (primed) return
  primed = true // claim the slot first so concurrent mounts fetch once
  void fetchSiteConfig().then((document) => {
    if (document) applySiteConfig(document)
  })
}

/** Test seam — drops the overlay and lets the next prime run again. */
export function resetSiteConfigRuntime(): void {
  doc = null
  primed = false
  emit()
}

/** Whether a feature flag is on. Falls back to the compiled default. */
export function flagEnabled(flagId: string, fallback?: boolean): boolean {
  if (doc && doc.feature_flags && flagId in doc.feature_flags) {
    return doc.feature_flags[flagId]
  }
  if (fallback !== undefined) return fallback
  return DEFAULT_FEATURE_FLAGS[flagId] ?? false
}

/** Ordered topic slugs for the landing "featured" strip (tier ① else tier ②). */
export function topicOrdering(): string[] {
  return doc?.topic_ordering ?? [...DEFAULT_TOPIC_ORDERING]
}

/** Alias used by the landing page: the curated, order-preserving featured set. */
export function featuredSlugs(): string[] {
  return topicOrdering()
}

/** Whether an entity-page section is visible (tier ① else compiled default). */
export function entitySectionVisible(id: string, fallback = true): boolean {
  if (doc) {
    const section = doc.entity_sections.find((s) => s.id === id)
    if (section) return section.visible
  }
  return fallback
}

/** Entity-page section ids in configured order (falls back to registry order). */
export function entitySectionOrder(): string[] {
  return doc?.entity_sections.map((s) => s.id) ?? []
}

/** Suggested exploration starters (tier ① else compiled default). */
export function explorationStarters(): string[] {
  return doc?.exploration_starters ?? [...DEFAULT_STARTERS]
}

// --------------------------------------------------------------------------
// React binding
// --------------------------------------------------------------------------
function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  // Priming here (rather than at import time) keeps the network call on the
  // render path of a component that actually reads a switch.
  primeSiteConfig()
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): number {
  return revision
}

/**
 * Subscribe a component to configured-switch updates.
 *
 * Returns an opaque revision counter; the value is meaningless, the re-render
 * is the point. Call it in any component that reads through `flagEnabled` /
 * `featuredSlugs` / `entitySectionVisible` / `explorationStarters`.
 */
export function useSiteConfigRevision(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
