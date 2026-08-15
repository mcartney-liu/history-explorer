// ============================================================
// ContinuityExplanation — B 解释层测试（C2/C6 审计断言 + 功能）
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  collectRelationEvidence,
  type RelationEvidence,
} from '../continuityEngine'
import {
  buildExplanationCandidates,
  selectBestExplanation,
  expressHonestNone,
  type TransitionExplanation,
} from '../continuityExplanation'

// ── 辅助：构造证据 ──
const edgeEv = (type: string): RelationEvidence[] =>
  collectRelationEvidence({ gid: 'a', name: 'A' }, { gid: 'b', name: 'B' }, { edge: { type } })
const noneEv = (): RelationEvidence[] =>
  collectRelationEvidence({ gid: 'a', name: 'A' }, { gid: 'b', name: 'B' })

// ── C2：解释选择在 B 层，不在引擎 ──
describe('C2 — B 层选择解释，引擎不选', () => {
  it('buildExplanationCandidates 返回素材数组（不选定唯一解释）', () => {
    const ev = edgeEv('caused')
    const candidates = buildExplanationCandidates(ev, 'A', 'B')
    expect(Array.isArray(candidates)).toBe(true)
    // 素材结构含 evidenceId/fact/confidence，无"最终选择"语义字段
    for (const c of candidates) {
      expect(c).toHaveProperty('evidenceId')
      expect(c).toHaveProperty('fact')
      expect(c).toHaveProperty('confidence')
    }
  })

  it('selectBestExplanation 是独立选择函数（B 层，非引擎导出）', () => {
    const candidates: TransitionExplanation[] = [
      { evidenceId: 'x', fact: 'weak fact', confidence: 'weak' },
      { evidenceId: 'y', fact: 'strong fact', confidence: 'strong' },
    ]
    const best = selectBestExplanation(candidates)
    expect(best?.evidenceId).toBe('y')
  })

  it('selectBestExplanation 空数组返回 null', () => {
    expect(selectBestExplanation([])).toBeNull()
  })
})

// ── C6：NONE 不静默、不编造、不暴露内部实现 ──
describe('C6 — 无关系诚实表达', () => {
  it('NONE 证据不产出解释素材（由诚实陈述接管）', () => {
    const ev = noneEv()
    const candidates = buildExplanationCandidates(ev, 'A', 'B')
    expect(candidates.length).toBe(0)
  })

  it('expressHonestNone 返回知识事实层陈述（含"没有找到"）', () => {
    const s = expressHonestNone('A', 'B')
    expect(s.text).toContain('没有找到')
    expect(s.text).toContain('A')
    expect(s.text).toContain('B')
  })

  it('expressHonestNone 带"可以做什么"操作提示（actionHint，PO 2026-08-15 反馈）', () => {
    const s = expressHonestNone('A', 'B')
    expect(s.actionHint).toBeTruthy()
    expect(s.actionHint).toContain('继续深入')
  })

  it('诚实陈述不含内部实现泄漏（探索包/作者/顺序/方向切换）', () => {
    const s = expressHonestNone('A', 'B')
    const banned = ['探索包', '作者', '顺序', '方向切换', '探索方向', '编排', 'package']
    for (const b of banned) {
      expect(s.text, `诚实陈述不得含: ${b}`).not.toContain(b)
    }
  })

  it('诚实陈述不是"静默留白"（text 非空）', () => {
    expect(expressHonestNone('A', 'B').text.length).toBeGreaterThan(10)
  })
})

// ── 功能：素材生成 ──
describe('buildExplanationCandidates — 功能', () => {
  it('正向边 → 关系短句素材（"A 早于 B" 式）', () => {
    const ev = edgeEv('before')
    const candidates = buildExplanationCandidates(ev, 'A', 'B')
    expect(candidates.length).toBe(1)
    expect(candidates[0].fact).toContain('早于')
    expect(candidates[0].confidence).toBe('strong')
  })

  it('WEAK_BRIDGE → 桥素材（weak）', () => {
    const ev = collectRelationEvidence(
      { gid: 'a', name: 'A' },
      { gid: 'b', name: 'B' },
      { edge: null, commonNeighbor: { gid: 'c', name: 'C' } },
    )
    const candidates = buildExplanationCandidates(ev, 'A', 'B')
    expect(candidates.length).toBe(1)
    expect(candidates[0].fact).toContain('共同关联')
    expect(candidates[0].confidence).toBe('weak')
  })

  it('claim 证据 + claimTextById → 采用 claim 文本素材', () => {
    const ev = collectRelationEvidence(
      { gid: 'a', name: 'A' },
      { gid: 'b', name: 'B' },
      { edge: { type: 'caused', evidence: ['ec-zh-001'] } },
    )
    const candidates = buildExplanationCandidates(ev, 'A', 'B', {
      'ec-zh-001': 'A 的某项政策直接导致了 B 的衰落',
    })
    const claimCandidates = candidates.filter((c) => c.fact.includes('衰落'))
    expect(claimCandidates.length).toBe(1)
  })

  it('素材顺序稳定且不表达优先级（同输入同输出）', () => {
    const ev = edgeEv('influenced')
    const a = buildExplanationCandidates(ev, 'A', 'B')
    const b = buildExplanationCandidates(ev, 'A', 'B')
    expect(a.map((c) => c.fact)).toEqual(b.map((c) => c.fact))
  })
})
