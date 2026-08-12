import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResearchReportView } from './ResearchReport'
import type { ResearchDimension } from './ResearchDimensionCard'

function dims(overrides: ResearchDimension[]): ResearchDimension[] {
  return overrides.map((d, i) => ({
    id: `dim-${i}`,
    title: d.title ?? `Dimension ${i}`,
    question: `Q${i}`,
    status: d.status ?? 'success',
    answer: d.answer,
    citations: d.citations ?? [],
    grounded: d.grounded ?? true,
    ...d,
  }))
}

describe('ResearchReportView', () => {
  it('renders topic header', () => {
    const html = renderToStaticMarkup(
      <ResearchReportView
        entityName="Roman Empire"
        entityType="Civilization"
        dimensions={dims([{ title: 'A', status: 'success', answer: 'Answer A', citations: [] }])}
      />,
    )
    expect(html).toContain('历史研究报告')
    expect(html).toContain('Roman Empire')
    expect(html).toContain('Civilization')
  })

  it('renders executive summary with completion stats', () => {
    const html = renderToStaticMarkup(
      <ResearchReportView
        entityName="Test"
        entityType="Event"
        dimensions={dims([
          { title: 'A', status: 'success', answer: 'Ok', citations: [{ global_id: 'x', kind: 'entity', label: 'X' }] },
          { title: 'B', status: 'success', answer: 'Ok', citations: [] },
          { title: 'C', status: 'error' },
        ])}
      />,
    )
    expect(html).toContain('完成 2 个维度')
    expect(html).toContain('失败 1 个维度')
  })

  it('renders key findings from completed dimensions', () => {
    const html = renderToStaticMarkup(
      <ResearchReportView
        entityName="Test"
        entityType="Event"
        dimensions={dims([
          { title: 'Military', status: 'success', answer: 'Military answer text', citations: [], grounded: true },
          { title: 'Politics', status: 'success', answer: 'Politics answer text', citations: [], grounded: true },
        ])}
      />,
    )
    expect(html).toContain('关键发现')
    expect(html).toContain('Military')
    expect(html).toContain('Military answer text')
  })

  it('aggregates unique citations across dimensions', () => {
    const html = renderToStaticMarkup(
      <ResearchReportView
        entityName="Test"
        entityType="Event"
        dimensions={dims([
          { title: 'A', status: 'success', answer: 'Ok', citations: [{ global_id: 'a:b', kind: 'entity', label: 'B' }] },
          { title: 'B', status: 'success', answer: 'Ok', citations: [{ global_id: 'a:b', kind: 'entity', label: 'B' }, { global_id: 'c:d', kind: 'entity', label: 'D' }] },
        ])}
      />,
    )
    // unique citations: a:b and c:d = 2
    expect(html).toContain('共享 2 个唯一知识图谱实体')
  })

  it('renders dimension coverage status', () => {
    const html = renderToStaticMarkup(
      <ResearchReportView
        entityName="Test"
        entityType="Event"
        dimensions={dims([
          { title: 'A', status: 'success', answer: 'Ok', citations: [] },
          { title: 'B', status: 'loading' },
          { title: 'C', status: 'error' },
        ])}
      />,
    )
    expect(html).toContain('维度覆盖')
    expect(html).toContain('A')
  })

  // --- M39 Phase 3: Comparative ---

  it('renders comparison title with comparedNames', () => {
    const html = renderToStaticMarkup(
      <ResearchReportView
        entityName="Roman Empire"
        entityType="Civilization"
        dimensions={dims([{ title: 'A', status: 'success', answer: 'Ok', citations: [] }])}
        comparedNames={['Han Dynasty']}
      />,
    )
    expect(html).toContain('比较研究报告')
    expect(html).toContain('Roman Empire × Han Dynasty')
  })

  // --- 2026-08-12 (PO): 研究报告升级为 AI 综合报告 + 本地结构化降级 ---

  it('renders AI synthesis report when aiAnswer has real Chinese content', () => {
    const html = renderToStaticMarkup(
      <ResearchReportView
        entityName="Test"
        entityType="Event"
        dimensions={dims([
          { title: 'A', status: 'success', answer: 'Answer A' },
          { title: 'B', status: 'success', answer: 'Answer B' },
        ])}
        aiAnswer="该文明的政治制度与经济发展互为表里：元老院的制衡结构保障了财政体系的稳定，而贸易网络的扩张又反过来巩固了中央集权。由此可提炼出「制度—经济共生」这一贯穿主题。"
        aiGrounded={true}
        aiEngine="ai"
        aiCitations={[{ global_id: 'a:b', kind: 'entity', label: 'Rome' }]}
      />,
    )
    expect(html).toContain('综合报告')
    expect(html).toContain('AI 综合')
    expect(html).toContain('制度—经济共生')
  })

  it('falls back to local structured findings when aiAnswer is JSON junk (few Chinese chars)', () => {
    const html = renderToStaticMarkup(
      <ResearchReportView
        entityName="Test"
        entityType="Event"
        dimensions={dims([
          { title: 'Military', status: 'success', answer: '军事制度沿革及其对扩张的影响。', citations: [], grounded: true },
        ])}
        aiAnswer='"label": "Rome", ["global_id": "Rome", "kind": "entity", "label": "Rome"]'
      />,
    )
    expect(html).toContain('关键发现')
    expect(html).not.toContain('综合报告')
    expect(html).toContain('Military')
  })

  it('shows loading placeholder while AI synthesis is in flight', () => {
    const html = renderToStaticMarkup(
      <ResearchReportView
        entityName="Test"
        entityType="Event"
        dimensions={dims([{ title: 'A', status: 'success', answer: 'Answer A' }])}
        aiLoading={true}
      />,
    )
    expect(html).toContain('综合报告')
    expect(html).toContain('正在跨维度提炼')
  })

  it('local findings show lead sentence instead of full answer text', () => {
    const longAnswer = '第一句是核心观点，用于验证只取首句而不是全文。' +
      '这是第二句，不应该出现在本地要点里因为太长了。'
    const html = renderToStaticMarkup(
      <ResearchReportView
        entityName="Test"
        entityType="Event"
        dimensions={dims([
          { title: 'A', status: 'success', answer: longAnswer, citations: [], grounded: true },
        ])}
      />,
    )
    expect(html).toContain('第一句是核心观点')
    expect(html).not.toContain('这是第二句')
  })
})
