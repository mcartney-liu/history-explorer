import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AIExplanationView } from './AIExplanationPanel'
import type { AIResponse } from '../data/aiClient'

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

// The presentational view exposes every status as props, so each state can be
// rendered without a DOM click (the container owns the request lifecycle).
describe('AIExplanationView', () => {
  it('renders the idle hint', () => {
    const html = renderToStaticMarkup(
      <AIExplanationView
        status="idle"
        question=""
        response={null}
        error=""
        contextCount={3}
        onQuestionChange={() => {}}
        onAsk={() => {}}
      />,
    )
    expect(html).toContain('AI 事实溯源解读')
    expect(html).toContain('输入问题后点击')
  })

  it('renders the loading state', () => {
    const html = renderToStaticMarkup(
      <AIExplanationView
        status="loading"
        question="q"
        response={null}
        error=""
        contextCount={3}
        onQuestionChange={() => {}}
        onAsk={() => {}}
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
        onQuestionChange={() => {}}
        onAsk={() => {}}
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
        onQuestionChange={() => {}}
        onAsk={() => {}}
        onCitationClick={() => {}}
      />,
    )
    expect(html).toContain('已通过事实溯源验证')
    expect(html).toContain('事实引用（1）')
    expect(html).toContain('a:b')
  })

  it('renders the deterministic fallback on success without faking a fact', () => {
    const html = renderToStaticMarkup(
      <AIExplanationView
        status="success"
        question="q"
        response={makeResponse({
          grounded: false,
          engine: 'deterministic',
          answer: 'AI 解读层当前不可用。',
        })}
        error=""
        contextCount={3}
        onQuestionChange={() => {}}
        onAsk={() => {}}
      />,
    )
    expect(html).toContain('确定性回退（AI 不可用）')
    expect(html).toContain('并非 AI 生成的解读')
  })
})
