// ============================================================
// M90.3 Stage D — Explorer Primitives barrel
//
// All Explorer Primitives export from here. These are the
// M90-mandated 10 primitives that replace the 26 Panels.
//
// Implemented so far (D-1):
//   EvidenceBlock      — unified evidence display
//   UnderstandingCard  — Before→Evidence→After transition
//
// TODO (D-2+):
//   RelationshipView   — semantic relationship (with Curator note)
//   TimelineView       — time-based view
//   MapView            — spatial view (future GIS, J-1)
//   EntityReference    — inline entity mention
//   NavigationAction   — From/Why/Value jump card
// ============================================================

export { EvidenceBlock, type EvidenceBlockProps, type EvidenceType } from './EvidenceBlock'
export { UnderstandingCard, type UnderstandingCardProps, type TransitionDirection } from './UnderstandingCard'
