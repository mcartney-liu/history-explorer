// M65-A04 — aiClient real-contract tests (node env, fetch mocked).
// Covers: POST /api/v1/ai/explain, POST /api/v1/ai/chat, payload shape,
// response parsing, error handling, signal pass-through.
// No Chinese-literal assertions — asserts URLs, methods, body, status.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { explainAI, chatAI, type AIResponse } from './aiClient'

const mockFetch = vi.fn()

const SAMPLE: AIResponse = {
  answer: 'Rome was influential.',
  citations: [],
  rejected_citations: [],
  grounded: true,
  engine: 'ai',
  question: 'q',
  context_global_ids: ['e1'],
  mode: 'explain',
}

beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('aiClient', () => {
  it('explainAI POSTs to /api/v1/ai/explain with correct payload', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => SAMPLE })
    const result = await explainAI('q', ['e1'])
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:8000/api/v1/ai/explain')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body as string)).toEqual({
      question: 'q',
      context_global_ids: ['e1'],
      mode: 'explain',
    })
    expect(result).toEqual(SAMPLE)
  })

  it('chatAI POSTs to /api/v1/ai/chat with correct payload', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => SAMPLE })
    const result = await chatAI('q', ['e1'])
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:8000/api/v1/ai/chat')
    expect(JSON.parse(init.body as string)).toEqual({
      question: 'q',
      context_global_ids: ['e1'],
      mode: 'explain',
    })
    expect(result).toEqual(SAMPLE)
  })

  it('passes the prompt mode through to the request body', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => SAMPLE })
    await explainAI('q', ['e1'], undefined, 'why_important')
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string).mode).toBe('why_important')
  })

  it('passes the abort signal through to fetch', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => SAMPLE })
    const ac = new AbortController()
    await explainAI('q', ['e1'], ac.signal)
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(init.signal).toBe(ac.signal)
  })

  it('throws on a non-ok response, surfacing the status code', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    await expect(explainAI('q', ['e1'])).rejects.toThrow('AI request failed (500)')
  })

  it('returns the parsed JSON body on success', async () => {
    const custom: AIResponse = {
      ...SAMPLE,
      answer: 'custom answer',
      engine: 'deterministic',
      grounded: false,
    }
    mockFetch.mockResolvedValue({ ok: true, json: async () => custom })
    const res = await explainAI('q', ['e1'])
    expect(res.answer).toBe('custom answer')
    expect(res.engine).toBe('deterministic')
    expect(res.grounded).toBe(false)
  })
})
