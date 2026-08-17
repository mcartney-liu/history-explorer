// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { LocaleProvider } from '../data/locale'
import ResearchReport, { ResearchReportView } from './ResearchReport'
import { explainAI } from '../data/aiClient'
import type { AINextExploration } from '../data/aiClient'
import type { ResearchDimension } from './ResearchDimensionCard'

// AI Response Layer: explainAI is mocked; all next-exploration candidates come
// from the (mocked) backend response, never assembled on the frontend.
vi.mock('../data/aiClient', () => ({ explainAI: vi.fn() }))
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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

// ============================================================
// AI Response Layer — 根除幻觉软指令 + next_exploration 闭环
// ============================================================

const NEXT: AINextExploration[] = [
  {
    global_id: 'roman_empire:event-roman-empire-established',
    label: 'Roman Empire Established',
    relationship: 'related_to',
    source_id: 'src-polybius',
    claim_ids: ['c1'],
  },
]

function flush() {
  // allow the explainAI promise chain + state updates to settle
  return act(async () => {
    await new Promise((r) => setTimeout(r, 10))
  })
}

const ONE_DIM: ResearchDimension[] = [
  { id: 'd1', title: 'A', question: 'Q', status: 'success', answer: 'Answer A', citations: [], grounded: true },
]

describe('ResearchReport (AI Response Layer)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.clearAllMocks()
  })

  it('does NOT inject the hallucination soft-instruction into the prompt question', async () => {
    vi.mocked(explainAI).mockImplementation((question: string) =>
      Promise.resolve({
        answer: '该文明的政治制度与经济发展互为表里。',
        citations: [],
        rejected_citations: [],
        grounded: true,
        engine: 'ai',
        question: '',
        context_global_ids: [],
        mode: 'explain',
      }),
    )

    await act(async () => {
      root.render(
        <LocaleProvider>
          <ResearchReport
            entityName="Roman Empire"
            entityType="Civilization"
            entityGlobalId="roman_empire:civ-1"
            dimensions={ONE_DIM}
          />
        </LocaleProvider>,
      )
    })
    await flush()

    expect(explainAI).toHaveBeenCalled()
    const question = explainAI.mock.calls[0][0] as string
    expect(question).not.toContain('兴趣延展')
    expect(question).not.toContain('同一时期的世界')
  })

  it('renders TrustDisplay exploration card when next_exploration is non-empty', async () => {
    vi.mocked(explainAI).mockResolvedValue({
      answer: '该文明的政治制度与经济发展互为表里：元老院的制衡结构保障了财政体系的稳定。',
      citations: [],
      rejected_citations: [],
      grounded: true,
      engine: 'ai',
      question: '',
      context_global_ids: [],
      mode: 'explain',
      next_exploration: NEXT,
    })

    await act(async () => {
      root.render(
        <LocaleProvider>
          <ResearchReport
            entityName="Roman Empire"
            entityType="Civilization"
            entityGlobalId="roman_empire:civ-1"
            dimensions={ONE_DIM}
            onEntityClick={vi.fn()}
          />
        </LocaleProvider>,
      )
    })
    await flush()

    const trust = container.querySelector('[data-testid="trust-display"]')
    expect(trust).not.toBeNull()
    // 探索节点仅当 next_exploration 非空时才渲染
    expect(container.querySelector('.trust-display-node-btn')).not.toBeNull()
    // 确定性产物标"知识库推荐"，而非"AI 生成"
    expect(container.textContent ?? '').toContain('知识库推荐')
    expect(container.textContent ?? '').not.toContain('AI 生成')
  })
})
