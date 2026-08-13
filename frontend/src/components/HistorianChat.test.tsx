import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { HistorianChatView, type ChatMessage } from './HistorianChat'

// localStorage polyfill for event storage
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
  Object.defineProperty(globalThis, 'localStorage', { value: mock, writable: true })
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
