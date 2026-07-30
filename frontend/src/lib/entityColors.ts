// Entity visual identity — Domain Semantic Single Source of Truth (SSOT).
//
// Surface / border / text colors live in the Design System (tokens.css).
// Entity TYPE identity is PRODUCT SEMANTICS and is centralized HERE so that
// Graph, Timeline, Legend, and Map share one definition (M65-A03).
//
// Migrated out of scattered hard-coded hex in GraphViewPanel /
// RelationshipPathGraph / RelationshipInsightPanel.
// Palette is museum-grade dark-theme: warm, distinguishable, and avoids
// purple (#7c3aed) / pink (#db2777) per the P0-2 adjacency guard.

export interface EntityVisual {
  /** Display label (mirrors backend ENTITY_TYPES; i18n handled by callers). */
  label: string
  /** Domain semantic color (museum-grade dark palette). */
  color: string
  // Future extensibility for Legend / Map: icon, glyph, pattern, etc.
}

// The 8 frozen entity types (backend/app/validation.py ENTITY_TYPES).
export const ENTITY_VISUALS: Record<string, EntityVisual> = {
  Event:         { label: 'Event',         color: '#C8553D' },
  Person:        { label: 'Person',        color: '#5B8DB8' },
  Civilization:  { label: 'Civilization',  color: '#CBA135' },
  Location:      { label: 'Location',      color: '#4FA784' },
  'Time Period': { label: 'Time Period',   color: '#E0883B' },
  Technology:    { label: 'Technology',    color: '#3FA7A0' },
  Religion:      { label: 'Religion',      color: '#C77B53' },
  Idea:          { label: 'Idea',          color: '#9A8F7A' },
}

/** Neutral fallback for unknown / future entity types. */
export const ENTITY_FALLBACK_COLOR = '#6B6256'

/** Resolve a domain semantic color for an entity type. */
export function colorFor(type: string): string {
  return ENTITY_VISUALS[type]?.color ?? ENTITY_FALLBACK_COLOR
}
