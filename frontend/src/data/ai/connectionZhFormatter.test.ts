// 2026-08-13 (PO)：ConnectionExplained → 中文推理链 formatter。
import { describe, it, expect } from 'vitest'
import { formatConnectionZh } from './connectionZhFormatter'
import type { ConnectionExplained } from '../../components/ConnectionsExplainedPanel'

function conn(overrides: Partial<ConnectionExplained>): ConnectionExplained {
  return {
    global_id: 'x',
    depth: 1,
    path: [],
    steps: [],
    score: 0.9,
    score_breakdown: {},
    explanation: '',
    ...overrides,
  }
}

describe('connectionZhFormatter.formatConnectionZh', () => {
  it('builds a zh chain from path + steps', () => {
    const item = conn({
      path: ['roman_empire:civ-roman', 'hellenistic_world:civ-greek', 'persian_empire:civ-persian'],
      steps: [
        { from_global_id: 'roman_empire:civ-roman', to_global_id: 'hellenistic_world:civ-greek', relationship: 'influenced', direction: 'outgoing', weight: 0.9 },
        { from_global_id: 'hellenistic_world:civ-greek', to_global_id: 'persian_empire:civ-persian', relationship: 'influenced', direction: 'incoming', weight: 0.95 },
      ],
    })
    const zh = formatConnectionZh(item, 'zh')
    // 图谱里 civ-roman→罗马文明, civ-greek→希腊文明, civ-persian→波斯帝国
    expect(zh).toContain('罗马文明')
    expect(zh).toContain('希腊文明')
    expect(zh).toContain('波斯帝国')
    expect(zh).toContain('影响')
    // 结构是链式：实体 → 关系 → 实体
    expect(zh.split(' → ').length).toBeGreaterThanOrEqual(5)
  })

  it('falls back to raw explanation when path is empty', () => {
    const item = conn({ explanation: 'Roman Civilization influenced Ancient Greek Civilization' })
    expect(formatConnectionZh(item, 'zh')).toContain('Roman Civilization influenced')
  })
})
