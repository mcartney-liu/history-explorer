// ============================================================
// M65 Phase 2B — CompanionContext
// Internal context for AI CompanionShell. Provides shared state
// for mode management, conversation history, and entity context.
// Scope: CompanionShell subtree ONLY. Not exposed to App or global.
// Uses React useReducer — zero new dependencies.
//
// M65 Phase 3B: added read-only external workspace context (bridge from
// App/Workspace → Companion). Separate from internal AI reducer state.
// ============================================================

import { createContext, useContext, useReducer, type ReactNode } from 'react'

// ---- Types ----
export type CompanionMode = 'explain' | 'chat' | 'research' | 'discover'

export type CompanionStatus = 'idle' | 'loading' | 'success' | 'error'

export interface CompanionMessage {
  id: string
  role: 'user' | 'ai'
  text: string
  timestamp: number
  mode: CompanionMode
}

export interface CompanionState {
  activeMode: CompanionMode
  status: CompanionStatus
  error: string
  messages: CompanionMessage[]
  currentEntityGlobalId: string | null
  currentEntityName: string | null
}

type CompanionAction =
  | { type: 'SET_MODE'; payload: CompanionMode }
  | { type: 'SET_STATUS'; payload: CompanionStatus }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: CompanionMessage }
  | { type: 'SET_ENTITY_CONTEXT'; payload: { globalId: string | null; name: string | null } }
  | { type: 'CLEAR' }

// ---- Reducer ----
function companionReducer(state: CompanionState, action: CompanionAction): CompanionState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, activeMode: action.payload, error: '' }
    case 'SET_STATUS':
      return { ...state, status: action.payload }
    // A non-empty payload reports a failure and moves status to 'error'.
    // An empty payload only CLEARS the error text and must NOT overwrite
    // status — callers use it to reset the message before entering
    // 'loading' / 'idle', and clobbering status there would surface a
    // phantom error state in the UI.
    case 'SET_ERROR':
      return {
        ...state,
        status: action.payload ? 'error' : state.status,
        error: action.payload,
      }
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] }
    case 'SET_ENTITY_CONTEXT':
      return { ...state, currentEntityGlobalId: action.payload.globalId, currentEntityName: action.payload.name }
    case 'CLEAR':
      return { ...initialState, currentEntityGlobalId: state.currentEntityGlobalId, currentEntityName: state.currentEntityName }
    default:
      return state
  }
}

const initialState: CompanionState = {
  activeMode: 'explain',
  status: 'idle',
  error: '',
  messages: [],
  currentEntityGlobalId: null,
  currentEntityName: null,
}

// ---- External workspace bridge (Phase 3B) ----

/** Read-only workspace context passed from App → CompanionShell → CompanionContext */
export interface WorkspaceContextData {
  /** ID of the entity currently being explored */
  currentEntityId?: string | null
  /** Human-readable name of current entity */
  currentEntityName?: string | null
  /** Entity type (person, event, place, etc.) */
  entityType?: string | null
  /** Multi-entity context for AI calls (main entity + related entities' global_ids) */
  contextGlobalIds?: string[]
  /** Recent exploration history (last N items) */
  recentEntityIds?: string[]
  /** Pinned entity ids */
  pinnedEntityIds?: string[]
  /** Length of the full exploration path */
  explorationPathLength?: number
}

// ---- Context ----
interface CompanionContextValue {
  state: CompanionState
  dispatch: React.Dispatch<CompanionAction>
  /** Read-only workspace context. Supplied by CompanionShell, consumed by AI views. */
  workspace: WorkspaceContextData
}

const CompanionContext = createContext<CompanionContextValue | null>(null)

export function CompanionProvider({ children, workspace }: { children: ReactNode; workspace?: WorkspaceContextData }) {
  const [state, dispatch] = useReducer(companionReducer, initialState)
  const workspaceCtx: WorkspaceContextData = workspace ?? {}
  return (
    <CompanionContext.Provider value={{ state, dispatch, workspace: workspaceCtx }}>
      {children}
    </CompanionContext.Provider>
  )
}

export function useCompanion(): CompanionContextValue {
  const ctx = useContext(CompanionContext)
  if (!ctx) throw new Error('useCompanion must be used within CompanionProvider')
  return ctx
}

export default CompanionContext
