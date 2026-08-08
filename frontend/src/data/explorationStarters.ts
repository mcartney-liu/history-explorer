import type { NavNode } from '../components/navigation'

// M5-A-4: First Exploration Guide starter mapping.
//
// Every entry below is GROUNDED in the REAL topic data under
// data/examples/*_example.json — the `id` / `target.id` values are copied
// verbatim from each entity's `global_id`, and `label` / `target.name` match
// the entity's `name` field. No fabricated ids: if a slug or entity is ever
// removed from the registry, resolveStarters falls back to DEFAULT_STARTERS
// (empty → the guide renders its intro copy only, no buttons), so the UI
// stays safe.
//
// StarterItem.target is a NavNode (see components/navigation.ts): for entities
// that is { type: 'entity', id: <global_id>, name: <entity name> }.

export interface StarterItem {
  id: string
  label: string
  description?: string
  target: NavNode
}

export const TOPIC_STARTERS: Record<string, StarterItem[]> = {
  roman_empire: [
    {
      id: 'roman_empire:person-augustus',
      label: '奥古斯都',
      description: '罗马帝国的第一位皇帝，公元前27年起在位。',
      target: { type: 'entity', id: 'roman_empire:person-augustus', name: '奥古斯都' },
    },
    {
      id: 'roman_empire:civ-roman',
      label: '罗马文明',
      description: '曾统治地中海世界的文明。',
      target: { type: 'entity', id: 'roman_empire:civ-roman', name: '罗马文明' },
    },
    {
      id: 'roman_empire:religion-christianity',
      label: '基督教',
      description: '在帝国境内广泛传播的一神论信仰。',
      target: { type: 'entity', id: 'roman_empire:religion-christianity', name: '基督教' },
    },
  ],
  greek_philosophy: [
    {
      id: 'greek_philosophy:person-socrates',
      label: '苏格拉底',
      description: '雅典哲学家，苏格拉底式诘问法的开创者，柏拉图的老师。',
      target: { type: 'entity', id: 'greek_philosophy:person-socrates', name: '苏格拉底' },
    },
    {
      id: 'greek_philosophy:person-plato',
      label: '柏拉图',
      description: '苏格拉底的学生、理念论的提出者，创建了柏拉图学园。',
      target: { type: 'entity', id: 'greek_philosophy:person-plato', name: '柏拉图' },
    },
    {
      id: 'greek_philosophy:person-aristotle',
      label: '亚里士多德',
      description: '柏拉图的学生，系统化逻辑学，亚历山大大帝的老师。',
      target: { type: 'entity', id: 'greek_philosophy:person-aristotle', name: '亚里士多德' },
    },
  ],
  persian_empire: [
    {
      id: 'persian_empire:person-cyrus',
      label: '居鲁士大帝',
      description: '阿契美尼德帝国的缔造者，征服米底、吕底亚与巴比伦。',
      target: { type: 'entity', id: 'persian_empire:person-cyrus', name: '居鲁士大帝' },
    },
    {
      id: 'persian_empire:person-darius',
      label: '大流士一世',
      description: '阿契美尼德第三位国王，重组帝国，在马拉松与希腊人交战。',
      target: { type: 'entity', id: 'persian_empire:person-darius', name: '大流士一世' },
    },
    {
      id: 'persian_empire:religion-zoroastrianism',
      label: '琐罗亚斯德教',
      description: '琐罗亚斯德创立、主张善恶二元论的古波斯信仰。',
      target: { type: 'entity', id: 'persian_empire:religion-zoroastrianism', name: '琐罗亚斯德教' },
    },
  ],
  ancient_india: [
    {
      id: 'ancient_india:person-ashoka',
      label: '阿育王',
      description: '孔雀王朝皇帝，迦陵伽之战后皈依佛教并推行正法。',
      target: { type: 'entity', id: 'ancient_india:person-ashoka', name: '阿育王' },
    },
    {
      id: 'ancient_india:religion-buddhism',
      label: '佛教',
      description: '释迦牟尼关于止息苦的教导，后传遍亚洲。',
      target: { type: 'entity', id: 'ancient_india:religion-buddhism', name: '佛教' },
    },
    {
      id: 'ancient_india:civ-maurya',
      label: '孔雀王朝',
      description: '首个统一印度次大陆大部的大帝国（约公元前322—185年）。',
      target: { type: 'entity', id: 'ancient_india:civ-maurya', name: '孔雀王朝' },
    },
  ],
  hellenistic_world: [
    {
      id: 'hellenistic_world:person-alexander',
      label: '亚历山大大帝',
      description: '马其顿国王，征服波斯帝国与埃及，将希腊文化传播东方。',
      target: { type: 'entity', id: 'hellenistic_world:person-alexander', name: '亚历山大大帝' },
    },
    {
      id: 'hellenistic_world:person-cleopatra',
      label: '克利奥帕特拉七世',
      description: '托勒密埃及最后一位在位统治者，与罗马结盟，终被奥古斯都吞并。',
      target: { type: 'entity', id: 'hellenistic_world:person-cleopatra', name: '克利奥帕特拉七世' },
    },
    {
      id: 'hellenistic_world:civ-ptolemaic-egypt',
      label: '托勒密埃及',
      description: '亚历山大之后统治埃及的马其顿-希腊王朝，以亚历山大城为都。',
      target: { type: 'entity', id: 'hellenistic_world:civ-ptolemaic-egypt', name: '托勒密埃及' },
    },
  ],
  silk_road: [
    {
      id: 'silk_road:person-zhang-qian',
      label: '张骞',
      description: '汉朝使节，西行使中国与希腊化西方建立贸易联系。',
      target: { type: 'entity', id: 'silk_road:person-zhang-qian', name: '张骞' },
    },
    {
      id: 'silk_road:han_dynasty',
      label: '汉朝',
      description: '向西扩张、出产丝与纸并沿丝路贸易的中国王朝。',
      target: { type: 'entity', id: 'silk_road:han_dynasty', name: '汉朝' },
    },
    {
      id: 'silk_road:tech-paper',
      label: '造纸术',
      description: '汉代以桑皮与破布造纸的技术，沿丝路西传。',
      target: { type: 'entity', id: 'silk_road:tech-paper', name: '造纸术' },
    },
  ],
  egypt_technology_religion: [
    {
      id: 'egypt_technology_religion:event-great-pyramid-built',
      label: '吉萨大金字塔建成',
      description: '古王国时期为法老胡夫建造的陵墓。',
      target: { type: 'entity', id: 'egypt_technology_religion:event-great-pyramid-built', name: '吉萨大金字塔建成' },
    },
    {
      id: 'egypt_technology_religion:religion-ancient-egyptian',
      label: '古埃及宗教',
      description: '以诸神、来世与神庙仪式为中心的多神信仰体系。',
      target: { type: 'entity', id: 'egypt_technology_religion:religion-ancient-egyptian', name: '古埃及宗教' },
    },
    {
      id: 'egypt_technology_religion:idea-monotheism',
      label: '一神论',
      description: "The idea of a single god, first expressed in Egyptian pharaoh Akhenaten's worship of Aten.",
      target: { type: 'entity', id: 'egypt_technology_religion:idea-monotheism', name: '一神论' },
    },
  ],
  early_christianity: [
    {
      id: 'early_christianity:person-jesus',
      label: '拿撒勒人耶稣',
      description: '犹太教师，其追随者奉其为基督，是基督教的核心人物。',
      target: { type: 'entity', id: 'early_christianity:person-jesus', name: '拿撒勒人耶稣' },
    },
    {
      id: 'early_christianity:person-paul',
      label: '使徒保罗',
      description: '曾迫害教会，后成为向外邦人传道的主要使徒。',
      target: { type: 'entity', id: 'early_christianity:person-paul', name: '使徒保罗' },
    },
    {
      id: 'early_christianity:religion-early-church',
      label: '早期基督教会',
      description: "The first communities of Jesus's followers, from Jerusalem to the Gentile world.",
      target: { type: 'entity', id: 'early_christianity:religion-early-church', name: '早期基督教会' },
    },
  ],
}

