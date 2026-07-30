// ============================================================
// M65 Phase 2B — CompanionContext
// Internal context for AI CompanionShell. Provides shared state
// for mode management, conversation history, and entity context.
// Scope: CompanionShell subtree ONLY. Not exposed to App or global.
// Uses React useReducer — zero new dependencies.
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
    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.payload }
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

// ---- Context ----
interface CompanionContextValue {
  state: CompanionState
  dispatch: React.Dispatch<CompanionAction>
}

const CompanionContext = createContext<CompanionContextValue | null>(null)

export function CompanionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(companionReducer, initialState)
  return (
    <CompanionContext.Provider value={{ state, dispatch }}>
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
