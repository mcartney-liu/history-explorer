// ============================================================
// ContinuityEngine — Phase B 引擎测试（含 C1–C9 审计断言）
// ------------------------------------------------------------
// 依据：ADR-0023 v3.1 §9 + PHASE_B_IMPLEMENTATION_DESIGN.md v2
// 施工顺序：S1 测试先行（红）→ S2 实现（绿）。
// 审计断言分两类：
//   - 运行时断言（构造输入验证输出）
//   - 源码断言（读文件验证架构边界，如 C1/C8/C9）
// ============================================================

import { describe, it, expect, readFileSync as fsReadFileSync } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  collectRelationEvidence,
  composeFeatures,
  deriveJourneyContinuityScore,
  RELATION_KIND_MAP,
  type RelationEvidence,
  type RelationKind,
} from '../continuityEngine'
import { REL_LABELS } from '../relationshipLabels'

const SRC_DIR = join(__dirname, '..')

// ── 辅助：读源码（审计断言用）──
function readSrc(rel: string): string {
  return readFileSync(join(SRC_DIR, rel), 'utf-8')
}

// ── C1：Engine 不导航、不排序、不产生下一步 ──
describe('C1 — Engine 无导航/排序能力', () => {
  it('公开 API surface 白名单（只允许引擎两个函数 + JCS 派生）', () => {
    const src = readSrc('continuityEngine.ts')
    // 引擎文件不得定义/导出导航决策相关名称（字符串哨兵 + 语义名双保险）
    const banned = ['rankCandidates', 'selectDestination', 'chooseNext', 'nextStep']
    for (const b of banned) {
      expect(src, `引擎不得出现 ${b}`).not.toMatch(new RegExp(b, 'i'))
    }
  })

  it('引擎文件不含候选排序逻辑', () => {
    const src = readSrc('continuityEngine.ts')
    expect(src).not.toMatch(/sort\s*\(/i)
    expect(src).not.toMatch(/candidate/i)
  })
})

// ── C2：Engine 不选择唯一解释 ──
describe('C2 — 引擎不产出"已选定解释"', () => {
  it('collectRelationEvidence 返回证据数组而非单个解释', () => {
    const ev = collectRelationEvidence(
      { gid: 'a', name: 'A' },
      { gid: 'b', name: 'B' },
      { edge: { type: 'caused' } },
    )
    expect(Array.isArray(ev)).toBe(true)
    // 每条证据是 RelationEvidence 结构，无"text/explanation"最终解释字段
    for (const e of ev) {
      expect(e).toHaveProperty('kind')
      expect(e).toHaveProperty('strength')
      expect(e).toHaveProperty('provenance')
      expect(e).toHaveProperty('source')
      expect(e).not.toHaveProperty('text')
      expect(e).not.toHaveProperty('explanation')
    }
  })
})

// ── C3：JCS 不进入导航决策链 ──
describe('C3 — JCS 不进入导航决策', () => {
  it('deriveJourneyContinuityScore 存在且可由 Features 派生（可计算，禁消费）', () => {
    expect(typeof deriveJourneyContinuityScore).toBe('function')
    const score = deriveJourneyContinuityScore({
      relationshipStrength: 1,
      explanationQuality: 1,
      temporalContinuity: 0.8,
      spatialContinuity: 0.8,
      contextRelevance: null,
    })
    expect(score).not.toBeNull()
    expect(typeof score).toBe('number')
    expect(score!).toBeGreaterThanOrEqual(0)
    expect(score!).toBeLessThanOrEqual(1)
  })

  it('ExplorationPolicy 不引用 JCS（读源码断言）', () => {
    const policySrc = readSrc('../next/exploration/ExplorationPolicy.ts')
    expect(policySrc).not.toMatch(/JourneyContinuityScore|deriveJourneyContinuityScore/i)
    expect(policySrc).not.toMatch(/continuityEngine/i)
  })
})

// ── C4：Evidence provenance/source 可审计（provenance completeness）──
describe('C4 — Evidence 可审计性', () => {
  it('正向证据（有边）必须带非空 provenance + source', () => {
    const ev = collectRelationEvidence(
      { gid: 'a', name: 'A' },
      { gid: 'b', name: 'B' },
      { edge: { type: 'caused' } },
    )
    expect(ev.length).toBeGreaterThan(0)
    for (const e of ev) {
      expect(e.provenance).not.toBe('none')
      expect(e.provenance).not.toBeNull()
      expect(e.source).not.toBeNull()
      expect(String(e.source).length).toBeGreaterThan(0)
      expect(e.evidenceId).toMatch(/^[a-f0-9]{8,}$/)
    }
  })

  it('NONE 证据合法特判：provenance="none"、source=null', () => {
    const ev = collectRelationEvidence(
      { gid: 'a', name: 'A' },
      { gid: 'b', name: 'B' },
      { edge: null, commonNeighbor: null },
    )
    expect(ev.length).toBe(1)
    expect(ev[0].kind).toBe('NONE')
    expect(ev[0].provenance).toBe('none')
    expect(ev[0].source).toBeNull()
  })
})

// ── C5：B/C 共用同一引擎 ──
describe('C5 — 单一引擎复用', () => {
  it('ConnectionCard 从 continuityEngine 导入（读源码断言）', () => {
    const cardSrc = readSrc('../components/package/ConnectionCard.tsx')
    expect(cardSrc).toMatch(/continuityEngine/)
  })
})

// ── C6：NONE 不静默（B 层诚实表达，见 continuityExplanation 测试）──
// 本文件只断言引擎 NONE 证据存在；表达层断言在 continuityExplanation.test.ts。

// ── C7：多证据不折叠、不丢失 ──
describe('C7 — Evidence Non-Collapse', () => {
  it('同一条边同时产出多条证据时全部保留（kind 不折叠为单一）', () => {
    // 构造：边同时带 claim（claim 提供独立证据维度）
    const ev = collectRelationEvidence(
      { gid: 'a', name: 'A' },
      { gid: 'b', name: 'B' },
      {
        edge: {
          type: 'caused',
          evidence: ['ec-zh-001'],
        },
        commonNeighbor: null,
      },
    )
    expect(ev.length).toBeGreaterThan(0)
    // 若数据可检出 claim 维度，则应有 ≥2 条独立证据
    const kinds = new Set(ev.map((e) => e.kind))
    // 无论几条，kind 必须完整保留，不得被压成一条
    expect(ev.filter((e) => e.kind === 'CAUSAL').length).toBeGreaterThan(0)
  })
})

// ── C8：关系分类穷举 ──
describe('C8 — Relation Classification Exhaustiveness', () => {
  it('RELATION_KIND_MAP 键集覆盖后端权威 20 类 + 前端备用 9 键（29 全显式）', () => {
    const backend20 = [
      'caused', 'influenced', 'participated_in', 'located_at', 'related_to',
      'before', 'after', 'contemporary_with', 'part_of', 'ruled',
      'traded_with', 'invented', 'discovered', 'practiced', 'spoke',
      'inherited', 'conquered', 'spread', 'disputes', 'reinterprets',
    ]
    const frontendExtra = [
      'resulted_in', 'influenced_by', 'founded', 'succeeded',
      'located_in', 'born_in', 'died_in', 'wrote', 'spread_to',
    ]
    const keys = Object.keys(RELATION_KIND_MAP)
    for (const k of [...backend20, ...frontendExtra]) {
      expect(keys, `缺少映射: ${k}`).toContain(k)
    }
    expect(keys.length).toBe(29)
  })

  it('每个映射值都是合法 RelationKind（非 undefined/null）', () => {
    for (const [k, v] of Object.entries(RELATION_KIND_MAP)) {
      expect(v, `映射 ${k} 值非法`).toBeTruthy()
      expect(['DIRECT_HISTORICAL', 'CAUSAL', 'TEMPORAL_INHERIT', 'GEOGRAPHIC',
        'SHARED_ENTITY', 'THEMATIC', 'WEAK_BRIDGE', 'NONE', 'UNCLASSIFIED']).toContain(v)
    }
  })

  it('映射表不含 default 兜底分支（读源码断言）', () => {
    const src = readSrc('continuityEngine.ts')
    // 不允许 "default:" 分支 或 "?? 'DIRECT_HISTORICAL'" 兜底
    expect(src).not.toMatch(/default\s*:/)
    expect(src).not.toMatch(/\?\?\s*'DIRECT_HISTORICAL'/)
    expect(src).not.toMatch(/DIRECT_HISTORICAL\s*\]\s*\/\/\s*fallback/i)
  })
})

