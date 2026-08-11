/**
 * M86.3.2 — Persistence Contract
 *
 * Runtime 的持久化边界。
 * Persistence 是 Evaluation Runtime 的终点，不参与计算。
 *
 * 约束（M86.1 Final ADR）：
 *   - Persistence 永远在最后——消费 Projection，不参与 Decision
 *   - MemoryStore 不进入 Evaluation Engine
 *   - Policy 不访问 Store
 */

import type { Decision } from './Decision'

// ============================================================================
// MemoryStore Contract
// ============================================================================

/**
 * MemoryStore 是 Memory Domain 的持久化接口。
 *
 * 职责：
 *   - 保存/加载 UnderstandingMemoryUnit
 *   - 追加 GrowthNode + GrowthEdge（Append Only）
 *   - 追加 Decision（审计链路）
 *
 * 禁止：
 *   - 不进入 Evaluation Engine
 *   - 不被 Policy 调用
 *   - 不影响 Decision 结果
 */
export interface MemoryStore {
  /** 保存完整的 UnderstandingMemoryUnit */
  saveMemoryUnit(unit: unknown): void

  /** 按 unitId 加载 UnderstandingMemoryUnit */
  loadMemoryUnit(unitId: string): unknown | null

  /** 追加 GrowthNode 和对应的 GrowthEdge（Append Only） */
  appendGrowthNode(unitId: string, node: unknown, edge: unknown): void

  /** 追加 MemoryDecision（审计链路） */
  appendDecision(unitId: string, decision: Decision<unknown>): void

  /** 加载指定 unitId 的 GrowthGraph */
  loadGrowthGraph(unitId: string): unknown | null

  /** 列出所有已保存的 MemoryUnit ID */
  listUnitIds(): string[]
}

// ============================================================================
// InMemoryStore（M86.2 默认实现——内存态）
// ============================================================================

/**
 * InMemoryStore 是 MemoryStore 的内存态默认实现。
 *
 * M86.2 使用此实现进行 Runtime 验证。
 * M87+ 可替换为 localStorage / IndexedDB / 后端 API 实现。
 */
export class InMemoryStore implements MemoryStore {
  private units = new Map<string, unknown>()
  private nodes = new Map<string, unknown[]>()
  private edges = new Map<string, unknown[]>()
  private decisions = new Map<string, Decision<unknown>[]>()

  saveMemoryUnit(unit: unknown): void {
    const u = unit as { unitId: string }
    this.units.set(u.unitId, unit)
  }

  loadMemoryUnit(unitId: string): unknown | null {
    return this.units.get(unitId) ?? null
  }

  appendGrowthNode(unitId: string, node: unknown, edge: unknown): void {
    if (!this.nodes.has(unitId)) this.nodes.set(unitId, [])
    if (!this.edges.has(unitId)) this.edges.set(unitId, [])
    this.nodes.get(unitId)!.push(node)
    this.edges.get(unitId)!.push(edge)
  }

  appendDecision(unitId: string, decision: Decision<unknown>): void {
    if (!this.decisions.has(unitId)) this.decisions.set(unitId, [])
    this.decisions.get(unitId)!.push(decision)
  }

  loadGrowthGraph(unitId: string): unknown | null {
    const nodes = this.nodes.get(unitId)
    const edges = this.edges.get(unitId)
    if (!nodes || !edges) return null
    return { nodes, edges }
  }

  listUnitIds(): string[] {
    return Array.from(this.units.keys())
  }
}
