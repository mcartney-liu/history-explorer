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

  // --- M36.0 Confidence badge ---
  it('renders confidence badge when confidence is present', () => {
    const html = renderToStaticMarkup(
      <GroundedAnswer
        response={makeResponse({ confidence: 'high' })}
      />,
    )
    expect(html).toContain('置信度：高')
  })

  // 2026-08-11 (PO): structured cross-dimensional synthesis answer must render
  // as a readable view (主题 / 维度关联 / 结论), NOT as a raw JSON dict dump.
  it('renders a structured cross-dimensional synthesis answer as sections', () => {
    const synthesis = JSON.stringify({
      cross_dimensional_theme: '罗马治下的埃及与罗马文明紧密相连。',
      dimensional_relations: {
        政治制度: '作为罗马行省，行政效率提升。',
        军事体系: '罗马军力保障稳定。',
      },
      conclusion: '共同推动了地中海文明进程。',
    })
    const html = renderToStaticMarkup(
      <GroundedAnswer response={makeResponse({ answer: synthesis })} />,
    )
    expect(html).toContain('跨维度主题')
    expect(html).toContain('维度关联')
    expect(html).toContain('结论')
    expect(html).toContain('罗马治下的埃及与罗马文明紧密相连。')
    expect(html).toContain('作为罗马行省，行政效率提升。')
    expect(html).toContain('共同推动了地中海文明进程。')
    // The raw dict-string must NOT leak into the output.
    expect(html).not.toContain("{'cross_dimensional_theme'")
    expect(html).not.toContain('{"cross_dimensional_theme"')
  })

  it('falls back to a plain paragraph for non-synthesis JSON answers', () => {
    const html = renderToStaticMarkup(
      <GroundedAnswer response={makeResponse({ answer: '{"summary":"纯文本包装"}' })} />,
    )
    expect(html).toContain('ga-answer')
    expect(html).not.toContain('跨维度主题')
  })

  it('renders Chinese-key synthesis answers (cross-dimensional analysis prompt)', () => {
    const synthesis = JSON.stringify({
      跨维度主题: '罗马治下的埃及与罗马文明紧密相连。',
      维度关联: {
        政治制度: '作为罗马行省，行政效率提升。',
        军事体系: '罗马军力保障稳定。',
      },
      结论: '共同推动了地中海文明进程。',
    })
    const html = renderToStaticMarkup(
      <GroundedAnswer response={makeResponse({ answer: synthesis })} />,
    )
    expect(html).toContain('跨维度主题')
    expect(html).toContain('维度关联')
    expect(html).toContain('结论')
    expect(html).toContain('罗马治下的埃及与罗马文明紧密相连。')
    expect(html).toContain('作为罗马行省，行政效率提升。')
    expect(html).not.toContain('{"跨维度主题"')
  })

  it('strips markdown code block wrapper from synthesis JSON', () => {
    const synthesis = '```json\n' + JSON.stringify({
      cross_dimensional_theme: '主题',
      dimensional_relations: { 政治: '关联' },
      conclusion: '结论',
    }) + '\n```'
    const html = renderToStaticMarkup(
      <GroundedAnswer response={makeResponse({ answer: synthesis })} />,
    )
    expect(html).toContain('跨维度主题')
    expect(html).toContain('主题')
    expect(html).toContain('结论')
    expect(html).not.toContain('```json')
  })

  it('does not render confidence badge when absent (backward compat)', () => {
    const html = renderToStaticMarkup(
      <GroundedAnswer response={makeResponse()} />,
    )
    expect(html).not.toContain('置信度')
  })

  it('renders confidence medium badge', () => {
    const html = renderToStaticMarkup(
      <GroundedAnswer
        response={makeResponse({ grounded: false, confidence: 'medium' })}
      />,
    )
    expect(html).toContain('置信度：中')
  })

  // --- M36.0 Perspectives ---
  it('renders perspectives when non-empty', () => {
    const html = renderToStaticMarkup(
      <GroundedAnswer
        response={makeResponse({
          perspectives: ['Alt view 1', 'Alt view 2'],
        })}
      />,
    )
    expect(html).toContain('多角度解读')
    expect(html).toContain('Alt view 1')
    expect(html).toContain('Alt view 2')
  })

  it('does not render perspectives when empty', () => {
    const html = renderToStaticMarkup(
      <GroundedAnswer
        response={makeResponse({ perspectives: [] })}
      />,
    )
    expect(html).not.toContain('多角度解读')
  })

  // --- M36.0 Evidence ---
  it('renders evidence block when present', () => {
    const html = renderToStaticMarkup(
      <GroundedAnswer
        response={makeResponse({
          evidence: [
            { global_id: 'a:b', kind: 'entity', label: 'B', status: 'verified' },
          ],
        })}
      />,
    )
    expect(html).toContain('已验证的事实证据')
    expect(html).toContain('B')
  })

  it('does not render evidence when absent (backward compat)', () => {
    const html = renderToStaticMarkup(
      <GroundedAnswer response={makeResponse()} />,
    )
    expect(html).not.toContain('已验证的事实证据')
  })
})
