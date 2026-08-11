// @vitest-environment jsdom
// 2026-08-12 (PO 修复回归)：历史见解是后台固化只读内容，不依赖
// AI_SUGGESTIONS_ENABLED（默认 OFF）。本测试在开关 OFF 的环境下验证
// 见解仍会被读取并渲染——防"AI 开关误门控"同类回归。
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EntityHero } from './EntityHero'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const IDENTITY = {
  name: '罗马帝国建立',
  type: 'Event',
  timeLabel: '公元前 27 年',
  locationLabel: '',
  keyFacts: [],
} as never

const mockFetch = vi.fn()
let container: HTMLDivElement
let root: Root

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      global_id: 'roman_empire:event-roman-empire-established',
      insight: '基于上述证据，罗马帝国在历史上的意义与影响主要体现在……',
      evidence: [],
    }),
  })
  vi.stubGlobal('fetch', mockFetch)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.unstubAllGlobals()
})

describe('EntityHero 历史见解（AI 开关 OFF 仍显示，2026-08-12 PO）', () => {
  it('renders server insight even when AI_SUGGESTIONS_ENABLED is OFF (default)', async () => {
    act(() => {
      root.render(
        <EntityHero
          identity={IDENTITY}
          globalId="roman_empire:event-roman-empire-established"
        />,
      )
    })
    // 等待 fetch promise 链 + React re-render flush 完成
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/insights/roman_empire%3Aevent-roman-empire-established'),
    )
    expect(container.textContent).toContain('基于上述证据')
  })

  it('shows the pending placeholder when the backend has no insight', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 404, json: async () => ({}) })
    act(() => {
      root.render(
        <EntityHero
          identity={IDENTITY}
          globalId="roman_empire:event-roman-empire-established"
        />,
      )
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(container.textContent).toContain('历史见解待后台生成')
  })
})
