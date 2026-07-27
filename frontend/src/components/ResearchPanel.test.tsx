import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResearchPanelView } from './ResearchPanel'
import type { EntityRelationship } from './EntityPage'

const baseProps = {
  entityGlobalId: 'roman_empire:civ-roman',
  entityName: 'Roman Empire',
  entityType: 'Civilization',
  relationships: [] as EntityRelationship[],
}

describe('ResearchPanelView', () => {
  it('renders idle state with Civilization template (4 dimensions)', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView {...baseProps} mode="idle" dimensions={[]} />,
    )
    expect(html).toContain('AI 研究模式')
    expect(html).toContain('政治制度')
    expect(html).toContain('军事体系')
    expect(html).toContain('经济网络')
    expect(html).toContain('文化影响')
    expect(html).toContain('开始研究')
  })

  it('renders Event template (4 dimensions)', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        entityType="Event"
        entityName="Pax Romana"
        mode="idle"
        dimensions={[]}
      />,
    )
    expect(html).toContain('背景原因')
    expect(html).toContain('事件过程')
    expect(html).toContain('直接影响')
    expect(html).toContain('长期意义')
  })

  it('renders Person template (4 dimensions)', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        entityType="Person"
        entityName="Augustus"
        mode="idle"
        dimensions={[]}
      />,
    )
    expect(html).toContain('生平背景')
    expect(html).toContain('核心贡献')
  })

  it('renders running state with dimension cards', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="running"
        dimensions={[
          { id: '0', title: 'A', question: 'Q1', status: 'loading' },
          { id: '1', title: 'B', question: 'Q2', status: 'loading' },
        ]}
      />,
    )
    expect(html).toContain('正在分析')
  })

  it('renders done state with answers', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="done"
        dimensions={[
          {
            id: '0', title: 'A', question: 'Q', status: 'success',
            answer: 'Answer A', grounded: true,
            citations: [], rejected_citations: [],
          },
        ]}
      />,
    )
    expect(html).toContain('Answer A')
  })

  it('renders error state', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView {...baseProps} mode="error" dimensions={[]} />,
    )
    expect(html).toContain('研究执行失败')
  })

  it('falls back to Civilization template for unknown types', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        entityType="UnknownType"
        mode="idle"
        dimensions={[]}
      />,
    )
    expect(html).toContain('政治制度')
  })

  // --- M38 Phase 2: UX enhancements ---

  it('renders context badge', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView {...baseProps} mode="idle" dimensions={[]} />,
    )
    expect(html).toContain('rp-context-badge')
    expect(html).toContain('研究对象')
    expect(html).toContain('Roman Empire')
  })

  it('renders progress indicator', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="running"
        dimensions={[
          { id: '0', title: 'A', question: 'Q1', status: 'success' },
          { id: '1', title: 'B', question: 'Q2', status: 'loading' },
        ]}
      />,
    )
    expect(html).toContain('rp-progress')
    expect(html).toContain('1/2')
  })

  it('renders reset button when done', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="done"
        dimensions={[
          { id: '0', title: 'A', question: 'Q', status: 'success', answer: 'ok', grounded: true, citations: [], rejected_citations: [] },
        ]}
      />,
    )
    expect(html).toContain('重新研究')
  })

  it('renders ResearchReport when done', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="done"
        dimensions={[
          { id: '0', title: 'A', question: 'Q', status: 'success', answer: 'Answer', grounded: true, citations: [{ global_id: 'x', kind: 'entity', label: 'X' }], rejected_citations: [] },
        ]}
      />,
    )
    expect(html).toContain('历史研究报告')
    expect(html).toContain('关键发现')
  })
})
