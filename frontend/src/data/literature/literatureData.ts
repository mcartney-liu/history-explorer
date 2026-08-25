// ============================================================
// 文学板块（预览版）— 前端策展种子数据
// 方案 A：纯前端策展一条中国文学脉络，复用现有组件栈。
//
// 冻结不变量约束：ENTITY_TYPES 恒 8 种，新增文学专属类型会踩红线。
// 因此所有文学内容都用现有 8 类实体表达：
//   作者        → Person
//   作品/流派/文体 → Idea
//   时代        → Time Period
//
// 本文件不含任何事实数据库，仅为「策展视图」的种子（与 ExplorationPackage
// 同一定位）。关系边的 relation 字段一律使用冻结的 18 种关系 slug。
// ============================================================

import type { EntityType } from '../entity/entityTypes'

export interface LitNode {
  /** 局部稳定 id，例如 'shijing'（非 global_id，无需注册到数据集） */
  id: string
  /** 展示名（中文） */
  name: string
  /** 必须为 8 种冻结实体类型之一 */
  type: EntityType
  /** 所属时代节点的 id（Time Period 类型） */
  eraId?: string
  /** 时代展示标签 */
  eraLabel?: string
  /** 约略年份，负数表示公元前，用于时间线 */
  year?: number
  /** 1–2 句简介 */
  summary: string
  /** 要点列表 */
  keyFacts: string[]
}

export interface LitEdge {
  /** 源节点 id */
  source: string
  /** 目标节点 id */
  target: string
  /** 冻结 18 种关系 slug 之一 */
  relation: string
  /** 边的人类可读中文标签 */
  label: string
}

export interface LitStation {
  /** 站点 id */
  id: string
  /** 聚焦的节点 id */
  nodeId: string
  /** 站点标题 */
  title: string
  /** 站点一句话引导 */
  blurb: string
}

