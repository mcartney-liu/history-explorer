// ============================================================
// 入口桥（Origin Bridge）— 来源实体握手（one-shot handoff, 可重复读取）
// ------------------------------------------------------------
// 问题：从实体 A 点相关实体/关系链跳进实体 B 后，B 页面不知道"我是从
// A 来的"，体验割裂（PO 2026-08-15）。
// 解法：在 openEntity 跳转前，把来源实体 id 按目标实体 global id 暂存，
// 实体页的「入口桥」承接块按 entityGid 读取，显示"A ↔ B 的真实关系边"
// 或降级"从「A」的探索延续而来"。同一目标从不同来源进入时，读到的是
// 最近一次来源 → 桥随入口变化。
//
// 存储为 Map<targetGid, fromGid>（keyed 到目标实体，避免跨实体串桥）；
// take / peek 都只读不删 —— EntityPage 用 key=current.id 重挂保证只在
// 匹配实体上出现一次，无需消费式清除。与 packageOrigin（来源包）互补：
// 包入口显示连接卡，任意实体跳转显示入口桥。
// ============================================================

const CAP = 32
const originByEntity = new Map<string, string>()

/** Stash the entity the user is navigating FROM, keyed to the entity being opened. */
export function setOriginEntity(fromGid: string, targetGid: string): void {
  originByEntity.set(targetGid, fromGid)
  // LRU cap: drop the oldest key if over capacity (module-scope, HMR resets).
  if (originByEntity.size > CAP) {
    const oldest = originByEntity.keys().next().value
    if (typeof oldest === 'string') originByEntity.delete(oldest)
  }
}

/** Read the origin entity for this entity WITHOUT clearing. */
export function takeOriginEntity(entityGid: string | undefined): string | null {
  if (!entityGid) return null
  return originByEntity.get(entityGid) ?? null
}

/** Read-only peek. */
export function peekOriginEntity(entityGid: string | undefined): string | null {
  if (!entityGid) return null
  return originByEntity.get(entityGid) ?? null
}
