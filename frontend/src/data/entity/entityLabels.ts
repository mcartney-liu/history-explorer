// ============================================================
// M59-005 — Entity Labels & Display Constants
// Centralized Chinese labels, icons, and display metadata
// for all 8 entity types. Single source of truth.
// ============================================================

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  Person: '人物',
  Civilization: '文明',
  Event: '事件',
  Location: '地点',
  'Time Period': '时期',
  Technology: '技术',
  Religion: '宗教',
  Idea: '思想',
}

export const ENTITY_TYPE_ICONS: Record<string, string> = {
  Person: 'person',
  Civilization: 'civilization',
  Event: 'event',
  Location: 'location',
  'Time Period': 'time-period',
  Technology: 'technology',
  Religion: 'religion',
  Idea: 'idea',
}

// W3 — 实体类型本地化（补充 en/ja；zh 复用既有 ENTITY_TYPE_LABELS 以保持向后兼容）
const ENTITY_TYPE_LABELS_EN: Record<string, string> = {
  Person: 'Person',
  Civilization: 'Civilization',
  Event: 'Event',
  Location: 'Location',
  'Time Period': 'Time Period',
  Technology: 'Technology',
  Religion: 'Religion',
  Idea: 'Idea',
}

const ENTITY_TYPE_LABELS_JA: Record<string, string> = {
  Person: '人物',
  Civilization: '文明',
  Event: '事件',
  Location: '地点',
  'Time Period': '時期',
  Technology: '技術',
  Religion: '宗教',
  Idea: '思想',
}

export function getEntityLabel(type: string, locale: 'zh' | 'en' | 'ja' = 'zh'): string {
  const map = locale === 'en' ? ENTITY_TYPE_LABELS_EN : locale === 'ja' ? ENTITY_TYPE_LABELS_JA : ENTITY_TYPE_LABELS
  return map[type] || ENTITY_TYPE_LABELS[type] || type
}

export function getEntityIcon(type: string): string {
  return ENTITY_TYPE_ICONS[type] || 'globe'
}
