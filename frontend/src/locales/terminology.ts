// Terminology Layer — 领域概念本地化（Stage B 才接入组件消费）
// 结构：每个术语按 locale 提供 canonical 形式；专业模式（P1）将直接展示 en canonical。
export const terminology = {
  Entity: { zh: '实体', en: 'Entity', ja: '実体' },
  Relationship: { zh: '关系', en: 'Relationship', ja: '関係' },
  Timeline: { zh: '时间线', en: 'Timeline', ja: 'タイムライン' },
  Journey: { zh: '历程', en: 'Journey', ja: '旅路' },
  Trust: { zh: '信任', en: 'Trust', ja: '信頼' },
  Evidence: { zh: '证据', en: 'Evidence', ja: '証拠' },
  Historian: { zh: '史家', en: 'Historian', ja: '歴史家' },
  Discovery: { zh: '发现', en: 'Discovery', ja: '発見' },
  Knowledge: { zh: '知识', en: 'Knowledge', ja: '知識' },
}

// W3 — Terminology Access Layer
// 提供领域概念术语的本地化访问；专业模式（P1）将直接展示 en canonical。
export type TermId = keyof typeof terminology

export function getTermLabel(id: string, locale: 'zh' | 'en' | 'ja' = 'zh'): string {
  const entry = (terminology as Record<string, { zh: string; en: string; ja: string }>)[id]
  if (!entry) return id
  return entry[locale] || entry.zh || id
}
