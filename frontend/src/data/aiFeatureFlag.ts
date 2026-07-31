// M74-003 (C3-2): AI Exploration Suggestions feature flag.
// Build-time flag (Vite env). Default OFF so M73 behaviour is byte-identical
// until an operator explicitly enables the AI exploration touchpoints.
// Consumption rule (PO): the PARENT renders `AI_SUGGESTIONS_ENABLED && <Cmp/>`
// so a disabled component never mounts and its effect never runs (zero
// requests, zero DOM).
export const AI_SUGGESTIONS_ENABLED: boolean =
  import.meta.env.VITE_AI_SUGGESTIONS_ENABLED === 'true'