// Safety net for any topic slug without a curated mapping. Empty → the guide
// shows its intro copy but no starter buttons (graceful degradation).
export const DEFAULT_STARTERS: StarterItem[] = []

export function resolveStarters(slug: string): StarterItem[] {
  return TOPIC_STARTERS[slug] ?? DEFAULT_STARTERS
}

// ---------------------------------------------------------------------------
// M5-A-5: Entity-level First Exploration Guide starter mapping.
//
// Mirrors TOPIC_STARTERS but keyed by ENTITY global_id (the value App passes
// as `current.id` when a visitor opens an entity). Every target is GROUNDED in
// the real relationship graph under data/examples/*_example.json:
//  - Same-topic targets use their entity's real `global_id`
//    (source/target local ids resolve to `{topic}:{local_id}`).
//  - Cross-topic targets use the verbatim cross-topic `global_id` already
//    present in the relationships (e.g. `hellenistic_world:civ-greek`).
// No fabricated ids: resolveEntityStarters falls back to
// DEFAULT_ENTITY_STARTERS (empty → the guide renders intro copy only) when a
// visited entity has no curated mapping.
// ---------------------------------------------------------------------------

export const ENTITY_STARTERS: Record<string, StarterItem[]> = {
  'roman_empire:civ-roman': [
    {
      id: 'roman_empire:event-roman-empire-established',
      label: '罗马帝国建立',
      description: '帝国如何于公元前27年开端。',
      target: { type: 'entity', id: 'roman_empire:event-roman-empire-established', name: '罗马帝国建立' },
    },
    {
      id: 'roman_empire:loc-rome',
      label: '罗马',
      description: '帝国心脏地带的首都。',
      target: { type: 'entity', id: 'roman_empire:loc-rome', name: '罗马' },
    },
    {
      id: 'hellenistic_world:civ-greek',
      label: '古希腊文明',
      description: '罗马继承并征服的希腊世界。',
      target: { type: 'entity', id: 'hellenistic_world:civ-greek', name: '古希腊文明' },
    },
  ],
  'hellenistic_world:person-alexander': [
    {
      id: 'hellenistic_world:event-gaugamela',
      label: '高加米拉战役',
      description: '亚历山大对波斯的决定性胜利。',
      target: { type: 'entity', id: 'hellenistic_world:event-gaugamela', name: '高加米拉战役' },
    },
    {
      id: 'hellenistic_world:civ-greek',
      label: '古希腊文明',
      description: '亚历山大东传的文化。',
      target: { type: 'entity', id: 'hellenistic_world:civ-greek', name: '古希腊文明' },
    },
    {
      id: 'egypt_technology_religion:civ-egypt',
      label: '古埃及文明',
      description: '被亚历山大征服，由其继业者统治。',
      target: { type: 'entity', id: 'egypt_technology_religion:civ-egypt', name: '古埃及文明' },
    },
  ],
  'hellenistic_world:civ-greek': [
    {
      id: 'hellenistic_world:idea-stoicism',
      label: '斯多葛主义',
      description: '推崇理性与德行的希腊学派。',
      target: { type: 'entity', id: 'hellenistic_world:idea-stoicism', name: '斯多葛主义' },
    },
    {
      id: 'hellenistic_world:idea-democracy',
      label: '民主制度',
      description: '公民自治的希腊理念。',
      target: { type: 'entity', id: 'hellenistic_world:idea-democracy', name: '民主制度' },
    },
  ],
  'greek_philosophy:person-socrates': [
    {
      id: 'greek_philosophy:person-plato',
      label: '柏拉图',
      description: '苏格拉底的学生、学园的创建者。',
      target: { type: 'entity', id: 'greek_philosophy:person-plato', name: '柏拉图' },
    },
    {
      id: 'greek_philosophy:loc-athens',
      label: '雅典',
      description: '苏格拉底讲学的城市。',
      target: { type: 'entity', id: 'greek_philosophy:loc-athens', name: '雅典' },
    },
    {
      id: 'hellenistic_world:idea-democracy',
      label: '民主制度',
      description: '诞生于希腊城邦的政治理念。',
      target: { type: 'entity', id: 'hellenistic_world:idea-democracy', name: '民主制度' },
    },
  ],
  'greek_philosophy:person-plato': [
    {
      id: 'greek_philosophy:person-aristotle',
      label: '亚里士多德',
      description: '柏拉图的学生，系统化逻辑学。',
      target: { type: 'entity', id: 'greek_philosophy:person-aristotle', name: '亚里士多德' },
    },
    {
      id: 'greek_philosophy:event-academy-founded',
      label: "Plato's Academy Founded",
      description: '柏拉图在雅典创立学园。',
      target: { type: 'entity', id: 'greek_philosophy:event-academy-founded', name: "Plato's Academy Founded" },
    },
    {
      id: 'greek_philosophy:idea-theory-forms',
      label: '理念论',
      description: '柏拉图关于完美抽象理型的学说。',
      target: { type: 'entity', id: 'greek_philosophy:idea-theory-forms', name: '理念论' },
    },
  ],
  'greek_philosophy:person-aristotle': [
    {
      id: 'hellenistic_world:person-alexander',
      label: '亚历山大大帝',
      description: '亚里士多德的学生，未来的征服者。',
      target: { type: 'entity', id: 'hellenistic_world:person-alexander', name: '亚历山大大帝' },
    },
    {
      id: 'greek_philosophy:idea-logic',
      label: '逻辑学与三段论',
      description: '亚里士多德关于有效推理的形式化体系。',
      target: { type: 'entity', id: 'greek_philosophy:idea-logic', name: '逻辑学与三段论' },
    },
    {
      id: 'greek_philosophy:loc-lyceum',
      label: '吕克昂学园',
      description: '亚里士多德在雅典的逍遥学派学园。',
      target: { type: 'entity', id: 'greek_philosophy:loc-lyceum', name: '吕克昂学园' },
    },
  ],
  'persian_empire:civ-persian': [
    {
      id: 'persian_empire:religion-zoroastrianism',
      label: '琐罗亚斯德教',
      description: '古波斯的一神论信仰。',
      target: { type: 'entity', id: 'persian_empire:religion-zoroastrianism', name: '琐罗亚斯德教' },
    },
    {
      id: 'hellenistic_world:person-alexander',
      label: '亚历山大大帝',
      description: '征服波斯帝国的人。',
      target: { type: 'entity', id: 'hellenistic_world:person-alexander', name: '亚历山大大帝' },
    },
    {
      id: 'silk_road:silk_road',
      label: '丝绸之路',
      description: '运输波斯货品东来西往的商路。',
      target: { type: 'entity', id: 'silk_road:silk_road', name: '丝绸之路' },
    },
  ],
  'egypt_technology_religion:civ-egypt': [
    {
      id: 'egypt_technology_religion:tech-papyrus',
      label: '莎草纸制造',
      description: '埃及的书写材料，传遍各文明。',
      target: { type: 'entity', id: 'egypt_technology_religion:tech-papyrus', name: '莎草纸制造' },
    },
    {
      id: 'egypt_technology_religion:religion-ancient-egyptian',
      label: '古埃及宗教',
      description: '尼罗河谷的多神信仰。',
      target: { type: 'entity', id: 'egypt_technology_religion:religion-ancient-egyptian', name: '古埃及宗教' },
    },
    {
      id: 'egypt_technology_religion:idea-monotheism',
      label: '一神论',
      description: '单一神祇的观念，最早出现于埃及。',
      target: { type: 'entity', id: 'egypt_technology_religion:idea-monotheism', name: '一神论' },
    },
  ],
  'egypt_technology_religion:tech-papyrus': [
    {
      id: 'egypt_technology_religion:religion-ancient-egyptian',
      label: '古埃及宗教',
      description: '莎草纸支撑了神庙与行政的文书记录。',
      target: { type: 'entity', id: 'egypt_technology_religion:religion-ancient-egyptian', name: '古埃及宗教' },
    },
    {
      id: 'hellenistic_world:civ-greek',
      label: '古希腊文明',
      description: '莎草纸传入希腊世界。',
      target: { type: 'entity', id: 'hellenistic_world:civ-greek', name: '古希腊文明' },
    },
    {
      id: 'roman_empire:civ-roman',
      label: '罗马文明',
      description: '莎草纸传入罗马。',
      target: { type: 'entity', id: 'roman_empire:civ-roman', name: '罗马文明' },
    },
  ],
  'ancient_india:civ-maurya': [
    {
      id: 'ancient_india:religion-buddhism',
      label: '佛教',
      description: '在孔雀王朝时期兴盛起来的信仰。',
      target: { type: 'entity', id: 'ancient_india:religion-buddhism', name: '佛教' },
    },
    {
      id: 'ancient_india:loc-pataliputra',
      label: '华氏城',
      description: '孔雀王朝的首都。',
      target: { type: 'entity', id: 'ancient_india:loc-pataliputra', name: '华氏城' },
    },
    {
      id: 'persian_empire:civ-persian',
      label: '阿契美尼德波斯帝国',
      description: '与孔雀王朝同时代的文明。',
      target: { type: 'entity', id: 'persian_empire:civ-persian', name: '阿契美尼德波斯帝国' },
    },
  ],
  'ancient_india:religion-buddhism': [
    {
      id: 'ancient_india:loc-pataliputra',
      label: '华氏城',
      description: '佛教世界的一个中心。',
      target: { type: 'entity', id: 'ancient_india:loc-pataliputra', name: '华氏城' },
    },
    {
      id: 'silk_road:silk_road',
      label: '丝绸之路',
      description: '将佛教传遍亚洲的商路。',
      target: { type: 'entity', id: 'silk_road:silk_road', name: '丝绸之路' },
    },
    {
      id: 'silk_road:han_dynasty',
      label: '汉朝',
      description: '经商路接受佛教的文明。',
      target: { type: 'entity', id: 'silk_road:han_dynasty', name: '汉朝' },
    },
  ],
  'early_christianity:person-jesus': [
    {
      id: 'early_christianity:event-crucifixion',
      label: '耶稣受难',
      description: '该信仰的关键事件。',
      target: { type: 'entity', id: 'early_christianity:event-crucifixion', name: '耶稣受难' },
    },
    {
      id: 'early_christianity:loc-jerusalem',
      label: '耶路撒冷',
      description: '耶稣传道与受难的城市。',
      target: { type: 'entity', id: 'early_christianity:loc-jerusalem', name: '耶路撒冷' },
    },
    {
      id: 'roman_empire:religion-christianity',
      label: '基督教',
      description: '在罗马世界扎根的信仰。',
      target: { type: 'entity', id: 'roman_empire:religion-christianity', name: '基督教' },
    },
  ],
  'early_christianity:religion-early-church': [
    {
      id: 'early_christianity:loc-jerusalem',
      label: '耶路撒冷',
      description: '第一座教会诞生之地。',
      target: { type: 'entity', id: 'early_christianity:loc-jerusalem', name: '耶路撒冷' },
    },
    {
      id: 'roman_empire:religion-christianity',
      label: '基督教',
      description: '早期教会传承下去的信仰。',
      target: { type: 'entity', id: 'roman_empire:religion-christianity', name: '基督教' },
    },
    {
      id: 'roman_empire:civ-roman',
      label: '罗马文明',
      description: '教会传入其中的帝国。',
      target: { type: 'entity', id: 'roman_empire:civ-roman', name: '罗马文明' },
    },
  ],
  'silk_road:silk_road': [
    {
      id: 'roman_empire:civ-roman',
      label: '罗马文明',
      description: '商路在地中海一端的终点。',
      target: { type: 'entity', id: 'roman_empire:civ-roman', name: '罗马文明' },
    },
  ],
}

// Safety net for any entity global_id without a curated mapping.
export const DEFAULT_ENTITY_STARTERS: StarterItem[] = []

export function resolveEntityStarters(globalId: string): StarterItem[] {
  return ENTITY_STARTERS[globalId] ?? DEFAULT_ENTITY_STARTERS
}
