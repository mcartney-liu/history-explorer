// ============================================================
// 实体详情邻居缓存（会话级，Transition Function v2 多跳路径桥数据基础）
// ------------------------------------------------------------
// 背景：前端无全局实体图，查任意实体邻居需网络请求。但过渡场景
// （入口桥/站间衔接）里"来源实体"的详情刚被 fetchNode 加载过——
// 把每个实体详情的邻居按 gid 缓存，找"共同邻居"路径（A—C—B）时
// 零网络请求，纯内存。
//
// 只缓存"邻居引用"（gid + name），不缓存整个 EntityDetail：
// 避免与实体详情类型/数据版本耦合，最小内存占用。
// LRU cap 防无限增长（module-scope，HMR 重置）。
// ============================================================

export interface NeighborRef {
  /** 邻居的 global_id（回退 local id）。 */
  gid: string
  name: string
}

const CAP = 64
const neighborsByEntity = new Map<string, NeighborRef[]>()

/** 暂存某实体的邻居列表（由 App.fetchNode entity 分支写入）。 */
export function cacheEntityNeighbors(targetGid: string, neighbors: NeighborRef[]): void {
  if (!targetGid || neighbors.length === 0) return
  neighborsByEntity.set(targetGid, neighbors)
  if (neighborsByEntity.size > CAP) {
    const oldest = neighborsByEntity.keys().next().value
    if (typeof oldest === 'string') neighborsByEntity.delete(oldest)
  }
}

/** 读某实体的邻居（无缓存返回 null）。 */
export function getEntityNeighbors(gid: string | undefined): NeighborRef[] | null {
  if (!gid) return null
  return neighborsByEntity.get(gid) ?? null
}
