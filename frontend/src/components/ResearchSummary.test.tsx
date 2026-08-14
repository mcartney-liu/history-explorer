import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResearchSummaryView } from './ResearchSummary'
import type { ResearchDimension } from './ResearchDimensionCard'

function dims(arr: { title: string; status: string; answer?: string; citations?: { global_id: string; kind: string; label: string }[] }[]): ResearchDimension[] {
  return arr.map((d, i) => ({
    id: `dim-${i}`,
    title: d.title,
    question: `Q${i}`,
    status: d.status as ResearchDimension['status'],
    answer: d.answer,
    citations: d.citations ?? [],
    grounded: true,
  }))
}

describe('ResearchSummaryView', () => {
  it('renders entity header', () => {
    const html = renderToStaticMarkup(
      <ResearchSummaryView
        entityName="Roman Empire"
        entityType="Civilization"
        entityGlobalId="t:c"
        dimensions={dims([{ title: 'A', status: 'success' }])}
        status="pending"
      />,
    )
    expect(html).toContain('研究综述')
    expect(html).toContain('Roman Empire')
    expect(html).toContain('Civilization')
  })

  it('renders loading state', () => {
    const html = renderToStaticMarkup(
      <ResearchSummaryView
        entityName="Test"
        entityType="Event"
        entityGlobalId="t:c"
        dimensions={dims([{ title: 'A', status: 'success' }])}
        status="loading"
      />,
    )
    expect(html).toContain('正在从已完成维度中提炼')
  })

  it('renders error fallback with dimension context preserved', () => {
    const html = renderToStaticMarkup(
      <ResearchSummaryView
        entityName="Test"
        entityType="Event"
        entityGlobalId="t:c"
        dimensions={dims([{ title: 'A', status: 'success', answer: 'Ok' }])}
        status="error"
        error="Timeout"
      />,
    )
    expect(html).toContain('综合分析暂不可用')
  })

  it('renders success with grounded badge', () => {
    const html = renderToStaticMarkup(
      <ResearchSummaryView
        entityName="Test"
        entityType="Event"
        entityGlobalId="t:c"
        dimensions={dims([
          { title: 'A', status: 'success', answer: 'Answer A' },
          { title: 'B', status: 'success', answer: 'Answer B' },
        ])}
        status="success"
        answer="该文明的政治制度与其经济发展之间存在密切关联，两者相互促进。"
        grounded={true}
        citations={[{ global_id: 'a:b', kind: 'entity', label: 'X' }]}
      />,
    )
    expect(html).toContain('基于 2 个已验证研究维度')
    expect(html).toContain('该文明的政治制度与其经济发展之间存在密切关联，两者相互促进。')
  })

  it('aggregates unique citations from all dimensions', () => {
    const html = renderToStaticMarkup(
      <ResearchSummaryView
        entityName="Test"
        entityType="Event"
        entityGlobalId="t:c"
        dimensions={dims([
          { title: 'A', status: 'success', citations: [{ global_id: 'x', kind: 'entity', label: 'X' }] },
          { title: 'B', status: 'success', citations: [{ global_id: 'x', kind: 'entity', label: 'X' }, { global_id: 'y', kind: 'entity', label: 'Y' }] },
        ])}
        status="success"
        answer="综合各维度分析，该历史事件的影响跨越了政治、经济与文化多个层面。"
        citations={[]}
      />,
    )
    expect(html).toContain('(2 个唯一实体)')
  })

  // --- M39 Phase 3: Comparative UX ---

  it('renders comparative header with comparedNames', () => {
    const html = renderToStaticMarkup(
      <ResearchSummaryView
        entityName="Roman Empire"
        entityType="Civilization"
        entityGlobalId="t:c"
        dimensions={dims([{ title: 'A', status: 'success' }])}
        comparedNames={['Han Dynasty']}
        status="pending"
      />,
    )
    expect(html).toContain('比较研究综述')
    expect(html).toContain('Roman Empire vs Han Dynasty')
  })

  it('renders single entity header when no comparedNames', () => {
    const html = renderToStaticMarkup(
      <ResearchSummaryView
        entityName="Roman Empire"
        entityType="Civilization"
        entityGlobalId="t:c"
        dimensions={dims([{ title: 'A', status: 'success' }])}
        status="pending"
      />,
    )
    expect(html).toContain('研究综述')
    expect(html).not.toContain('比较研究综述')
  })
})
