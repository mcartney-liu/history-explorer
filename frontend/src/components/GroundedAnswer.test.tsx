import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import GroundedAnswer from './GroundedAnswer'
import type { AIResponse } from '../data/aiClient'

function makeResponse(overrides: Partial<AIResponse> = {}): AIResponse {
  return {
    answer: '示例回答',
    citations: [],
    rejected_citations: [],
    grounded: true,
    engine: 'ai',
    question: 'q',
    context_global_ids: [],
    mode: 'explain',
    ...overrides,
  }
}

// M12-1: GroundedAnswer must render the backend verdict honestly — it never
// upgrades an unverified answer into a reliable fact.
describe('GroundedAnswer', () => {
  it('renders grounded=true with the verification badge and citation count', () => {
    const html = renderToStaticMarkup(
      <GroundedAnswer
        response={makeResponse({
          grounded: true,
          engine: 'ai',
          citations: [{ global_id: 'a:b', kind: 'entity', label: 'B' }],
        })}
      />,
    )
    expect(html).toContain('已通过事实溯源验证')
    expect(html).toContain('示例回答')
    expect(html).toContain('事实引用 1 条')
  })

  it('renders grounded=false with the explicit unverified warning', () => {
    const html = renderToStaticMarkup(
      <GroundedAnswer
        response={makeResponse({ grounded: false, engine: 'ai', answer: '未验证回答' })}
      />,
    )
    expect(html).toContain('未完全通过事实溯源验证')
    expect(html).toContain('未验证回答')
    expect(html).not.toContain('已通过事实溯源验证')
  })

  it('renders the ai_unverified engine without claiming a reliable fact', () => {
    const html = renderToStaticMarkup(
      <GroundedAnswer response={makeResponse({ grounded: false, engine: 'ai_unverified' })} />,
    )
    expect(html).toContain('未完全通过事实溯源验证')
    expect(html).toContain('AI 解读（引用未通过验证）')
    expect(html).not.toContain('已通过事实溯源验证')
  })

  it('renders the deterministic fallback as AI-unavailable, not as a fact', () => {
    const html = renderToStaticMarkup(
      <GroundedAnswer
        response={makeResponse({
          grounded: false,
          engine: 'deterministic',
          answer: 'AI 解读层当前不可用。',
          reason: 'ai_unavailable',
        })}
      />,
    )
    expect(html).toContain('确定性回退（AI 不可用）')
    expect(html).toContain('并非 AI 生成的解读')
    expect(html).not.toContain('已通过事实溯源验证')
  })

  it('reports rejected citation count in the summary', () => {
    const html = renderToStaticMarkup(
      <GroundedAnswer
        response={makeResponse({
          grounded: false,
          engine: 'ai',
          citations: [{ global_id: 'a:b', kind: 'entity', label: 'B' }],
          rejected_citations: [{ global_id: 'a:bad', kind: 'entity', label: 'Bad' }],
        })}
      />,
    )
    expect(html).toContain('事实引用 1 条')
    expect(html).toContain('未通过验证 1 条')
  })
})
