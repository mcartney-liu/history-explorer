// ============================================================
// M43 Phase 2 — UserJourney
// Structured journey map describing how users move through the
// product. Identifies goals, entry points, blockers, and
// missing guidance at each node. Does NOT modify the product.
//
// Domain Boundary: Platform Capability. Describes universal
// exploration funnels, not history-specific content logic.
// ============================================================

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export interface JourneyNode {
  /** Node identifier. */
  id: string
  /** What page / tab / action this represents. */
  location: string
  /** What the user is trying to accomplish at this node. */
  userGoal: string
  /** How the user enters this node. */
  entryPoint: string
  /** What currently blocks or confuses users at this node. */
  blocker: string | null
  /** What guidance would help users progress. */
  missingGuidance: string | null
  /** Does the UI clearly show the next step? */
  nextStepVisible: boolean
}

export interface JourneyFunnel {
  /** Funnel name. */
  name: string
  /** What this funnel measures. */
  purpose: string
  /** Nodes in traversal order. */
  nodes: JourneyNode[]
  /** Completion rate proxy (nodes with nextStepVisible / total). */
  completionScore: number
}

// -----------------------------------------------------------
// Funnel 1 — Discovery
// -----------------------------------------------------------

export const DISCOVERY_FUNNEL: JourneyFunnel = {
  name: 'Discovery',
  purpose: '首页是否驱动用户进入实体探索？',
  completionScore: 2 / 3, // 2 of 3 nodes have visible next step
  nodes: [
    {
      id: 'd1_landing',
      location: 'DiscoverPage / Hero',
      userGoal: '理解产品定位和能做什么',
      entryPoint: '直接访问 /',
      blocker: null,
      missingGuidance: null,
      nextStepVisible: true,
    },
    {
      id: 'd2_browse',
      location: 'DiscoverPage / 最近研究 + 探索主题',
      userGoal: '找到一个感兴趣的方向',
      entryPoint: '向下滚动',
      blocker: '新用户没有研究历史，最近研究区域为空',
      missingGuidance: '新用户应看到示例探索而不是空状态',
      nextStepVisible: true,
    },
    {
      id: 'd3_enter',
      location: 'DiscoverPage → EntityPage',
      userGoal: '进入实体开始深度探索',
      entryPoint: '点击探索卡片',
      blocker: '用户可能不知道点击后会看到什么',
      missingGuidance: '卡片上应有简短预览说明',
      nextStepVisible: true,
    },
  ],
}

// -----------------------------------------------------------
// Funnel 2 — Exploration
// -----------------------------------------------------------

export const EXPLORATION_FUNNEL: JourneyFunnel = {
  name: 'Exploration',
  purpose: '用户进入实体后是否继续深入探索？',
  completionScore: 3 / 5, // 3 of 5 nodes
  nodes: [
    {
      id: 'e1_entity',
      location: 'EntityPage / 了解 Tab',
      userGoal: '快速了解这个实体是什么',
      entryPoint: '从 Discover 或搜索进入',
      blocker: null,
      missingGuidance: null,
      nextStepVisible: true,
    },
    {
      id: 'e2_relationship',
      location: 'EntityPage / 了解 Tab / 关系网络',
      userGoal: '发现相关实体',
      entryPoint: '向下滚动到关系图',
      blocker: '5 个 tab 之间没有导航提示',
      missingGuidance: '"探索" tab 应在用户查看完关系后主动提示',
      nextStepVisible: false,
    },
    {
      id: 'e3_explore_tab',
      location: 'EntityPage / 探索 Tab',
      userGoal: '发现推荐探索路径',
      entryPoint: '手动切换到探索 tab',
      blocker: '用户可能不知道这个 tab 的存在',
      missingGuidance: '了解 tab 底部应有"下一步：探索推荐"引导',
      nextStepVisible: true,
    },
    {
      id: 'e4_journey',
      location: 'EntityPage / 探索 Tab / JourneyCard',
      userGoal: '跳到相关实体继续探索',
      entryPoint: '点击 Journey 卡片',
      blocker: null,
      missingGuidance: null,
      nextStepVisible: true,
    },
    {
      id: 'e5_chat',
      location: 'EntityPage / 探索 Tab / HistorianChat',
      userGoal: '向 AI 提问深入话题',
      entryPoint: '向下滚动到对话区',
      blocker: '对话入口在探索 tab 底部，不易被发现',
      missingGuidance: '推荐问题不应隐藏在滚动区底部',
      nextStepVisible: true,
    },
  ],
}

