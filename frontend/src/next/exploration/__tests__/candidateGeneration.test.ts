// ============================================================
// candidateGeneration — Phase C 候选生成器测试（C-S1 测试先行）
// ------------------------------------------------------------
// 依据：ADR-0024 v6 Accepted + PHASE_C_IMPLEMENTATION_DESIGN.md v3 §2.1
// 覆盖：
//   - PC1 源码断言（模块无 ExplorationAction 构造/返回）
//   - 功能：四源生成 / 去重合并 sources[] / explored 排除 / 空候选回退
//   - sources[] 稳定顺序（非 ranking evidence）
// ============================================================

import { describe, it, expect, readFileSync as fsReadFileSync } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateCandidates } from '../candidateGeneration'

const SRC_FILE = join(__dirname, '../candidateGeneration.ts')
const src = readFileSync(SRC_FILE, 'utf-8')

describe('candidateGeneration — PC1 架构边界', () => {
  it('PC1: 模块无 ExplorationAction 构造/返回（只产候选集合）', () => {
    expect(src).not.toContain('ExplorationAction')
    expect(src).not.toContain('rankCandidates')
    expect(src).not.toContain('selectBest')
  })
})

describe('candidateGeneration — 功能用例', () => {
  const current = { gid: 'cur-1', name: '当前实体' }

  it('四源齐全时生成全部候选', () => {
    const out = generateCandidates(current, {
      dimensionTargets: [{ gid: 'd-1', name: '维度目标' }],
      neighbors: [{ gid: 'n-1', name: '图邻居' }],
      bridges: [{ gid: 'b-1', name: '跨主题桥' }],
      packageNext: { gid: 'p-1', name: '包内下一站' },
    })
    expect(out).toHaveLength(4)
    const gids = out.map((c) => c.targetRef).sort()
    expect(gids).toEqual(['b-1', 'd-1', 'n-1', 'p-1'])
  })

  it('同 gid 多源 → 合并为 1 个候选，sources[] 保留全部来源（D14）', () => {
    const out = generateCandidates(current, {
      dimensionTargets: [{ gid: 'x-1', name: 'X' }],
      neighbors: [{ gid: 'x-1', name: 'X' }],
      bridges: [{ gid: 'x-1', name: 'X' }],
      packageNext: { gid: 'x-1', name: 'X' },
    })
    expect(out).toHaveLength(1)
    expect(out[0].targetRef).toBe('x-1')
    expect(out[0].sources).toEqual([
      'dimension_target',
      'relationship_neighbor',
      'cross_topic_bridge',
      'package_next',
    ])
  })

  it('explored 已访问 gid 直接排除（去重）', () => {
    const out = generateCandidates(current, {
      neighbors: [{ gid: 'n-1', name: 'N1' }, { gid: 'n-2', name: 'N2' }],
      bridges: [{ gid: 'n-1', name: 'N1' }],
      explored: ['n-1'],
    })
    expect(out).toHaveLength(1)
    expect(out[0].targetRef).toBe('n-2')
  })

  it('无任何输入 → 空候选 []（调用方回退，D11 不崩溃）', () => {
    expect(generateCandidates(current, {})).toEqual([])
  })

  it('当前实体自身不得出现在候选中', () => {
    const out = generateCandidates(current, {
      neighbors: [{ gid: 'cur-1', name: '当前实体' }, { gid: 'n-1', name: 'N1' }],
    })
    expect(out).toHaveLength(1)
    expect(out[0].targetRef).toBe('n-1')
  })

  it('sources[] 顺序 = 稳定遍历顺序，非输入顺序（非 ranking evidence）', () => {
    // 故意乱序传入，输出 sources 必须按固定 precedence 排序
    const out = generateCandidates(current, {
      packageNext: { gid: 'x-1', name: 'X' },
      neighbors: [{ gid: 'x-1', name: 'X' }],
      dimensionTargets: [{ gid: 'x-1', name: 'X' }],
      bridges: [{ gid: 'x-1', name: 'X' }],
    })
    expect(out[0].sources).toEqual([
      'dimension_target',
      'relationship_neighbor',
      'cross_topic_bridge',
      'package_next',
    ])
  })
})