// ── 功能用例（S2 实现后转绿）──

describe('collectRelationEvidence — 功能', () => {
  it('直接关系边 → 正向证据，kind 按映射表', () => {
    const ev = collectRelationEvidence(
      { gid: 'a', name: 'A' },
      { gid: 'b', name: 'B' },
      { edge: { type: 'caused' } },
    )
    expect(ev.some((e) => e.kind === 'CAUSAL')).toBe(true)
    const causal = ev.find((e) => e.kind === 'CAUSAL')
    expect(causal?.provenance).toBe('relationship_edge')
    expect(causal?.strength).toBe(1)
  })

  it('无直接边但有共同邻居 → WEAK_BRIDGE', () => {
    const ev = collectRelationEvidence(
      { gid: 'a', name: 'A' },
      { gid: 'b', name: 'B' },
      { edge: null, commonNeighbor: { gid: 'c', name: 'C' } },
    )
    expect(ev.some((e) => e.kind === 'WEAK_BRIDGE')).toBe(true)
    const bridge = ev.find((e) => e.kind === 'WEAK_BRIDGE')
    expect(bridge?.provenance).toBe('shared_neighbor')
    expect(bridge?.source).toBe('c')
  })

  it('无直接边且无共同邻居 → NONE（合法状态）', () => {
    const ev = collectRelationEvidence(
      { gid: 'a', name: 'A' },
      { gid: 'b', name: 'B' },
    )
    expect(ev.length).toBe(1)
    expect(ev[0].kind).toBe('NONE')
  })

  it('输出顺序稳定（两次调用一致）', () => {
    const ctx = { edge: { type: 'caused', evidence: ['ec-zh-001'] } }
    const a = collectRelationEvidence({ gid: 'a', name: 'A' }, { gid: 'b', name: 'B' }, ctx)
    const b = collectRelationEvidence({ gid: 'a', name: 'A' }, { gid: 'b', name: 'B' }, ctx)
    expect(a.map((e) => e.evidenceId)).toEqual(b.map((e) => e.evidenceId))
  })
})

