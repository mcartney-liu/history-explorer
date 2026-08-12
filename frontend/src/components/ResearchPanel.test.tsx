import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResearchPanelView, restoreResearch } from './ResearchPanel'
import { applyContentDocument, resetContentRuntime } from '../data/contentRuntime'
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
    expect(html).toContain('rp-dim-grid')
    expect(html).toContain('rp-dim-card')
  })

  it('renders idle dimensions as a 2x2 artwork card grid', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView {...baseProps} mode="idle" dimensions={[]} />,
    )
    expect(html).toContain('assets/research/politics.webp')
    expect(html).toContain('rp-dim-card-art')
  })

  it('prefers admin-configured image over the bundle artwork', () => {
    applyContentDocument({
      version: 2,
      cards: [{ id: 'research_dims.politics', image: 'abc123.png', title: '', desc: '' }],
    } as any)
    try {
      const html = renderToStaticMarkup(
        <ResearchPanelView {...baseProps} mode="idle" dimensions={[]} />,
      )
      expect(html).toContain('/api/v1/content/media/abc123.png')
      expect(html).not.toContain('assets/research/politics.webp')
    } finally {
      resetContentRuntime()
    }
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

  // --- M39 Phase 2: MultiEntity ---

  it('renders MultiEntitySelector when relationships available', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="idle"
        dimensions={[]}
        availableEntities={[
          { id: 'civ-han', globalId: 't2:civ-han', name: 'Han Dynasty', type: 'Civilization' },
        ]}
        selectedEntities={[]}
      />,
    )
    expect(html).toContain('比较对象')
    expect(html).toContain('添加比较对象')
  })

  // --- M40 Phase 4: Restore ---

  it('renders restored state with badge', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="restored"
        dimensions={[
          { id: '0', title: 'A', question: 'Q', status: 'success', answer: 'Answer', grounded: true, citations: [], rejected_citations: [] },
        ]}
      />,
    )
    expect(html).toContain('已恢复历史研究')
    expect(html).toContain('Answer')
  })

  // 2026-08-11 (PO 问题二)：恢复的研究必须展示完整报告（综合报告 + 研究报告），
  // 而不是只给横幅/摘要/维度卡——「打开」后要能立即看到报告内容。
  it('renders full reports (summary + report) in restored mode', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="restored"
        dimensions={[
          { id: '0', title: 'A', question: 'Q', status: 'success', answer: 'Answer', grounded: true, citations: [], rejected_citations: [] },
        ]}
        restoreData={{
          id: 'r_1',
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          entityName: 'Test',
          entityType: 'Event',
          entityGlobalId: 't:ev',
          comparedNames: [],
          summaryAnswer: '存档的综合报告摘要',
          dimensions: [],
        }}
      />,
    )
    expect(html).toContain('历史研究报告')   // ResearchReport
    expect(html).toContain('存档的综合报告摘要')  // ResearchSummaryView 展示存档摘要
  })

  it('restoreResearch converts SavedResearch to ResearchDimension[]', () => {
    const dimensions = restoreResearch({
      id: 'r_1',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entityName: 'Test',
      entityType: 'Event',
      entityGlobalId: 't:ev',
      comparedNames: [],
      dimensions: [
        { id: '0', title: 'A', question: 'Q', status: 'success', answer: 'Answer', grounded: true, citationCount: 2 },
        { id: '1', title: 'B', question: 'Q', status: 'error', citationCount: 0 },
      ],
      summaryCitations: [],
      bookmarked: false,
      labels: [],
    })
    expect(dimensions).toHaveLength(2)
    expect(dimensions[0].status).toBe('success')
    expect(dimensions[1].status).toBe('error')
    // explainAI is NOT called — only data conversion
  })

  // --- M44 Phase 3: Completion Guidance ---

  it('renders completion guidance when research is done', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="done"
        dimensions={[
          { id: '0', title: 'A', question: 'Q', status: 'success', answer: 'Answer', grounded: true, citations: [], rejected_citations: [] },
        ]}
      />,
    )
    expect(html).toContain('研究库')
    expect(html).toContain('保存这份研究结果')
  })

  it('does not render guidance when research is idle', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="idle"
        dimensions={[]}
      />,
    )
    expect(html).not.toContain('保存这份研究结果')
  })
})
