// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { LocaleProvider } from '../data/locale'
import HistorianChat, { HistorianChatView, type ChatMessage } from './HistorianChat'
import { explainAI } from '../data/aiClient'
import type { AINextExploration, AIResponse } from '../data/aiClient'

// localStorage polyfill for event storage
vi.mock('../data/aiClient', () => ({ explainAI: vi.fn() }))
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const store = new Map<string, string>()
beforeAll(() => {
  const mock: Storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
    get length() { return store.size },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  }
  if (!('localStorage' in globalThis)) {
    Object.defineProperty(globalThis, 'localStorage', { value: mock, writable: true })
  }
})

beforeEach(() => {
  localStorage.clear()
})

describe('HistorianChatView', () => {
  it('renders idle state with suggested questions for Event', () => {
    const html = renderToStaticMarkup(
      <HistorianChatView
        entityGlobalId="test:ev-1"
        entityName="Roman Empire Established"
        entityType="Event"
        status="idle"
        messages={[]}
      />,
    )
    expect(html).toContain('AI 历史学家')
    expect(html).toContain('不会脱离本实体')
    expect(html).toContain('为什么Roman Empire Established会发生？')
    expect(html).toContain('Roman Empire Established对后世有什么影响？')
  })

  it('renders suggested questions for Civilization type', () => {
    const html = renderToStaticMarkup(
      <HistorianChatView
        entityGlobalId="test:civ-1"
        entityName="Roman Civilization"
        entityType="Civilization"
        status="idle"
        messages={[]}
      />,
    )
    expect(html).toContain('Roman Civilization是如何兴起的？')
    expect(html).toContain('它如何影响了后世的历史？')
  })

  it('renders loading state', () => {
    const html = renderToStaticMarkup(
      <HistorianChatView
        entityGlobalId="test:ev-1"
        entityName="Test Event"
        entityType="Event"
        status="loading"
        messages={[]}
      />,
    )
    expect(html).toContain('正在从知识库中分析')
  })

  it('renders error state', () => {
    const html = renderToStaticMarkup(
      <HistorianChatView
        entityGlobalId="test:ev-1"
        entityName="Test"
        entityType="Event"
        status="error"
        error="Network timeout"
        messages={[]}
      />,
    )
    expect(html).toContain('当前无法生成解释')
    expect(html).toContain('Network timeout')
  })

  it('renders user and assistant messages', () => {
    const msgs: ChatMessage[] = [
      { role: 'user', content: 'Why did this happen?' },
      {
        role: 'assistant',
        content: 'Because of the Republic crisis.',
        citations: [{ global_id: 'a:b', kind: 'entity', label: 'B' }],
        rejected_citations: [],
        grounded: true,
        engine: 'ai',
      },
    ]
    const html = renderToStaticMarkup(
      <HistorianChatView
        entityGlobalId="test:ev-1"
        entityName="Test"
        entityType="Event"
        status="idle"
        messages={msgs}
      />,
    )
    expect(html).toContain('Why did this happen?')
    expect(html).toContain('Because of the Republic crisis.')
    expect(html).toContain('AI 历史学家')
  })

  it('preserves message history across follow-ups', () => {
    const msgs: ChatMessage[] = [
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer', citations: [], rejected_citations: [], grounded: true, engine: 'ai' },
      { role: 'user', content: 'Follow-up question' },
      { role: 'assistant', content: 'Follow-up answer', citations: [], rejected_citations: [], grounded: true, engine: 'ai' },
    ]
    const html = renderToStaticMarkup(
      <HistorianChatView
        entityGlobalId="test:ev-1"
        entityName="Test"
        entityType="Event"
        status="idle"
        messages={msgs}
      />,
    )
    expect(html).toContain('First question')
    expect(html).toContain('First answer')
    expect(html).toContain('Follow-up question')
    expect(html).toContain('Follow-up answer')
  })

  it('renders empty state for unknown entity type gracefully', () => {
    const html = renderToStaticMarkup(
      <HistorianChatView
        entityGlobalId="test:unknown"
        entityName="Unknown"
        entityType="WeirdType"
        status="idle"
        messages={[]}
      />,
    )
    expect(html).toContain('AI 历史学家')
    // No suggested questions for unknown type
    expect(html).not.toContain('推荐问题')
  })

  // --- M37 Phase 3: UX enhancements ---

  it('renders entity context badge', () => {
    const html = renderToStaticMarkup(
      <HistorianChatView
        entityGlobalId="test:ev-1"
        entityName="Roman Empire"
        entityType="Event"
        status="idle"
        messages={[]}
      />,
    )
    expect(html).toContain('hc-context-badge')
    expect(html).toContain('当前探索')
    expect(html).toContain('Event')
    expect(html).toContain('Roman Empire')
  })

  it('renders clear chat button when messages exist', () => {
    const msgs: ChatMessage[] = [
      { role: 'user', content: 'Q' },
      { role: 'assistant', content: 'A', citations: [], rejected_citations: [], grounded: true, engine: 'ai' },
    ]
    const html = renderToStaticMarkup(
      <HistorianChatView
        entityGlobalId="test:ev-1"
        entityName="Test"
        entityType="Event"
        status="idle"
        messages={msgs}
      />,
    )
    expect(html).toContain('清空对话')
  })

  it('renders follow-up input when messages exist', () => {
    const msgs: ChatMessage[] = [
      { role: 'user', content: 'Q' },
      { role: 'assistant', content: 'A', citations: [], rejected_citations: [], grounded: true, engine: 'ai' },
    ]
    const html = renderToStaticMarkup(
      <HistorianChatView
        entityGlobalId="test:ev-1"
        entityName="Test"
        entityType="Event"
        status="idle"
        messages={msgs}
      />,
    )
    expect(html).toContain('继续追问')
    expect(html).toContain('输入追问')
  })

  it('shows free-text input in initial state (no messages) alongside suggestions', () => {
    const html = renderToStaticMarkup(
      <HistorianChatView
        entityGlobalId="test:ev-1"
        entityName="Test"
        entityType="Event"
        status="idle"
        messages={[]}
      />,
    )
    // Initial state must present a free-text input, not just suggested buttons.
    expect(html).toContain('或输入你自己的问题')
    expect(html).toContain('输入关于')
    // It should not be labelled as a follow-up until a conversation exists.
    expect(html).not.toContain('继续追问')
  })

  it('renders a send button alongside the free-text input in initial state', () => {
    const html = renderToStaticMarkup(
      <HistorianChatView
        entityGlobalId="test:ev-1"
        entityName="Test"
        entityType="Event"
        status="idle"
        messages={[]}
      />,
    )
    // A visible send button must accompany the free-text input so users
    // without keyboard access (e.g. mobile) can submit.
    expect(html).toContain('发送')
    expect(html).toContain('hc-send-btn')
  })
})

