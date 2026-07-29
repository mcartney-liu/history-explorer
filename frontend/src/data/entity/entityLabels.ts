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
  Person: '\u{1F464}',
  Civilization: '\u{1F3DB}',
  Event: '\u2694',
  Location: '\u{1F4CD}',
  'Time Period': '\u23F3',
  Technology: '\u2699',
  Religion: '\u{1F6D0}',
  Idea: '\u{1F4A1}',
}

export function getEntityLabel(type: string): string {
  return ENTITY_TYPE_LABELS[type] || type
}

export function getEntityIcon(type: string): string {
  return ENTITY_TYPE_ICONS[type] || '\u{1F310}'
}
