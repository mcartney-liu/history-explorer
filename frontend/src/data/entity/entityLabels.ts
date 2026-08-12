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

// ============================================================
// Relationship type → visual category (colored Badge grouping)
// Groups the 18 frozen relationship types (+ ADR-0019 disputes/
// reinterprets) into 6 UX categories so the "探索建议" can render
// causal / evolution / political / cultural / economic / association
// links with distinct colors instead of a flat text log.
// ============================================================

export type RelationshipCategory =
  | 'causal'
  | 'inheritance'
  | 'political'
  | 'cultural'
  | 'economic'
  | 'association'

export const RELATIONSHIP_CATEGORY_LABELS: Record<RelationshipCategory, string> = {
  causal: '因果',
  inheritance: '演变',
  political: '政权',
  cultural: '文化',
  economic: '贸易',
  association: '关联',
}

const RELATIONSHIP_CATEGORY_MAP: Record<string, RelationshipCategory> = {
  // 因果：导致 / 影响 / 征服
  caused: 'causal',
  influenced: 'causal',
  conquered: 'causal',
  // 演变：继承 / 属于 / 时间先后 / 同时代
  inherited: 'inheritance',
  part_of: 'inheritance',
  before: 'inheritance',
  after: 'inheritance',
  contemporary_with: 'inheritance',
  // 政权：统治 / 参与
  ruled: 'political',
  participated_in: 'political',
  // 贸易：经济往来
  traded_with: 'economic',
  // 文化：传播 / 实践 / 语言 / 发明 / 发现
  spread: 'cultural',
  practiced: 'cultural',
  spoke: 'cultural',
  invented: 'cultural',
  discovered: 'cultural',
  // 关联（兜底）：关联 / 位于 / 争议 / 重新解释
  related_to: 'association',
  located_at: 'association',
  disputes: 'association',
  reinterprets: 'association',
}

export function getRelationshipCategory(relType: string): RelationshipCategory {
  return RELATIONSHIP_CATEGORY_MAP[relType] || 'association'
}

/** CSS class suffix for the relationship-category badge color. */
export const RELATIONSHIP_CATEGORY_CLASS: Record<RelationshipCategory, string> = {
  causal: 'rel-causal',
  inheritance: 'rel-inheritance',
  political: 'rel-political',
  cultural: 'rel-cultural',
  economic: 'rel-economic',
  association: 'rel-association',
}

// ============================================================
// Entity display-name mapping (English backend names → Chinese)
//
// The backend API returns English names for some entities/events.
// This mapping provides Chinese display names for known entities.
// Unknown names pass through unchanged.
// Long-term fix: backend should return localized names (B-class item).
// ============================================================

export const ENTITY_DISPLAY_NAMES: Record<string, string> = {
  // Events
  'Roman Empire Established': '罗马帝国建立',
  'Roman Empire Founded': '罗马帝国建国',
  // Raw entity IDs from backend (global_id suffixes)
  'event-pax-romana': '罗马治世',
  'event-republic-end': '罗马共和国终结',
  'person-augustus': '奥古斯都（屋大维）',
  'roman_egypt': '罗马埃及行省',
  'religion-christianity': '基督教',
  'civ-byzantine': '拜占庭帝国',
  'event-empire-fall': '西罗马帝国灭亡',
  // Civilizations / Topics
  'Roman Empire': '罗马帝国',
  'Roman Civilization': '罗马文明',
  'Byzantine Empire': '拜占庭帝国',
  'Roman Egypt': '罗马埃及',
  'Rome': '罗马城',
  // Persons
  'Augustus': '奥古斯都',
  'Augustus (Octavian)': '奥古斯都（屋大维）',
  'Gaius Octavius': '盖乌斯·屋大维',
  // Common fallback patterns
}

/**
 * Map an English backend entity name (or raw ID) to its Chinese display name.
 * Returns the original name if no mapping exists.
 * @param name - Entity name or raw ID from backend
 * @param locale - Current locale ('zh'|'en'|'ja'), default 'zh'
 */
export function getEntityDisplayName(name: string, locale: string = 'zh'): string {
  // For non-Chinese locales, still try mapping but don't force
  const mapped = ENTITY_DISPLAY_NAMES[name]
  if (mapped && locale === 'zh') return mapped
  return name
}

/**
 * Format a raw source ID (e.g. "roman_empire:person-augustus" or "arc-tacitus-ann")
 * into a human-readable reference string.
 */
export function formatSourceId(sourceId: string): string {
  // If it looks like a global_id (topic:entity), extract the meaningful part
  if (sourceId.includes(':')) {
    const parts = sourceId.split(':')
    // Show only the entity part, replacing underscores with spaces
    const entityPart = parts.slice(1).join(':').replace(/_/g, ' ')
    return entityPart
  }
  // For arc-* source IDs, show a cleaner version
  if (sourceId.startsWith('arc-') || sourceId.startsWith('src-')) {
    return sourceId.replace(/^(arc|src)-/, '').replace(/-/g, ' ')
  }
  return sourceId
}

// ============================================================
// Evidence text — citation-verbatim policy (ADR-0020).
//
// Per the bilingual-switch decision, evidence / citation text is NOT
// translated: references stay in their original language for academic
// integrity (a translated citation is a distorted citation). The display
// layer renders the backend text verbatim. The earlier EVIDENCE_TEXT_MAP
// Chinese patch is retired by this ADR.
// ============================================================

/**
 * Evidence / citation text is rendered verbatim (no translation).
 * Kept as a stable seam so callers don't need to change; returns input as-is.
 */
export function translateEvidenceText(text: string): string {
  return text
}
