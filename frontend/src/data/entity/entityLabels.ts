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

export function getEntityLabel(type: string): string {
  return ENTITY_TYPE_LABELS[type] || type
}

export function getEntityIcon(type: string): string {
  return ENTITY_TYPE_ICONS[type] || 'globe'
}