// ============================================================
// M46 Phase 1 — start_chat event wiring test
// ============================================================

import { getEventCount, clearEvents } from '../data/UserBehaviorEvent'

describe('HistorianChat (M46 start_chat)', () => {
  it('does not produce start_chat on render alone', () => {
    clearEvents()
    const html = renderToStaticMarkup(
      <HistorianChatView
        entityName="Rome"
        entityType="Civilization"
        messages={[]}
        status="idle"
        suggestedQuestions={[]}
        onAsk={() => {}}
        onClear={() => {}}
      />,
    )
    expect(html).toContain('AI 历史学家')
    expect(getEventCount()).toBe(0)
  })
})

// ============================================================
// AI Response Layer — next_exploration → TrustDisplay 闭环
// 所有探索候选均来自后端 res.next_exploration（证据绑定），前端不自创。
// ============================================================

const NEXT: AINextExploration[] = [
  {
    global_id: 'roman_empire:event-punic-wars',
    label: 'Punic Wars',
    relationship: 'related_to',
    source_id: 'src-polybius',
    claim_ids: ['c1'],
  },
]

function mockResponse(): AIResponse {
  return {
    answer: '该事件源于共和晚期的结构性危机。',
    citations: [],
    rejected_citations: [],
    grounded: true,
    engine: 'ai',
    question: '',
    context_global_ids: [],
    mode: 'explain',
    next_exploration: NEXT,
  }
}

describe('HistorianChat (next_exploration → TrustDisplay)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    vi.mocked(explainAI).mockResolvedValue(mockResponse())
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.clearAllMocks()
  })

  it('renders the exploration card from backend next_exploration and fires onEntityClick on node click', async () => {
    const onEntityClick = vi.fn()

    await act(async () => {
      root.render(
        <LocaleProvider>
          <HistorianChat
            entityGlobalId="roman_empire:event-1"
            entityName="Roman Republic"
            entityType="Event"
            onEntityClick={onEntityClick}
          />
        </LocaleProvider>,
      )
    })

    // idle state shows suggested questions — click one to trigger onAsk → explainAI
    const suggestBtn = container.querySelector('.hc-suggest-btn') as HTMLButtonElement | null
    expect(suggestBtn).not.toBeNull()

    await act(async () => {
      suggestBtn!.click()
      await new Promise((r) => setTimeout(r, 10))
    })

    // assistant message should now render an evidence-bound exploration card
    const trust = container.querySelector('[data-testid="trust-display"]')
    expect(trust).not.toBeNull()
    const nodeBtn = container.querySelector('.trust-display-node-btn') as HTMLButtonElement | null
    expect(nodeBtn).not.toBeNull()

    // clicking the suggestion node must pass the backend global_id straight through
    await act(async () => {
      nodeBtn!.click()
    })
    expect(onEntityClick).toHaveBeenCalledTimes(1)
    expect(onEntityClick).toHaveBeenCalledWith('roman_empire:event-punic-wars')
  })
})

