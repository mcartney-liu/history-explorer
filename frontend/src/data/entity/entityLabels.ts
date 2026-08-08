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

// ============================================================
// Relationship type → Chinese business labels (single source of truth)
// Mirrors the entity-label pattern above. Keys are the 18 frozen
// relationship types (lowercase slugs from the schema). Display guarantees:
// data layer keeps the English slug; only the presentation layer maps it.
// ============================================================

export const RELATIONSHIP_TYPE_LABELS: Record<string, string> = {
  caused: '导致',
  influenced: '影响',
  participated_in: '参与',
  located_at: '位于',
  related_to: '关联',
  before: '早于',
  after: '晚于',
  contemporary_with: '同时代',
  part_of: '属于',
  ruled: '统治',
  traded_with: '贸易往来',
  invented: '发明',
  discovered: '发现',
  practiced: '实践',
  spoke: '使用语言',
  inherited: '继承为',
  conquered: '征服',
  spread: '传播',
  // ADR-0019 (Wave2-#138): Truth-layer dissent navigation
  disputes: '存在争议',
  reinterprets: '重新解释',
}

const RELATIONSHIP_TYPE_LABELS_EN: Record<string, string> = {
  caused: 'Caused',
  influenced: 'Influenced',
  participated_in: 'Participated In',
  located_at: 'Located At',
  related_to: 'Related To',
  before: 'Before',
  after: 'After',
  contemporary_with: 'Contemporary With',
  part_of: 'Part Of',
  ruled: 'Ruled',
  traded_with: 'Traded With',
  invented: 'Invented',
  discovered: 'Discovered',
  practiced: 'Practiced',
  spoke: 'Spoke',
  inherited: 'Inherited',
  conquered: 'Conquered',
  spread: 'Spread',
  // ADR-0019
  disputes: 'Disputed',
  reinterprets: 'Reinterprets',
}

const RELATIONSHIP_TYPE_LABELS_JA: Record<string, string> = {
  caused: '引き起こした',
  influenced: '影響を与えた',
  participated_in: '参加',
  located_at: '所在',
  related_to: '関連',
  before: '以前',
  after: '以後',
  contemporary_with: '同時代',
  part_of: '一部',
  ruled: '支配',
  traded_with: '交易',
  invented: '発明',
  discovered: '発見',
  practiced: '実践',
  spoke: '話した',
  inherited: '継承',
  conquered: '征服',
  spread: '普及',
  // ADR-0019
  disputes: '論争',
  reinterprets: '再解釈',
}

export function getRelationshipLabel(
  relType: string,
  locale: 'zh' | 'en' | 'ja' = 'zh',
): string {
  const map =
    locale === 'en'
      ? RELATIONSHIP_TYPE_LABELS_EN
      : locale === 'ja'
        ? RELATIONSHIP_TYPE_LABELS_JA
        : RELATIONSHIP_TYPE_LABELS
  return map[relType] || RELATIONSHIP_TYPE_LABELS[relType] || relType
}
