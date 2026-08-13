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

  // --- 2026-08-13 (P-U10)：done 态维度卡也引用后台上传图 ---
  it('uses admin-configured image for done dimension cards (P-U10)', () => {
    applyContentDocument({
      version: 2,
      cards: [{ id: 'research_dims.politics', image: 'abc123.png', title: '', desc: '' }],
    } as any)
    try {
      const html = renderToStaticMarkup(
        <ResearchPanelView
          {...baseProps}
          mode="done"
          dimensions={[
            { id: '0', title: 'A', question: 'Q', status: 'success', answer: 'ok', grounded: true, citations: [], rejected_citations: [] },
          ]}
        />,
      )
      expect(html).toContain('/api/v1/content/media/abc123.png')
      expect(html).toContain('has-art')
      expect(html).not.toContain('assets/research/politics.webp')
    } finally {
      resetContentRuntime()
    }
  })

  // --- 2026-08-13 (P-U09)：全部展开 / 收起全部 ---
  it('renders 全部展开 button when done with success dimensions (P-U09)', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="done"
        onToggleExpandAll={() => {}}
        dimensions={[
          { id: '0', title: 'A', question: 'Q', status: 'success', answer: 'ok', grounded: true, citations: [], rejected_citations: [] },
        ]}
      />,
    )
    expect(html).toContain('全部展开')
  })

  it('renders 收起全部 when expandAll true (P-U09)', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="done"
        expandAll={true}
        onToggleExpandAll={() => {}}
        dimensions={[
          { id: '0', title: 'A', question: 'Q', status: 'success', answer: 'ok', grounded: true, citations: [], rejected_citations: [] },
        ]}
      />,
    )
    expect(html).toContain('收起全部')
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

  it('renders done state with answers (externalExpand controls inline body)', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="done"
        expandAll={true}
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
        reportStarted={true}
      />,
    )
    expect(html).toContain('历史研究报告')
    expect(html).toContain('关键发现')
  })

  // --- 2026-08-13 (PO 方案①)：三阶段自主触发 ---

  it('shows 生成研究中评 button when done, AI available and all dimensions success, no auto-render', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="done"
        dimensions={[
          { id: '0', title: 'A', question: 'Q', status: 'success', answer: '答案', grounded: true, engine: 'ai', citations: [] },
        ]}
        aiAvailable={true}
        allSuccess={true}
      />,
    )
    expect(html).toContain('生成研究中评')
    expect(html).not.toContain('各维度核心发现')  // 未点击 → 不渲染中评内容
  })

  // 2026-08-13 (P-U06)：研究中评门控 = 四维度全 success。
  // 即便 AI 可用，只要还有维度 error（未补齐），就不显示「生成研究中评」。
  it('hides 生成研究中评 when a dimension errored even if AI available', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="done"
        dimensions={[
          { id: '0', title: 'A', question: 'Q', status: 'success', answer: '答案', grounded: true, engine: 'ai', citations: [] },
          { id: '1', title: 'B', question: 'Q', status: 'error', error: '失败', citations: [] },
        ]}
        aiAvailable={true}
        allSuccess={false}
      />,
    )
    expect(html).not.toContain('生成研究中评')
    expect(html).toContain('生成历史研究报告')  // 报告降级仍可生成
  })

  it('renders ResearchSummary after summary started', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="done"
        dimensions={[
          { id: '0', title: 'A', question: 'Q', status: 'success', answer: '答案', grounded: true, engine: 'ai', citations: [] },
        ]}
        aiAvailable={true}
        summaryStarted={true}
      />,
    )
    expect(html).toContain('研究综述')
  })

  it('shows 生成综合报告 button after summary started, report not auto-rendered', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="done"
        dimensions={[
          { id: '0', title: 'A', question: 'Q', status: 'success', answer: '答案', grounded: true, engine: 'ai', citations: [] },
        ]}
        aiAvailable={true}
        summaryStarted={true}
      />,
    )
    expect(html).toContain('生成综合报告')
    expect(html).not.toContain('历史研究报告')  // 未点击报告按钮 → 报告未挂载
  })

  // 2026-08-13 (PO 纠偏)：研究中评不再以 aiAvailable 隐藏——四维度全 success 即显示，
  // 即便 engine=deterministic（AI 关）也照常出现，由 ResearchSummary 内部兜底。
  it('shows 研究中评 when all success even if AI unavailable (deterministic engine)', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="done"
        dimensions={[
          { id: '0', title: 'A', question: 'Q', status: 'success', answer: '基于知识库证据：…', grounded: true, engine: 'deterministic', citations: [] },
        ]}
        aiAvailable={false}
        allSuccess={true}
      />,
    )
    expect(html).toContain('生成研究中评')
    expect(html).not.toContain('研究综述')  // 未点击 → 中评内容不挂载
    expect(html).toContain('生成历史研究报告')  // 报告降级仍可生成
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
    // P-U04 纠偏：恢复态维度卡提供「查看报告」弹 modal 入口（正文默认折叠）。
    expect(html).toContain('查看报告')
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

  // --- 2026-08-13 (P-U07)：单点/批量研究后「尚未保存」轻提示 ---
  it('renders pending-save hint with count when pendingSaveCount > 0 (P-U07)', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="done"
        pendingSaveCount={3}
      />,
    )
    expect(html).toContain('本会话有 3 个维度尚未保存')
    expect(html).toContain('rp-pending-save')
  })

  it('does not render pending-save hint when pendingSaveCount is 0 (P-U07)', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="done"
        pendingSaveCount={0}
      />,
    )
    expect(html).not.toContain('尚未保存')
  })

  it('defaults to no pending-save hint (P-U07)', () => {
    const html = renderToStaticMarkup(
      <ResearchPanelView
        {...baseProps}
        mode="done"
      />,
    )
    expect(html).not.toContain('尚未保存')
  })
})