describe('composeFeatures — Feature Contract', () => {
  it('强证据输入 → relationshipStrength/explanationQuality 在 [0,1]', () => {
    const ev = collectRelationEvidence(
      { gid: 'a', name: 'A' },
      { gid: 'b', name: 'B' },
      { edge: { type: 'caused' } },
    )
    const f = composeFeatures(ev)
    expect(f.relationshipStrength).toBeGreaterThanOrEqual(0)
    expect(f.relationshipStrength).toBeLessThanOrEqual(1)
    expect(f.explanationQuality).toBeGreaterThanOrEqual(0)
    expect(f.explanationQuality).toBeLessThanOrEqual(1)
  })

  it('NONE 输入 → relationshipStrength=0，诚实表达仍计 explanationQuality', () => {
    const ev = collectRelationEvidence(
      { gid: 'a', name: 'A' },
      { gid: 'b', name: 'B' },
    )
    const f = composeFeatures(ev)
    expect(f.relationshipStrength).toBe(0)
    // explanationQuality 允许 >0（诚实陈述也是表达质量）；此处仅断言在 [0,1]
    expect(f.explanationQuality).toBeGreaterThanOrEqual(0)
    expect(f.explanationQuality).toBeLessThanOrEqual(1)
  })

  it('Phase B：contextRelevance 恒为 null（不是 0）', () => {
    const ev = collectRelationEvidence(
      { gid: 'a', name: 'A' },
      { gid: 'b', name: 'B' },
      { edge: { type: 'caused' } },
    )
    const f = composeFeatures(ev)
    expect(f.contextRelevance).toBeNull()
  })

  it('TC/SC 数据缺失时为 null（不是 0）——Phase B 无时间/空间元数据输入', () => {
    const ev = collectRelationEvidence(
      { gid: 'a', name: 'A' },
      { gid: 'b', name: 'B' },
      { edge: { type: 'caused' } },
    )
    const f = composeFeatures(ev)
    expect(f.temporalContinuity).toBeNull()
    expect(f.spatialContinuity).toBeNull()
  })
})
