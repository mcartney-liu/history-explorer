// ============================================================
// 探索剧本化 ③/④ — 来源包握手（one-shot handoff, 可重复读取）
// ------------------------------------------------------------
// 问题：进包后点实体会触发 closePackage()（PO 2026-08-11 红线），
// packageSlug 被清空，实体页就拿不到"我是从哪个包进来的"。
// 解法：在 openEntity 调用 closePackage() 之前，把来源包 slug 按实体
// global id 暂存，实体页的多个消费者（连接卡 ③ / 下一步面板 ④）都能按
// entityGid 读取它，分别回答"这一站跟包有啥关系"和"剧本的下一站去哪"。
// closePackage 红线照常执行，不推翻。
//
// 存储改为 Map<entityGid, slug>（按实体分别暂存，避免跨站串卡）；
// take / peek 都只读不删 —— EntityPage 用 key=current.id 重挂保证只在
// 匹配实体上出现一次，无需消费式清除。
// ============================================================

const CAP = 32
const originByEntity = new Map<string, string>()

/** Stash the package the user is navigating FROM, keyed to the entity being opened. */
export function setPackageOrigin(slug: string, entityGid: string): void {
  originByEntity.set(entityGid, slug)
  // LRU cap: drop the oldest key if over capacity (module-scope, HMR resets).
  if (originByEntity.size > CAP) {
    const oldest = originByEntity.keys().next().value
    if (typeof oldest === 'string') originByEntity.delete(oldest)
  }
}

/** Read the origin for this entity WITHOUT clearing (used by ConnectionCard ③). */
export function takePackageOrigin(entityGid: string | undefined): string | null {
  if (!entityGid) return null
  return originByEntity.get(entityGid) ?? null
}

/** Read-only peek (used by NextStepPanel ④ for the scripted next-step). */
export function peekPackageOrigin(entityGid: string | undefined): string | null {
  if (!entityGid) return null
  return originByEntity.get(entityGid) ?? null
}
