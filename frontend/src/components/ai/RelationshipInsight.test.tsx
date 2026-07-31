// @vitest-environment jsdom
// M74-003 (C3-2) — RelationshipInsight (T2) tests.
// Renders the REAL component through LocaleProvider; fetch mocked.
// Covers: correct gid request, answer + evidence + source rendering,
// deterministic badge, and the flag-off zero-request contract.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { LocaleProvider } from '../../data/locale'
import { RelationshipInsight } from './RelationshipInsight'
import type { AIResponse } from '../../data/aiClient'
import { AI_SUGGESTIONS_ENABLED } from '../../data/aiFeatureFlag'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const RESPONSE: AIResponse = {
  answer: '基于知识库证据：Augustus 与罗马帝国的建立密切相关。',
  citations: [],
  rejected_citations: [],
  grounded: true,
  engine: 'deterministic',
  question: '探索建议',
  context_global_ids: ['roman_empire:person-augustus'],
  mode: 'explain',
  evidence: [
    { global_id: 'roman_empire:person-augustus', kind: 'entity', label: 'person-augustus', status: 'verified' },
  ],
  next_exploration: [
    {
      global_id: 'roman_empire:event-roman-empire-established',
      label: 'Roman Empire Established',
      relationship: 'participated_in',
      source_id: 'src-tacitus-ann',
      claim_ids: ['ec-rom-021'],
    },
  ],
}

const mockFetch = vi.fn()

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockResolvedValue({ ok: true, json: async () => RESPONSE })
  vi.stubGlobal('fetch', mockFetch)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.unstubAllGlobals()
})

function renderInsight(gid: string) {
  act(() => {
    root.render(
      <LocaleProvider>
        <RelationshipInsight entityGlobalId={gid} />
      </LocaleProvider>,
    )
  })
}

describe('RelationshipInsight (T2)', () => {
  it('requests with the entity global_id as context', async () => {
    renderInsight('roman_empire:person-augustus')
    await act(async () => {
      await Promise.resolve()
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/ai/explain')
    const body = JSON.parse(init.body as string)
    expect(body.context_global_ids).toEqual(['roman_empire:person-augustus'])
  })

  it('renders answer, evidence and source through TrustDisplay', async () => {
    renderInsight('roman_empire:person-augustus')
    await act(async () => {
      await Promise.resolve()
    })
    const text = container.textContent ?? ''
    expect(text).toContain('基于知识库证据')          // answer prefix + title
    expect(text).toContain('确定性输出')               // deterministic badge
    expect(text).toContain('person-augustus')          // evidence
    expect(text).toContain('src-tacitus-ann')          // source bound
    expect(text).toContain('participated_in')          // relationship from evidence
    expect(text).not.toContain('AI 生成')              // deterministic ≠ AI
  })

  it('renders nothing when the backend is unreachable (no crash)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))
    renderInsight('roman_empire:person-augustus')
    await act(async () => {
      await Promise.resolve()
    })
    expect(container.querySelector('[data-testid="relationship-insight"]')).toBeNull()
  })

  it('flag is OFF by default (parent-mount contract: zero request)', () => {
    // The page mounts `AI_SUGGESTIONS_ENABLED && <RelationshipInsight/>` —
    // OFF means the component never mounts and never fetches.
    expect(AI_SUGGESTIONS_ENABLED).toBe(false)
  })
})