// -----------------------------------------------------------
// Funnel 3 — Research
// -----------------------------------------------------------

export const RESEARCH_FUNNEL: JourneyFunnel = {
  name: 'Research',
  purpose: '研究 pipeline 是否形成闭环？',
  completionScore: 3 / 5,
  nodes: [
    {
      id: 'r1_start',
      location: 'EntityPage / 研究 Tab',
      userGoal: '获得该实体的多维度分析',
      entryPoint: '切换到研究 tab → 点击开始研究',
      blocker: '用户不知道研究模式能做什么',
      missingGuidance: '研究 tab 应在空闲状态展示使用说明和预期输出',
      nextStepVisible: true,
    },
    {
      id: 'r2_complete',
      location: 'EntityPage / 研究 Tab / 研究完成',
      userGoal: '查看研究结果',
      entryPoint: '等待 4 个维度完成',
      blocker: '等待时间可能让用户离开',
      missingGuidance: '进度指示器应显示预计剩余时间',
      nextStepVisible: true,
    },
    {
      id: 'r3_save',
      location: 'EntityPage / 研究 Tab / 保存',
      userGoal: '保存研究结果以便回顾',
      entryPoint: '研究完成后看到 ResearchReport',
      blocker: '保存按钮不明显',
      missingGuidance: '研究完成后应主动提示保存',
      nextStepVisible: false,
    },
    {
      id: 'r4_restore',
      location: 'EntityPage / 研究库',
      userGoal: '恢复之前的研究',
      entryPoint: 'EntityPage → 研究库区域',
      blocker: '研究库在页面底部，不显眼',
      missingGuidance: '首页应提示"你保存了 N 个研究"',
      nextStepVisible: false,
    },
    {
      id: 'r5_compare',
      location: 'EntityPage / 研究 Tab / 多实体选择',
      userGoal: '比较多实体研究结果',
      entryPoint: '研究前点击 + 添加比较对象',
      blocker: '用户不知道可以比较',
      missingGuidance: '单实体研究完成后应建议对比研究',
      nextStepVisible: false,
    },
  ],
}

// -----------------------------------------------------------
// Audit Utility
// -----------------------------------------------------------

export function allFunnels(): JourneyFunnel[] {
  return [DISCOVERY_FUNNEL, EXPLORATION_FUNNEL, RESEARCH_FUNNEL]
}

export function blockersInFunnel(funnel: JourneyFunnel): JourneyNode[] {
  return funnel.nodes.filter((n) => n.blocker !== null)
}

export function missingGuidanceReport(funnel: JourneyFunnel): string[] {
  return funnel.nodes
    .filter((n) => n.missingGuidance !== null)
    .map((n) => `${n.id}: ${n.missingGuidance}`)
}

export function funnelSummary(): string {
  const funnels = allFunnels()
  const totalBlockers = funnels.reduce(
    (s, f) => s + blockersInFunnel(f).length, 0,
  )
  const totalMissing = funnels.reduce(
    (s, f) => s + missingGuidanceReport(f).length, 0,
  )
  return `3 funnels: ${totalBlockers} blockers, ${totalMissing} missing guidance. Avg completion score: ${Math.round(funnels.reduce((s, f) => s + f.completionScore, 0) / funnels.length * 100)}%`
}
