// M35 — curated narrative layer (hand-authored, grounded in data/examples).
//
// GOVERNANCE: This file is the single source of truth for the "story" and
// "why it matters" copy shown by StorySection / WhyImportantPanel. It is
// 100% hand-written constant data. NO AI / LLM generation is used to produce
// any string here (Judgment Rule §10.4 not triggered). Every key MUST map to
// a real node in data/examples (see narrative.test.ts grounding check):
//   - topic keys (no ':')  -> data/examples/<key>_example.json
//   - entity global_ids    -> appear inside data/examples/<topic>_example.json

export interface NarrativeBlock {
  story?: string
  whyImportant?: string
}

// Demo Chain coverage (Phase 4 initial scope):
//   silk_road                         -> topic (trade network)
//   ancient_india:religion-buddhism   -> entity (spread via Silk Road)
//   roman_empire:civ-roman            -> entity (western trade terminus)
export const NARRATIVE: Record<string, NarrativeBlock> = {
  silk_road: {
    story:
      '丝绸之路不是一条路，而是一张把东亚、中亚、南亚、波斯与地中海连起来的贸易与相遇之网。' +
      '货物、信仰与技术沿着它双向流动：中国的丝绸与造纸术向西传播，葡萄、苜蓿与佛教向东传入。',
    whyImportant:
      '它让相隔数千公里的文明第一次持续地彼此看见——罗马的玻璃、波斯的银器、印度的佛教、' +
      '中原的纸张，在同一条商路上相遇。理解丝绸之路，就是理解古代世界为何是一个整体。',
  },
  'ancient_india:religion-buddhism': {
    story:
      '佛教于公元前数世纪在古印度兴起，随后沿着贸易路线向外传播。商旅与僧侣把经典与造像带过' +
      '帕米尔高原，进入中亚与东亚，在丝绸之路上留下大量石窟与寺院。',
    whyImportant:
      '作为世界主要宗教之一，佛教的东传是丝绸之路"不止于货物"的最佳证据：一条商路同时运送思想。' +
      '它在东亚塑造了艺术、语言与日常伦理，影响延续至今。',
  },
  'roman_empire:civ-roman': {
    story:
      '罗马文明是丝绸之路西端的巨型买家与生产者。罗马对东方丝绸的渴望推动了横贯欧亚的贸易；' +
      '作为交换，罗马的玻璃器、金银器与钱币出现在远东。',
    whyImportant:
      '罗马代表丝绸之路的西方终点：它对丝绸的需求，正是这条商路能维持数百年的经济引擎。' +
      '没有罗马的市场，欧亚之间的长距离贸易不会如此繁荣。',
  },
  'roman_empire:event-empire-fall': {
    story:
      '西罗马帝国的灭亡，传统上以公元476年罗慕路斯·奥古斯都退位为标志。它不是某一个瞬间的崩塌，' +
      '而是多重因素长期累积的结果：财政危机侵蚀了军团的供给，边疆压力让防线不断收缩，' +
      '基督教化改变了帝国精英的价值取向，道德衰败与制度僵化则削弱了统治的韧性。' +
      '当西部各行省在迁徙浪潮中逐一失控，帝国在西欧的统治最终落幕——而东部，' +
      '则以拜占庭的名义继续存在了近千年。',
    whyImportant:
      '西罗马帝国的灭亡是欧洲历史的分水岭：它划定了古典时代与中世纪的边界。' +
      '此后的西欧不再是单一帝国的天下，而是裂解为诸多日耳曼王国；它们与罗马的遗制' +
      '（拉丁语、法典、教会）交织，塑造了欧洲政治与文化的基本格局。' +
      '理解这场灭亡，就是理解欧洲如何从"帝国"走向"诸国"。',
  },
  roman_empire: {
    story:
      '罗马从台伯河畔的一个小城邦，逐步扩张为环绕地中海的帝国。它用道路、引水渠与' +
      '法典把远隔千里的行省连成一体：公民权沿着边界向外授予，法律的治理逐渐取代' +
      '单纯的征服。帝国的秩序让商品、技术与信仰在地中海世界持续流动。',
    whyImportant:
      '罗马留下了至今仍在运行的东西：成文法传统、基于工程的公共设施，以及"公民"' +
      '这一政治身份。欧洲的语言、法律与城市格局都带着罗马的痕迹；理解罗马，就是' +
      '理解现代政治与城市文明的源头之一。',
  },
  ancient_india: {
    story: '古印度文明扎根于印度河与恒河之间。孔雀王朝在阿育王时期达到顶峰，而羯陵伽战争后的转变，让佛教从地方信仰走向跨区域传播；沿贸易路线，佛教的思想与艺术一路传入东亚。',
    whyImportant: '古印度贡献了至今仍在使用的东西：十进制与"零"的概念、非暴力的伦理传统，以及世界主要宗教之一的佛教。理解古印度，是理解数学、伦理与亚洲精神版图的一把钥匙。',
  },
  china_civilization_v1: {
    story: '中国文明在唐至清的一千多年里，沿文化、制度与技术三条线索持续演化。科举把人才选拔纳入统一轨道，印刷术与火药随贸易和战争扩散，而朝代更替背后是同一套治理逻辑的延续与调整。',
    whyImportant: '中国文明最独特之处，是文字、制度与历史意识的连续不断——三千年未曾中断。理解这套演化，才能理解"中国"为何是一个文明共同体，而不只是一个国家。',
  },
  early_christianity: {
    story: '基督教始于公元1世纪巴勒斯坦的一个犹太弥赛亚运动。耶稣的受难与门徒的见证让它在耶路撒冷扎根；而保罗的远行把信息带出犹太社群，传向希腊罗马城市，使它成为普世信仰。',
    whyImportant: '早期基督教重塑了地中海世界的宗教版图：它把"救赎"从民族特权变成向所有人开放，并奠定了欧洲此后千年的文化与道德框架。理解它的起源，是理解西方文明的一把钥匙。',
  },
  egypt_technology_religion: {
    story: '古埃及文明沿尼罗河生长。河水定时泛滥带来沃土，也催生了测量与历法；而为来世信仰服务的金字塔与神庙，把石工、数学与组织能力推向极限。纸草作为书写材料，让知识与行政得以积累。',
    whyImportant: '古埃及把"宗教"与"国家工程"拧成一体：神庙即国库，金字塔即国家动员能力的证明。它与美索不达米亚并列为西方文明最古老的两个源头；理解它，就理解了"文明"最早的形态之一。',
  },
  greek_philosophy: {
    story: '希腊哲学始于对"世界为何如此"的追问。从苏格拉底的诘问、柏拉图的学园，到亚里士多德对几乎所有领域的分类，雅典把思考从神话叙事转向理性论证，并经由罗马与后世大学延续两千年。',
    whyImportant: '希腊哲学奠定了西方思想的方法论：用论证而非权威、用概念而非隐喻来理解世界。科学、逻辑与民主辩论的背后都有它的影子。理解希腊哲学，就是理解"理性"这件事本身。',
  },
  hellenistic_world: {
    story: '亚历山大的征服把希腊语与希腊文化从中海东岸一路铺到印度河边。高加米拉之战后，一个连接法老埃及、波斯故地与希腊本土的希腊语世界形成；托勒密埃及等王国在此交叠，科学在亚历山大城达到高峰。',
    whyImportant: '希腊化世界是东西方真正的第一次大规模融合：它把希腊的理性与东方的帝国治理、埃及的古老文明拧在一起，并为后来的罗马提供了文化与人才。理解它，才能理解"希腊"为何不止属于希腊。',
  },
  persian_empire: {
    story: '阿契美尼德波斯是历史上第一个横跨三大洲的帝国。居鲁士的征服以宽容治理取代屠城，驿道把苏萨到萨迪斯连成一体，而它对被征服民族信仰的容忍，让这个多民族帝国维持了数个世纪。',
    whyImportant: '波斯帝国示范了一种全新的统治逻辑——不靠同化，而靠道路、邮政与制度把差异巨大的民族纳入同一秩序。它的治理遗产影响了后来的罗马帝国与伊斯兰哈里发。理解波斯，是理解"帝国"可以如何包容。',
  },
  textbook_cn_history_v1: {
    story: '这一包抽取了义务教育教科书《中国历史》前两单元的核心事实：从早期人类与农耕起源，到王朝更替与制度初创。武王伐纣标志着商周易代，而夏商周三代奠定了后世"天命""礼乐"等基本概念。',
    whyImportant: '它把教科书里的知识点连成一张可探索的网络，而不是孤立的考点。理解史前到夏商周，是理解中国文明"从何处起"的第一块基石——文字、国家与礼制都在此萌芽。',
  },
}

export function getNarrative(key: string): NarrativeBlock | undefined {
  return NARRATIVE[key]
}

export function hasNarrative(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(NARRATIVE, key)
}

// M35.1 — normalize a possibly-partial navigation target into the canonical
// narrative key consumed by NARRATIVE / StorySection / WhyImportantPanel.
//   - global_id present  -> use it verbatim (entity key)
//   - topic + id present  -> `${topic}:${id}` (reconstruct entity global_id)
//   - topic only          -> the topic slug (topic key)
//   - otherwise           -> '' (safe fallback; panels render null)
// This lets the Search entry recover the entity global_id that the backend's
// /search response strips, so the narrative panels can match the node.
export function resolveNarrativeKey(input: {
  global_id?: string
  topic?: string
  id?: string
}): string {
  if (input.global_id) return input.global_id
  if (input.topic && input.id) return `${input.topic}:${input.id}`
  if (input.topic) return input.topic
  return ''
}
