// 2026-08-13 (PO): AI 偶发 Markdown 进入前端，stripMarkdown 兜底剥离。
// 这里只单测 stripMarkdown 函数（pure），不依赖 React 渲染。

import { describe, it, expect } from 'vitest'
import { stripMarkdown } from './EntityInsightCard'

describe('EntityInsightCard.stripMarkdown', () => {
  it('strips **bold** markers', () => {
    expect(stripMarkdown('**政治与行政体系**：罗马文明。'))
      .toBe('政治与行政体系：罗马文明。')
  })

  it('strips multiple bold markers in one paragraph', () => {
    const input = '1. **政治**：A。2. **经济**：B。3. **文化**：C。'
    const expected = '1. 政治：A。2. 经济：B。3. 文化：C。'
    expect(stripMarkdown(input)).toBe(expected)
  })

  it('strips __bold__ and *italic* markers', () => {
    expect(stripMarkdown('这是 __粗体__ 和 *斜体*'))
      .toBe('这是 粗体 和 斜体')
  })

  it('strips leading heading hashes', () => {
    expect(stripMarkdown('# 标题\n## 次级\n内容'))
      .toBe('标题\n次级\n内容')
  })

  it('strips inline code and markdown links', () => {
    expect(stripMarkdown('看 `code` 这里 [点这里](https://x.com)'))
      .toBe('看 code 这里 点这里')
  })

  it('leaves plain text unchanged', () => {
    expect(stripMarkdown('没有 markdown 的纯文本。'))
      .toBe('没有 markdown 的纯文本。')
  })
})