// ---- 节点 ----
export const LIT_NODES: LitNode[] = [
  {
    id: 'shijing',
    name: '诗经',
    type: 'Idea',
    eraId: 'xianqin',
    eraLabel: '先秦',
    year: -1000,
    summary:
      '中国最早的诗歌总集，收录西周初年至春秋中叶约 305 篇诗歌，分风、雅、颂三类，是现实主义的源头。',
    keyFacts: ['分「风、雅、颂」三类', '现实主义诗歌源头', '赋、比、兴三种表现手法'],
  },
  {
    id: 'chuci',
    name: '楚辞',
    type: 'Idea',
    eraId: 'xianqin',
    eraLabel: '先秦',
    year: -300,
    summary:
      '战国时期以屈原作品为代表的楚地诗歌总集，开创浪漫主义传统，句式长短错落、多用「兮」字。',
    keyFacts: ['浪漫主义诗歌源头', '骚体 / 楚辞体', '《离骚》为代表作'],
  },
  {
    id: 'quyuan',
    name: '屈原',
    type: 'Person',
    eraId: 'xianqin',
    eraLabel: '先秦',
    year: -340,
    summary:
      '战国楚国诗人、政治家，《离骚》《九歌》的作者，中国文学史上第一位具有明确个人风格的的伟大诗人。',
    keyFacts: ['《离骚》作者', '端午节的纪念对象', '开创个人抒情诗传统'],
  },
  {
    id: 'shiji',
    name: '史记',
    type: 'Idea',
    eraId: 'han',
    eraLabel: '两汉',
    year: -91,
    summary:
      '西汉司马迁撰写的纪传体通史，记载上起黄帝、下至汉武帝约三千年史事，被誉为「史家之绝唱，无韵之离骚」。',
    keyFacts: ['纪传体通史的开创', '鲁迅称「史家之绝唱，无韵之离骚」', '传记文学的典范'],
  },
  {
    id: 'simaqian',
    name: '司马迁',
    type: 'Person',
    eraId: 'han',
    eraLabel: '两汉',
    year: -145,
    summary: '西汉史学家、文学家，《史记》的作者，首创纪传体史书体例，忍辱负重而成书。',
    keyFacts: ['《史记》作者', '继承父司马谈太史令之职', '「究天人之际，通古今之变」'],
  },
  {
    id: 'tangshi',
    name: '唐诗',
    type: 'Idea',
    eraId: 'tang-song',
    eraLabel: '唐宋',
    year: 700,
    summary:
      '唐代诗歌的统称，是中国古典诗歌的黄金时代，流派纷呈、名家辈出，近体诗格律臻于完备。',
    keyFacts: ['近体诗（律诗 / 绝句）成熟', '李白、杜甫双峰并峙', '现存诗作约五万首'],
  },
  {
    id: 'libai',
    name: '李白',
    type: 'Person',
    eraId: 'tang-song',
    eraLabel: '唐宋',
    year: 701,
    summary: '盛唐浪漫主义诗人，号青莲居士，诗风豪放飘逸、想象奇绝，被誉为「诗仙」。',
    keyFacts: ['诗仙', '与杜甫并称「李杜」', '《将进酒》《蜀道难》'],
  },
  {
    id: 'dufu',
    name: '杜甫',
    type: 'Person',
    eraId: 'tang-song',
    eraLabel: '唐宋',
    year: 712,
    summary:
      '盛唐转中唐现实主义诗人，诗风沉郁顿挫、忧国忧民，被誉为「诗圣」，其诗被称为「诗史」。',
    keyFacts: ['诗圣', '其诗有「诗史」之称', '三吏三别'],
  },
  {
    id: 'songci',
    name: '宋词',
    type: 'Idea',
    eraId: 'tang-song',
    eraLabel: '唐宋',
    year: 1100,
    summary: '宋代盛行的一种配乐歌唱诗体，句式长短不齐、依词牌填作，分婉约与豪放两派。',
    keyFacts: ['长短句、依词牌填作', '婉约 / 豪放两派', '苏轼、李清照为代表'],
  },
  {
    id: 'sushi',
    name: '苏轼',
    type: 'Person',
    eraId: 'tang-song',
    eraLabel: '唐宋',
    year: 1037,
    summary: '北宋文学家、书画家，豪放派词的代表人物，诗词文书画俱佳，性情豁达旷达。',
    keyFacts: ['豪放派词人', '唐宋八大家之一', '《念奴娇·赤壁怀古》'],
  },
  {
    id: 'liqingzhao',
    name: '李清照',
    type: 'Person',
    eraId: 'tang-song',
    eraLabel: '唐宋',
    year: 1084,
    summary: '两宋之际女词人，婉约派代表，词风清丽婉转、情真意切，有「千古第一才女」之誉。',
    keyFacts: ['婉约派代表', '「绿肥红瘦」名句', '《声声慢》'],
  },
  {
    id: 'haofang',
    name: '豪放派',
    type: 'Idea',
    eraId: 'tang-song',
    eraLabel: '唐宋',
    year: 1100,
    summary: '宋词两大流派之一，风格雄浑豪迈、视野开阔，突破音律束缚，苏轼、辛弃疾为巨擘。',
    keyFacts: ['雄浑豪迈', '苏轼、辛弃疾', '题材广阔、不拘音律'],
  },
  {
    id: 'wanyue',
    name: '婉约派',
    type: 'Idea',
    eraId: 'tang-song',
    eraLabel: '唐宋',
    year: 1100,
    summary: '宋词两大流派之一，风格含蓄婉转、清丽柔美，多写儿女情长，柳永、李清照为代表。',
    keyFacts: ['含蓄婉转', '柳永、李清照', '音律谐婉'],
  },
  {
    id: 'mingqingxiaoshuo',
    name: '明清小说',
    type: 'Idea',
    eraId: 'ming-qing',
    eraLabel: '明清',
    year: 1600,
    summary:
      '明清两代长篇章回小说的鼎盛时期，《三国演义》《水浒传》《西游记》《红楼梦》四大名著皆出此期。',
    keyFacts: ['章回体成熟', '四大名著诞生', '白话通俗文学高峰'],
  },
  {
    id: 'hongloumeng',
    name: '红楼梦',
    type: 'Idea',
    eraId: 'ming-qing',
    eraLabel: '明清',
    year: 1791,
    summary:
      '清代曹雪芹创作的章回体小说，以贾宝玉、林黛玉的爱情悲剧写尽家族兴衰，是中国古典小说的巅峰之作。',
    keyFacts: ['四大名著之首', '曹雪芹著', '「红学」研究对象'],
  },
  {
    id: 'caoxueqin',
    name: '曹雪芹',
    type: 'Person',
    eraId: 'ming-qing',
    eraLabel: '明清',
    year: 1715,
    summary: '清代小说家，《红楼梦》的作者，出身江宁织造世家，家道中落后于贫病中著书。',
    keyFacts: ['《红楼梦》作者', '字梦阮，号雪芹', '「披阅十载，增删五次」'],
  },
  {
    id: 'xianqin',
    name: '先秦',
    type: 'Time Period',
    eraLabel: '先秦',
    year: -500,
    summary: '秦统一前的历史时期，文学以诗歌（诗经、楚辞）与诸子散文为代表，奠定中华文脉根基。',
    keyFacts: ['诗经、楚辞并立', '诸子散文兴盛', '百家争鸣'],
  },
  {
    id: 'han',
    name: '两汉',
    type: 'Time Period',
    eraLabel: '两汉',
    year: -100,
    summary: '汉代文学以辞赋、史传散文（史记、汉书）与乐府诗为代表，散文成就尤高。',
    keyFacts: ['史传散文巅峰', '汉赋铺陈', '乐府民歌'],
  },
  {
    id: 'tang-song',
    name: '唐宋',
    type: 'Time Period',
    eraLabel: '唐宋',
    year: 800,
    summary: '中国古典文学的黄金时代，诗（唐）与词（宋）双峰并峙，名家巨匠辈出。',
    keyFacts: ['唐诗宋词', '诗词并称', '古文运动'],
  },
  {
    id: 'ming-qing',
    name: '明清',
    type: 'Time Period',
    eraLabel: '明清',
    year: 1700,
    summary: '古典小说与戏曲的鼎盛期，章回体小说成熟，四大名著相继问世。',
    keyFacts: ['小说鼎盛', '四大名著', '戏曲繁荣'],
  },
]

