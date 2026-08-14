// 2026-08-13 (PO)：模式角度词 + 示例问题模板。
import { describe, it, expect } from 'vitest'
import { exampleQuestions, withAngle } from './questionTemplates'

describe('questionTemplates.exampleQuestions', () => {
  it('returns 3 questions for a known mode with entity name', () => {
    const qs = exampleQuestions('why_happened', '罗马文明')
    expect(qs).toHaveLength(3)
    expect(qs[0]).toContain('罗马文明')
  })

  it('falls back to why_important for unknown mode', () => {
    const qs = exampleQuestions('explain', 'X')
    expect(qs[0]).toContain('X')
  })
})

describe('questionTemplates.withAngle', () => {
  it('prepends angle to the question', () => {
    expect(withAngle('why_happened', '罗马文明为什么重要？', '发生与成因'))
      .toBe('请从【发生与成因】的角度分析：罗马文明为什么重要？')
  })

  it('returns question unchanged when angle is empty', () => {
    expect(withAngle('why_happened', '罗马文明为什么重要？', ''))
      .toBe('罗马文明为什么重要？')
  })

  it('returns empty string for empty question', () => {
    expect(withAngle('why_happened', '  ', '发生与成因')).toBe('')
  })
})
