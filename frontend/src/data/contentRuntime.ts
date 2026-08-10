// ============================================================
// Content runtime overlay (ADR-0021 R2)
//
// The problem this solves
// -----------------------
// Most editable copy in the product lives in plain data modules that
// are read SYNCHRONOUSLY during render — `guidanceFor(tab)`,
// `ALL_CAPABILITIES`, the exploration-flow steps. Turning each of them
// into an async fetch would ripple through every call site and put a
// loading state in front of text that is already shipped in the bundle.
//
// So instead: each surface KEEPS its compiled-in copy as the value it
// renders (tier ②), and this module holds a tiny in-memory overlay of
// whatever the backend has configured (tier ①). A read is a synchronous
// map lookup with the compiled default as the fallback, so:
//
//   - with no backend, first paint is already the finished page;
//   - nothing here can throw into a render path;
//   - unit tests see the compiled defaults, untouched.
//
// Components that want configured copy to appear without a reload call
// `useContentRevision()`; the first such call primes the overlay once
// per session and re-renders subscribers when it lands.
//
// This module is deliberately NOT a second source of truth for copy: it
// stores only what the backend returned. Defaults stay where they always
// were, next to the component that renders them.
// ============================================================

import { useSyncExternalStore } from 'react'
import { fetchContent, type ContentDocument } from './contentApi'

/** The editable fields, as configured. Absent field = "use the default". */
export interface SlotValues {
  title?: string
  desc?: string
  image?: string | null
  items?: string[]
}

let overrides: Record<string, SlotValues> = {}
let revision = 0
let primed = false

const listeners = new Set<() => void>()

function emit(): void {
  revision += 1
  for (const listener of listeners) listener()
}

/**
 * Adopt a fetched document as the overlay.
 *
 * The admin console calls this after a save so the rest of the SPA reflects
 * the new copy without a reload.
 */
export function applyContentDocument(document: ContentDocument | null): void {
  if (!document || !Array.isArray(document.cards)) return
  const next: Record<string, SlotValues> = {}
  for (const card of document.cards) {
    if (!card || typeof card.id !== 'string') continue
    const values: SlotValues = {}
    if (typeof card.title === 'string' && card.title) values.title = card.title
    if (typeof card.desc === 'string' && card.desc) values.desc = card.desc
    if (card.image === null || typeof card.image === 'string') values.image = card.image
    if (Array.isArray(card.items)) values.items = card.items.filter((i) => typeof i === 'string')
    next[card.id] = values
  }
  overrides = next
  primed = true
  emit()
}

/**
 * Fetch the configured content once per session.
 *
 * Fire-and-forget by design: callers never await it, and a failure simply
 * leaves the compiled defaults in place (ADR-0021 D5).
 */
export function primeContent(): void {
  if (primed) return
  primed = true // claim the slot first so concurrent mounts fetch once
  void fetchContent().then((document) => {
    if (document) applyContentDocument(document)
  })
}

/** Test seam — drops the overlay and lets the next prime run again. */
export function resetContentRuntime(): void {
  overrides = {}
  primed = false
  emit()
}

/** Raw overlay for one slot, or undefined when nothing is configured. */
export function slotValues(slotId: string): SlotValues | undefined {
  return overrides[slotId]
}

/** Configured title, else the compiled-in default. */
export function slotTitle(slotId: string, fallback: string): string {
  return overrides[slotId]?.title ?? fallback
}

/** Configured description, else the compiled-in default. */
export function slotDesc(slotId: string, fallback: string): string {
  return overrides[slotId]?.desc ?? fallback
}

/**
 * Configured bullet list, else the compiled-in default.
 *
 * An explicitly empty list is respected: clearing every bullet in the console
 * is a legitimate edit, not a reason to resurrect the defaults.
 */
export function slotItems<T extends readonly string[]>(slotId: string, fallback: T): readonly string[] {
  const configured = overrides[slotId]?.items
  return configured ?? fallback
}

// --------------------------------------------------------------------------
// React binding
// --------------------------------------------------------------------------
function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  // Priming here (rather than at import time) keeps the network call on the
  // render path of a component that actually shows configurable copy — and
  // keeps it out of unit tests, which never mount through this hook.
  primeContent()
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): number {
  return revision
}

/**
 * Subscribe a component to configured-content updates.
 *
 * Returns an opaque revision counter; the value is meaningless, the re-render
 * is the point. Call it in any component that reads copy through
 * `slotTitle` / `slotDesc` / `slotItems`.
 */
export function useContentRevision(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
