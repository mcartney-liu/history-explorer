// ============================================================
// M43 Phase 1 — UIAudit
// Structured page audit model. Maps every section to a
// product design contract: what it does, why it exists,
// and how we know it works. Zero AI. Zero backend.
//
// Domain Boundary: Platform Capability, not Historical Domain Logic.
// ============================================================

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export interface SectionAudit {
  /** Section component name or identifier. */
  name: string
  /** What this section does for the user. */
  purpose: string
  /** The primary action a user is expected to take here. */
  primaryAction: string
  /** Does this section have instructional/guidance text? */
  hasGuidance: boolean
  /** Does this section handle the case where no data exists? */
  hasEmptyState: boolean
  /** What user need does this section address? */
  userGoal: string
  /** How do we know this section is working? */
  successMetric: string
}

export interface PageAudit {
  /** Page route identifier. */
  route: string
  /** Page purpose in one sentence. */
  pagePurpose: string
  /** All sections on this page in display order. */
  sections: SectionAudit[]
  /** Does the page provide guidance for first-time visitors? */
  newUserGuidance: boolean
  /** Are all data-dependent sections covered by empty states? */
  emptyStatesCovered: boolean
  /** Approximate count of available actions on this page. */
  actionDensity: number
}

// -----------------------------------------------------------
// Audit Data — DiscoverPage
// -----------------------------------------------------------

export const DISCOVER_PAGE_AUDIT: PageAudit = {
  route: '/',
  pagePurpose: '帮助用户发现值得探索的历史方向',
  newUserGuidance: true,
  emptyStatesCovered: false,
  actionDensity: 12,
  sections: [
    {
      name: 'DiscoverHero',
      purpose: '传达产品定位：历史可以这样探索',
      primaryAction: '阅读介绍',
      hasGuidance: true,
      hasEmptyState: false,
      userGoal: '理解这个产品是做什么的',
      successMetric: '用户继续向下滚动或点击进入',
    },
    {
      name: 'RecentResearches',
      purpose: '展示用户最近探索过的实体',
      primaryAction: '点击继续研究',
      hasGuidance: false,
      hasEmptyState: true,
      userGoal: '快速回到上次中断的研究',
      successMetric: '点击率达到 30%',
    },
    {
      name: 'InterestProfile',
      purpose: '展示用户的探索兴趣画像',
      primaryAction: '点击主题标签',
      hasGuidance: false,
      hasEmptyState: true,
      userGoal: '了解自己的探索偏好',
      successMetric: '点击率达到 20%',
    },
    {
      name: 'ThemeExplorer',
      purpose: '按历史类型浏览探索方向',
      primaryAction: '点击类型卡片',
      hasGuidance: true,
      hasEmptyState: false,
      userGoal: '发现感兴趣的历史类型',
      successMetric: '至少 1 次卡片点击',
    },
    {
      name: 'FeaturedExploration',
      purpose: '推荐精选探索主题',
      primaryAction: '点击精选卡片',
      hasGuidance: true,
      hasEmptyState: false,
      userGoal: '快速体验产品核心能力',
      successMetric: '点击率达到 40%',
    },
    {
      name: 'PopularExplorations',
      purpose: '展示所有可用探索主题',
      primaryAction: '点击主题卡片',
      hasGuidance: true,
      hasEmptyState: false,
      userGoal: '自由浏览所有主题',
      successMetric: '至少 1 次点击',
    },
  ],
}

// -----------------------------------------------------------
// Audit Data — EntityPage
// -----------------------------------------------------------

export const ENTITY_PAGE_AUDIT: PageAudit = {
  route: '/entity/:id',
  pagePurpose: '深度探索单个历史实体',
  newUserGuidance: false,
  emptyStatesCovered: false,
  actionDensity: 25,
  sections: [
    {
      name: 'EntityHeader',
      purpose: '显示实体类型、名称和摘要',
      primaryAction: '阅读实体信息',
      hasGuidance: false,
      hasEmptyState: false,
      userGoal: '快速了解这是什么实体',
      successMetric: '用户在页面停留超过 5 秒',
    },
    {
      name: 'StorySection',
      purpose: '手写叙事先导',
      primaryAction: '阅读叙事',
      hasGuidance: true,
      hasEmptyState: false,
      userGoal: '通过叙事理解历史背景',
      successMetric: '叙事区域被滚动到',
    },
    {
      name: 'InfoTab',
      purpose: '基本信息与关系网络',
      primaryAction: '浏览关系和时间线',
      hasGuidance: false,
      hasEmptyState: false,
      userGoal: '了解实体的结构关系',
      successMetric: '用户与关系图谱交互',
    },
    {
      name: 'ExploreTab',
      purpose: '探索推荐与对话',
      primaryAction: '点击推荐卡片或开始对话',
      hasGuidance: true,
      hasEmptyState: true,
      userGoal: '发现相关实体和深入话题',
      successMetric: '至少 1 次推荐点击或对话启动',
    },
    {
      name: 'ResearchTab',
      purpose: '多维历史研究',
      primaryAction: '点击开始研究',
      hasGuidance: true,
      hasEmptyState: true,
      userGoal: '获得结构化多维度分析',
      successMetric: '完成至少 1 次研究',
    },
    {
      name: 'AnalyzeTab',
      purpose: '事件分析和AI解释',
      primaryAction: '使用 AI 解释或查看事件链',
      hasGuidance: true,
      hasEmptyState: false,
      userGoal: '深入理解因果和历史影响',
      successMetric: '至少使用 1 个分析工具',
    },
  ],
}

// -----------------------------------------------------------
// Audit Utility
// -----------------------------------------------------------

export function allPageAudits(): PageAudit[] {
  return [DISCOVER_PAGE_AUDIT, ENTITY_PAGE_AUDIT]
}

export function sectionsWithoutGuidance(page: PageAudit): SectionAudit[] {
  return page.sections.filter((s) => !s.hasGuidance)
}

export function sectionsWithoutEmptyState(page: PageAudit): SectionAudit[] {
  return page.sections.filter(
    (s) => s.hasEmptyState === false && s.purpose.includes('展示'),
  )
}

export function auditSummary(page: PageAudit): string {
  const missingGuidance = sectionsWithoutGuidance(page).length
  const missingEmpty = sectionsWithoutEmptyState(page).length
  return `${page.route}: ${page.sections.length} sections, ${missingGuidance} missing guidance, ${missingEmpty} missing empty states`
}
