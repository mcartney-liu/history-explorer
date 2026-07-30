// M65 Phase 3C/3D — useCompanionAI hook
// Thin wrapper around explainAI() that reads CompanionContext state
// (internal reducer + read-only workspace bridge) and provides
// imperative AI call functions to CompanionRouter.
//
// Separates AI runtime logic from routing — CompanionRouter stays
// focused on mode → View mapping.
//
// Phase 3D-1: Chat mode activated — chatMessages + sendChat.
// ChatMessage mirrors HistorianChat's ChatMessage for View compatibility.

import { useRef, useCallback, useState, useEffect } from 'react'
import { useCompanion } from './CompanionContext'
import { explainAI, type AIResponse, type AICitation, type AIEvidence, type AIConfidence, type AIEngine } from '../../data/aiClient'

// ---- Chat types (mirror HistorianChat for View compatibility) ----
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: AICitation[]
  rejected_citations?: AICitation[]
  grounded?: boolean
  engine?: AIEngine
  perspectives?: string[]
  evidence?: AIEvidence[]
  confidence?: AIConfidence
}

export interface UseCompanionAIReturn {
  status: 'idle' | 'loading' | 'success' | 'error'
  response: AIResponse | null
  error: string
  ask: (question: string, mode?: string) => Promise<void>
  clear: () => void
  /** Chat mode messages */
  chatMessages: ChatMessage[]
  /** Send a message in Chat mode */
  sendChat: (question: string) => Promise<void>
  /** Clear chat history */
  clearChat: () => void
}

let chatMsgId = 0
function nextChatId(): string {
  return `chat-${++chatMsgId}-${Date.now()}`
}

export function useCompanionAI(): UseCompanionAIReturn {
  const { state, dispatch, workspace } = useCompanion()
  const controllerRef = useRef<AbortController | null>(null)

  const [response, setResponse] = useState<AIResponse | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  // ---- Entity change detection (Phase 3C-3) ----
  const resetAIContext = useCallback(() => {
    controllerRef.current?.abort()
    setResponse(null)
    setChatMessages([])
    dispatch({ type: 'SET_STATUS', payload: 'idle' })
    dispatch({ type: 'SET_ERROR', payload: '' })
  }, [dispatch])

  useEffect(() => {
    resetAIContext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace.currentEntityId])

  // ---- Shared context builder ----
  const buildContext = useCallback((): string[] => {
    return workspace.contextGlobalIds && workspace.contextGlobalIds.length > 0
      ? workspace.contextGlobalIds
      : workspace.currentEntityId
        ? [workspace.currentEntityId]
        : []
  }, [workspace.currentEntityId, workspace.contextGlobalIds])

  // ---- Explain mode ----
  const ask = useCallback(
    async (question: string, mode?: string) => {
      const trimmed = (question ?? '').trim()
      if (!trimmed) return

      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      dispatch({ type: 'SET_STATUS', payload: 'loading' })
      dispatch({ type: 'SET_ERROR', payload: '' })

      try {
        const res = await explainAI(trimmed, buildContext(), controller.signal, mode ?? 'explain')
        setResponse(res)
        dispatch({ type: 'SET_STATUS', payload: 'success' })
      } catch (e) {
        if (controller.signal.aborted) return
        dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'AI 请求失败' })
      }
    },
    [buildContext, dispatch],
  )

  // ---- Chat mode (Phase 3D-1) ----
  const sendChat = useCallback(
    async (question: string) => {
      const trimmed = (question ?? '').trim()
      if (!trimmed) return

      const userMsg: ChatMessage = { id: nextChatId(), role: 'user', content: trimmed }
      setChatMessages((prev) => [...prev, userMsg])

      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      dispatch({ type: 'SET_STATUS', payload: 'loading' })
      dispatch({ type: 'SET_ERROR', payload: '' })

      try {
        const res = await explainAI(trimmed, buildContext(), controller.signal, 'chat')
        const aiMsg: ChatMessage = {
          id: nextChatId(),
          role: 'assistant',
          content: res.answer,
          citations: res.citations,
          grounded: res.grounded,
          engine: res.engine,
          perspectives: res.perspectives,
          evidence: res.evidence,
          confidence: res.confidence,
        }
        setChatMessages((prev) => [...prev, aiMsg])
        dispatch({ type: 'SET_STATUS', payload: 'success' })
      } catch (e) {
        if (controller.signal.aborted) return
        dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'AI 请求失败' })
      }
    },
    [buildContext, dispatch],
  )

  const clearChat = useCallback(() => {
    setChatMessages([])
  }, [])

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
    chatMessages,
    sendChat,
    clearChat,
  }
}
