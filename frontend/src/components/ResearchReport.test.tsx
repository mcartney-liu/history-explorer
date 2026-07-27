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
    expect(html).toContain('✓ A')
  })
})
