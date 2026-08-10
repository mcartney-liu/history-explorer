// Human-readable display names for CausalObject IDs.
// Per M85 Architecture Constitution:
//   P2 Understanding Layer ≠ Recommendation Layer
//   P3 Relationship ≠ AI Generated Connection
// These are curated labels, not AI-generated, not derived from graph edges.
//
// Single source of truth — all components that need to display a causal
// object name MUST resolve through this map. Fallback to the raw id is
// only acceptable when the id is genuinely unknown (dev/debug context).

export const CAUSAL_OBJECT_DISPLAY_NAMES: Record<string, string> = {
  'co-001': '秦汉中央集权',
  'co-002': '丝绸之路贸易',
  'co-003': '佛教传入中国',
  'co-004': '科举制度',
  'co-005': '造纸术传播',
  'co-006': '罗马法律体系',
  'co-007': '基督教传播',
  'co-008': '印刷术革命',
  'co-009': '罗马法与秦制对比',
  'co-010': '火药技术传播',
  'co-011': '蒙古帝国扩张',
  'co-012': '大航海时代',
}

/** Resolve a CausalObject id to its human-readable name. */
export function getCausalObjectName(objectId: string): string {
  return CAUSAL_OBJECT_DISPLAY_NAMES[objectId] ?? objectId
}
