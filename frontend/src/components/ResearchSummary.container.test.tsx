// @vitest-environment jsdom
// P-U01：ResearchSummary 容器在生成综述后必须把正文经 onAnswered 回传父组件，
// 否则父组件无法把它随整份研究存档（恢复研究中评会丢失）。本测试驱动真实容器。
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import ResearchSummary from './ResearchSummary'
import type { ResearchDimension } from './ResearchDimensionCard'
import type { AIResponse } from '../data/aiClient'
import * as aiClient from '../data/aiClient'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function makeResponse(answer: string): AIResponse {
  return {
    answer,
    citations: [{ global_id: 'a:b', kind: 'entity', label: 'X' }],
    rejected_citations: [],
    grounded: true,
    engine: 'ai',
    question: 'q',
    context_global_ids: ['e1'],
    mode: 'explain',
  }
}

const dim: ResearchDimension = {
  id: 'dim-0',
  title: '政治影响',
  question: 'Q0',
  status: 'success',
  answer: '政治维度内容',
  citations: [],
  grounded: true,
}

describe('ResearchSummary container (P-U01)', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('calls onAnswered with the AI summary answer after generation', async () => {
    const onAnswered = vi.fn()
    vi.spyOn(aiClient, 'explainAI').mockResolvedValue(
      makeResponse('跨维度综合分析结论。'),
    )
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    await act(async () => {
      root.render(
        <ResearchSummary
          entityName="Test"
          entityType="Event"
          entityGlobalId="t:c"
          dimensions={[dim]}
          onAnswered={onAnswered}
        />,
      )
    })
    // flush explainAI promise + 状态更新
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(onAnswered).toHaveBeenCalledTimes(1)
    expect(onAnswered).toHaveBeenCalledWith('跨维度综合分析结论。')
    root.unmount()
    container.remove()
  })
})
