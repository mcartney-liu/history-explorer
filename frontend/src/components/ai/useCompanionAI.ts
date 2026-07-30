// M65 Phase 3C — useCompanionAI hook
// Thin wrapper around explainAI() that reads CompanionContext state
// (internal reducer + read-only workspace bridge) and provides
// imperative AI call functions to CompanionRouter.
//
// Separates AI runtime logic from routing — CompanionRouter stays
// focused on mode → View mapping.

import { useRef, useCallback, useState } from 'react'
import { useCompanion } from './CompanionContext'
import { explainAI, type AIResponse } from '../../data/aiClient'

export interface UseCompanionAIReturn {
  /** Current status across all modes */
  status: 'idle' | 'loading' | 'success' | 'error'
  /** Last response (Explain mode) */
  response: AIResponse | null
  /** Last error message */
  error: string
  /** Ask the AI a question (Explain / Chat mode) */
  ask: (question: string, mode?: string) => Promise<void>
  /** Reset to idle */
  clear: () => void
}

export function useCompanionAI(): UseCompanionAIReturn {
  const { state, dispatch, workspace } = useCompanion()
  const controllerRef = useRef<AbortController | null>(null)

  const [response, setResponse] = useState<AIResponse | null>(null)

  const ask = useCallback(
    async (question: string, mode?: string) => {
      const trimmed = (question ?? '').trim()
      if (!trimmed) return

      // Build context from workspace bridge (read-only).
      // Priority: multi-entity contextGlobalIds > single currentEntityId > empty
      const contextGlobalIds: string[] =
        workspace.contextGlobalIds && workspace.contextGlobalIds.length > 0
          ? workspace.contextGlobalIds
          : workspace.currentEntityId
            ? [workspace.currentEntityId]
            : []

      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      dispatch({ type: 'SET_STATUS', payload: 'loading' })
      dispatch({ type: 'SET_ERROR', payload: '' })

      try {
        const res = await explainAI(
          trimmed,
          contextGlobalIds,
          controller.signal,
          mode ?? 'explain',
        )
        setResponse(res)
        dispatch({ type: 'SET_STATUS', payload: 'success' })
      } catch (e) {
        if (controller.signal.aborted) return
        const msg = e instanceof Error ? e.message : 'AI 请求失败'
        dispatch({ type: 'SET_ERROR', payload: msg })
      }
    },
    [workspace.currentEntityId, dispatch],
  )

  const clear = useCallback(() => {
    controllerRef.current?.abort()
    dispatch({ type: 'CLEAR' })
  }, [dispatch])

  return {
    status: state.status,
    response,
    error: state.error,
    ask,
    clear,
  }
}