// ---- 关系边（relation 一律为冻结 18 种 slug）----
export const LIT_EDGES: LitEdge[] = [
  // 诗经 → 楚辞
  { source: 'shijing', target: 'chuci', relation: 'influenced', label: '影响' },
  // 作者 → 作品
  { source: 'quyuan', target: 'chuci', relation: 'participated_in', label: '创作' },
  { source: 'simaqian', target: 'shiji', relation: 'participated_in', label: '撰写' },
  { source: 'libai', target: 'tangshi', relation: 'participated_in', label: '代表诗人' },
  { source: 'dufu', target: 'tangshi', relation: 'participated_in', label: '代表诗人' },
  { source: 'sushi', target: 'songci', relation: 'participated_in', label: '代表词人' },
  { source: 'liqingzhao', target: 'songci', relation: 'participated_in', label: '代表词人' },
  { source: 'caoxueqin', target: 'hongloumeng', relation: 'participated_in', label: '著' },
  // 作品 → 时代
  { source: 'shijing', target: 'xianqin', relation: 'part_of', label: '属于' },
  { source: 'chuci', target: 'xianqin', relation: 'part_of', label: '属于' },
  { source: 'quyuan', target: 'xianqin', relation: 'part_of', label: '属于' },
  { source: 'shiji', target: 'han', relation: 'part_of', label: '属于' },
  { source: 'simaqian', target: 'han', relation: 'part_of', label: '属于' },
  { source: 'tangshi', target: 'tang-song', relation: 'part_of', label: '属于' },
  { source: 'libai', target: 'tang-song', relation: 'part_of', label: '属于' },
  { source: 'dufu', target: 'tang-song', relation: 'part_of', label: '属于' },
  { source: 'songci', target: 'tang-song', relation: 'part_of', label: '属于' },
  { source: 'sushi', target: 'tang-song', relation: 'part_of', label: '属于' },
  { source: 'liqingzhao', target: 'tang-song', relation: 'part_of', label: '属于' },
  { source: 'haofang', target: 'tang-song', relation: 'part_of', label: '属于' },
  { source: 'wanyue', target: 'tang-song', relation: 'part_of', label: '属于' },
  { source: 'mingqingxiaoshuo', target: 'ming-qing', relation: 'part_of', label: '属于' },
  { source: 'hongloumeng', target: 'ming-qing', relation: 'part_of', label: '属于' },
  { source: 'caoxueqin', target: 'ming-qing', relation: 'part_of', label: '属于' },
  // 红楼梦 → 明清小说（从属）
  { source: 'hongloumeng', target: 'mingqingxiaoshuo', relation: 'part_of', label: '属于' },
  // 流派归属
  { source: 'sushi', target: 'haofang', relation: 'related_to', label: '属' },
  { source: 'liqingzhao', target: 'wanyue', relation: 'related_to', label: '属' },
  { source: 'haofang', target: 'wanyue', relation: 'related_to', label: '并列流派' },
  // 影响链
  { source: 'chuci', target: 'tangshi', relation: 'influenced', label: '影响' },
  { source: 'tangshi', target: 'songci', relation: 'influenced', label: '影响（诗→词演进）' },
  { source: 'shiji', target: 'mingqingxiaoshuo', relation: 'influenced', label: '影响（史传文学）' },
  // 时代先后
  { source: 'xianqin', target: 'han', relation: 'before', label: '早于' },
  { source: 'han', target: 'tang-song', relation: 'before', label: '早于' },
  { source: 'tang-song', target: 'ming-qing', relation: 'before', label: '早于' },
]

// ---- 策展站点（主脉络脊柱）----
export const LIT_STATIONS: LitStation[] = [
  {
    id: 'st-shijing',
    nodeId: 'shijing',
    title: '诗歌的源头',
    blurb: '从西周的民歌总集出发，看中华诗教如何开端。',
  },
  {
    id: 'st-chuci',
    nodeId: 'chuci',
    title: '浪漫的迸发',
    blurb: '屈原让个人情感第一次成为文学的主角。',
  },
  {
    id: 'st-tangshi',
    nodeId: 'tangshi',
    title: '诗的盛世',
    blurb: '唐人把格律与抒情推向极致。',
  },
  {
    id: 'st-songci',
    nodeId: 'songci',
    title: '词的新声',
    blurb: '宋人依声填词，长短句里另开天地。',
  },
  {
    id: 'st-xiaoshuo',
    nodeId: 'mingqingxiaoshuo',
    title: '小说的巅峰',
    blurb: '章回体成熟，四大名著照亮古今。',
  },
  {
    id: 'st-hongloumeng',
    nodeId: 'hongloumeng',
    title: '一座丰碑',
    blurb: '以家族兴衰写尽人间，古典小说之巅。',
  },
]
