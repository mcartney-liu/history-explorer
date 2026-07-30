// @vitest-environment jsdom
// M65-A04 — useCompanionAI real hook-chain tests.
// Mocks the aiClient data layer but drives the REAL hook through a render
// harness, covering: ask success, ask error, loading state, entity-change
// reset, and chat send. No Chinese-literal assertions — asserts status,
// response shape, error, and chat message roles.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { CompanionProvider, type WorkspaceContextData } from './CompanionContext'
import { useCompanionAI, type UseCompanionAIReturn, type ChatMessage } from './useCompanionAI'
import { explainAI, type AIResponse } from '../../data/aiClient'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../data/aiClient')
const mockedExplainAI = vi.mocked(explainAI)

function makeResponse(answer: string, mode = 'explain'): AIResponse {
  return {
    answer,
    citations: [],
    rejected_citations: [],
    grounded: true,
    engine: 'ai',
    question: 'q',
    context_global_ids: ['e1'],
    mode,
  }
}

const ref: { current: UseCompanionAIReturn | null } = { current: null }
function Harness() {
  ref.current = useCompanionAI()
  return null
}

function makeRoot(): { container: HTMLDivElement; root: Root } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  return { container, root }
}

function render(root: Root, ws?: WorkspaceContextData) {
  act(() => {
    root.render(
      <CompanionProvider workspace={ws}>
        <Harness />
      </CompanionProvider>,
    )
  })
}

beforeEach(() => {
  mockedExplainAI.mockReset()
  ref.current = null
})

describe('useCompanionAI (real hook chain)', () => {
  it('ask success populates response and sets status to success', async () => {
    mockedExplainAI.mockResolvedValue(makeResponse('Rome was pivotal.'))
    const { root, container } = makeRoot()
    render(root, { currentEntityId: 'e1' })

    await act(async () => {
      await ref.current!.ask('Why is Rome important?')
    })

    expect(ref.current!.status).toBe('success')
    expect(ref.current!.response?.answer).toBe('Rome was pivotal.')
    expect(ref.current!.error).toBe('')
    root.unmount()
    container.remove()
  })

  it('ask error sets status to error and records the message', async () => {
    mockedExplainAI.mockRejectedValue(new Error('AI request failed (500)'))
    const { root, container } = makeRoot()
    render(root, { currentEntityId: 'e1' })

    await act(async () => {
      await ref.current!.ask('Why is Rome important?')
    })

    expect(ref.current!.status).toBe('error')
    expect(ref.current!.error).toContain('AI request failed (500)')
    expect(ref.current!.response).toBeNull()
    root.unmount()
    container.remove()
  })

  it('reflects loading status while the request is in flight', async () => {
    let resolve: (v: AIResponse) => void = () => {}
    mockedExplainAI.mockImplementation(() => new Promise<AIResponse>((r) => { resolve = r }))
    const { root, container } = makeRoot()
    render(root, { currentEntityId: 'e1' })

    act(() => {
      void ref.current!.ask('Why is Rome important?')
    })
    expect(ref.current!.status).toBe('loading')

    await act(async () => {
      resolve(makeResponse('Done.'))
    })
    expect(ref.current!.status).toBe('success')
    root.unmount()
    container.remove()
  })

  it('resets response and status when the explored entity changes', async () => {
    mockedExplainAI.mockResolvedValue(makeResponse('Rome context.'))
    const { root, container } = makeRoot()
    render(root, { currentEntityId: 'e1' })

    await act(async () => {
      await ref.current!.ask('Tell me about Rome')
    })
    expect(ref.current!.response).not.toBeNull()
    expect(ref.current!.status).toBe('success')

    render(root, { currentEntityId: 'e2' })
    await act(async () => {})

    expect(ref.current!.response).toBeNull()
    expect(ref.current!.status).toBe('idle')
    expect(ref.current!.error).toBe('')
    root.unmount()
    container.remove()
  })

  it('sendChat appends user and assistant messages and succeeds', async () => {
    mockedExplainAI.mockResolvedValue(makeResponse('Chat reply.', 'chat'))
    const { root, container } = makeRoot()
    render(root, { currentEntityId: 'e1' })

    await act(async () => {
      await ref.current!.sendChat('Hello companion')
    })

    const msgs: ChatMessage[] = ref.current!.chatMessages
    expect(msgs).toHaveLength(2)
    expect(msgs[0].role).toBe('user')
    expect(msgs[0].content).toBe('Hello companion')
    expect(msgs[1].role).toBe('assistant')
    expect(msgs[1].content).toBe('Chat reply.')
    expect(ref.current!.status).toBe('success')
    root.unmount()
    container.remove()
  })
})
