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
}

export function getNarrative(key: string): NarrativeBlock | undefined {
  return NARRATIVE[key]
}

export function hasNarrative(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(NARRATIVE, key)
}
