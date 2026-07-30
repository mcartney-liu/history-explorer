// @vitest-environment jsdom
// M66-A — ExplorationInsightPanel unit tests.
// Renders the REAL component through the CompanionProvider harness
// (same infrastructure as useCompanionAI.test.tsx — no extra deps).
// Hard-asserts the panel surfaces exploration-space *connection state*
// only, and never produces user-analytics / recommendation wording.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { CompanionProvider } from './CompanionContext'
import { ExplorationInsightPanel } from './ExplorationInsightPanel'
import type { ExplorationContextIntelligence } from './CompanionContext'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const SAMPLE_INTEL: ExplorationContextIntelligence = {
  explorationDepth: 3,
  explorationPattern: 'research_loop',
  knowledgeCoverage: 0.62,
  knowledgeConnectionAvailable: true,
  explorationActivityCount: 18,
  evidenceCompleteness: 0.7,
  evidenceQuality: 0.8,
  explorationSignals: ['主要围绕罗马帝国展开研究', '跨实体连接较丰富'],
}

// Wording the panel MUST NEVER emit (user analytics / recommendation / profiling).
const FORBIDDEN = [
  '你应该',
  '推荐',
  '系统认为你',
  '用户画像',
  '用户评分',
  '系统认为',
  '建议',
  '评价',
]

const ref: { container: HTMLDivElement | null; root: Root | null } = {
  container: null,
  root: null,
}

function mount(workspace?: unknown) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      <CompanionProvider workspace={workspace as never}>
        <ExplorationInsightPanel />
      </CompanionProvider>,
    )
  })
  ref.container = container
  ref.root = root
}

function unmount() {
  act(() => {
    ref.root?.unmount()
  })
  ref.container?.remove()
  ref.container = null
  ref.root = null
}

beforeEach(() => {
  ref.container = null
  ref.root = null
})

afterEach(() => {
  unmount()
})

describe('ExplorationInsightPanel', () => {
  it('renders neutral exploration-space connection state from intelligence context', () => {
    mount({ intelligence: SAMPLE_INTEL })

    const text = ref.container!.textContent ?? ''
    // Neutral facts only
    expect(text).toContain('探索空间连接状态')
    expect(text).toContain('探索深度')
    expect(text).toContain('第 3 层')
    expect(text).toContain('探索模式')
    expect(text).toContain('研究循环')
    expect(text).toContain('知识覆盖')
    expect(text).toContain('62%')
    expect(text).toContain('关系数据可用')
    expect(text).toContain('可继续连接')
    expect(text).toContain('探索活动量')
    expect(text).toContain('18 次本地事件')
    expect(text).toContain('数据充分度')
    expect(text).toContain('70%')
    expect(text).toContain('证据质量')
    expect(text).toContain('80%')
    expect(text).toContain('本地探索分析 · 非 AI')
    expect(text).toContain('探索信号')
  })

  it('never emits user-analytics or recommendation wording', () => {
    mount({ intelligence: SAMPLE_INTEL })

    const text = ref.container!.textContent ?? ''
    for (const forbidden of FORBIDDEN) {
      expect(text).not.toContain(forbidden)
    }
  })

  it('renders a non-judgemental empty state when no intelligence is present', () => {
    mount(undefined)

    const text = ref.container!.textContent ?? ''
    expect(text).toContain('开始探索后')
    expect(text).toContain('本地探索分析 · 非 AI')
    for (const forbidden of FORBIDDEN) {
      expect(text).not.toContain(forbidden)
    }
  })

  it('renders empty state when intelligence exists but activity count is zero', () => {
    mount({ intelligence: { ...SAMPLE_INTEL, explorationActivityCount: 0 } })

    const text = ref.container!.textContent ?? ''
    expect(text).toContain('开始探索后')
    expect(text).not.toContain('第 3 层')
  })
})
