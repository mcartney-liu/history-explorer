/**
 * M89.2.9 — Understanding Workspace State
 *
 * Experience Projection（体验投影层）。
 * 不是新的 Runtime 状态——是把系统能力翻译成人能理解的状态。
 * 不反向影响 Runtime，避免循环依赖。
 */

// ============================================================================
// UnderstandingWorkspaceState
// ============================================================================

export interface EvidenceTransition {
  before: string
  after: string
  dimensionAdded: string
}

export interface EvidenceMaterials {
  text: string
  facts: string[]
}

export interface EvidenceProvenance {
  entities: string[]
  relations: string[]
}

export interface CurrentEvidence {
  id: string
  questionAnswered: string
  understandingGap: string
  materials: EvidenceMaterials
  provenance: EvidenceProvenance
  transition: EvidenceTransition
}

export interface PathNode {
  dimension: string
  completed: boolean
}

export interface PathConnection {
  from: string
  to: string
  reason: string
}

export interface UnderstandingPath {
  nodes: PathNode[]
  connections: PathConnection[]
  currentNodeIndex: number
  totalNodes: number
}

export interface NextAction {
  reason: string
  hook: string
  targetEvidenceId: string
}

export interface Reflection {
  observedChange: string
  newQuestion: string
}

export type WorkspacePhase = 'orientation' | 'exploring' | 'closure'

export interface UnderstandingWorkspaceState {
  question: string
  startingBelief: string
  currentEvidence: CurrentEvidence | null
  understandingPath: UnderstandingPath
  nextAction: NextAction | null
  reflection: Reflection | null
  phase: WorkspacePhase
}
