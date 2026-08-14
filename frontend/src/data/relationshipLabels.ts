// ============================================================
// 关系类型 → 中文标签（18 种冻结关系枚举的唯一映射）
// ------------------------------------------------------------
// 从 ConnectionCard.tsx 移出（2026-08-15，入口桥需要复用），供
// ConnectionCard 与 EntityPage「入口桥」等共同使用。任何未列出的类型
// 回退到 snake_case 美化（绝不显示裸 token、绝不发明含义）。
// ============================================================

export const REL_LABELS: Record<string, string> = {
  before: '早于',
  after: '晚于',
  caused: '导致',
  resulted_in: '促成',
  participated_in: '参与',
  related_to: '关联于',
  practiced: '信奉',
  influenced: '影响',
  influenced_by: '受……影响',
  inherited: '继承',
  traded_with: '贸易往来',
  ruled: '统治',
  founded: '创立',
  succeeded: '继任',
  part_of: '属于',
  located_in: '位于',
  born_in: '生于',
  died_in: '卒于',
  wrote: '著述',
  spread_to: '传播至',
}

export function relLabel(type: string): string {
  return REL_LABELS[type] ?? type.replace(/_/g, ' ')
}
