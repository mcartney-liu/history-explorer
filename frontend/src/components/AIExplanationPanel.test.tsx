import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AIExplanationView } from './AIExplanationPanel'
import type { AIResponse } from '../data/aiClient'
import { LocaleProvider } from '../data/locale'

// Deterministic-fallback tests assert localized copy, so render inside the
// default zh LocaleProvider (component reads the string through t()).
function renderView(props: React.ComponentProps<typeof AIExplanationView>) {
  return renderToStaticMarkup(
    <LocaleProvider>
      <AIExplanationView {...props} />
    </LocaleProvider>,
  )
}

function makeResponse(overrides: Partial<AIResponse> = {}): AIResponse {
  return {
    answer: '回答',
    citations: [{ global_id: 'a:b', kind: 'entity', label: 'B' }],
    rejected_citations: [],
    grounded: true,
    engine: 'ai',
    question: 'q',
    context_global_ids: [],
    mode: 'explain',
    ...overrides,
  }
}

// All existing test renders need promptMode + onModeChange (M36.0 additive).
describe('AIExplanationView', () => {
  it('renders the idle hint and disclaimer', () => {
    const html = renderToStaticMarkup(
      <AIExplanationView
        status="idle"
        question=""
        response={null}
        error=""
        contextCount={3}
        promptMode="explain"
        onQuestionChange={() => {}}
        onAsk={() => {}}
        onModeChange={() => {}}
      />,
    )
    expect(html).toContain('AI 事实溯源解读')
    expect(html).toContain('输入问题后点击')
    // M36.0: permanent disclaimer always rendered
    expect(html).toContain('可溯源验证')
  })

  it('renders the loading state', () => {
    const html = renderToStaticMarkup(
      <AIExplanationView
        status="loading"
        question="q"
        response={null}
        error=""
        contextCount={3}
        promptMode="explain"
        onQuestionChange={() => {}}
        onAsk={() => {}}
        onModeChange={() => {}}
      />,
    )
    expect(html).toContain('正在生成带事实溯源的解读')
  })

  it('renders the error state with the network message', () => {
    const html = renderToStaticMarkup(
      <AIExplanationView
        status="error"
        question="q"
        response={null}
        error="AI request failed (500)"
        contextCount={3}
        promptMode="explain"
        onQuestionChange={() => {}}
        onAsk={() => {}}
        onModeChange={() => {}}
      />,
    )
    expect(html).toContain('无法获取 AI 解读')
    expect(html).toContain('AI request failed (500)')
  })

  it('renders the grounded answer and citations on success', () => {
    const html = renderToStaticMarkup(
      <AIExplanationView
        status="success"
        question="q"
        response={makeResponse({ grounded: true, engine: 'ai' })}
        error=""
        contextCount={3}
        promptMode="explain"
        onQuestionChange={() => {}}
        onAsk={() => {}}
        onModeChange={() => {}}
        onCitationClick={() => {}}
      />,
    )
    expect(html).toContain('已通过事实溯源验证')
    expect(html).toContain('事实引用（1）')
    expect(html).toContain('a:b')
  })

  it('renders the deterministic fallback on success without faking a fact', () => {
    const html = renderView({
      status: 'success',
      question: 'q',
      response: makeResponse({
        grounded: false,
        engine: 'deterministic',
        answer: 'AI 解读层当前不可用。',
      }),
      error: '',
      contextCount: 3,
      promptMode: 'explain',
      onQuestionChange: () => {},
      onAsk: () => {},
      onModeChange: () => {},
    })
    // M36.0: deterministic fallback renders in its own block, not via GroundedAnswer
    expect(html).toContain('ae-result--fallback')
    expect(html).toContain('AI 解读引擎暂时不可用')
    expect(html).not.toContain('ga-engine-badge')
  })

  // --- M36.0 Mode Chips ---
  it('renders all five mode chips', () => {
    const html = renderToStaticMarkup(
      <AIExplanationView
        status="idle"
        question=""
        response={null}
        error=""
        contextCount={3}
        promptMode="explain"
        onQuestionChange={() => {}}
        onAsk={() => {}}
        onModeChange={() => {}}
      />,
    )
    expect(html).toContain('历史地位')
    expect(html).toContain('发生与成因')
    expect(html).toContain('影响与遗产')
    expect(html).toContain('跨文明比较')
    expect(html).toContain('时间线梳理')
  })

  it('highlights the active mode chip', () => {
    const html = renderToStaticMarkup(
      <AIExplanationView
        status="idle"
        question=""
        response={null}
        error=""
        contextCount={3}
        promptMode="why_important"
        onQuestionChange={() => {}}
        onAsk={() => {}}
        onModeChange={() => {}}
      />,
    )
    expect(html).toContain('ae-mode-chip--active')
  })

  // --- M36.0 Deterministic fallback UI ---
  it('shows fallback block for engine=deterministic with reason', () => {
    const html = renderView({
      status: 'success',
      question: 'q',
      response: makeResponse({
        grounded: false,
        engine: 'deterministic',
        answer: 'AI 不可用',
        reason: 'provider_error',
      }),
      error: '',
      contextCount: 3,
      promptMode: 'explain',
      onQuestionChange: () => {},
      onAsk: () => {},
      onModeChange: () => {},
    })
    expect(html).toContain('ae-result--fallback')
    expect(html).toContain('AI 解读引擎暂时不可用')
    expect(html).toContain('provider_error')
  })

  // --- 2026-08-13 (PO)：示例问题 + 大白话副标题 ---
  it('shows plain-language subtitle with entity name', () => {
    const html = renderToStaticMarkup(
      <AIExplanationView
        status="idle"
        question=""
        response={null}
        error=""
        contextCount={3}
        promptMode="why_important"
        entityName="罗马文明"
        onQuestionChange={() => {}}
        onAsk={() => {}}
        onModeChange={() => {}}
      />,
    )
    expect(html).toContain('《罗马文明》')
    expect(html).not.toContain('基于当前探索上下文')
  })

  it('renders example questions for the active mode and fills on click', () => {
    const html = renderToStaticMarkup(
      <AIExplanationView
        status="idle"
        question=""
        response={null}
        error=""
        contextCount={3}
        promptMode="why_important"
        entityName="罗马文明"
        onQuestionChange={() => {}}
        onAsk={() => {}}
        onModeChange={() => {}}
      />,
    )
    expect(html).toContain('试试问：')
    expect(html).toContain('罗马文明为什么在历史上重要？')
    expect(html).toContain('ae-example-chip')
  })

  it('shows 选一个角度 label above mode chips', () => {
    const html = renderToStaticMarkup(
      <AIExplanationView
        status="idle"
        question=""
        response={null}
        error=""
        contextCount={1}
        promptMode="explain"
        onQuestionChange={() => {}}
        onAsk={() => {}}
        onModeChange={() => {}}
      />,
    )
    expect(html).toContain('选一个角度（必选）')
  })
})
