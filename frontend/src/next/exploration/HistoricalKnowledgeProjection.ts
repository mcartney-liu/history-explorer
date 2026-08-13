/**
 * M89.1 — Historical Knowledge Projection
 *
 * 将真实历史知识转换为 Exploration 可理解的认知结构。
 *
 * 核心原则：
 *   - Projection 提供结构，不提供结论
 *   - 不包含解释判断（如 importance / reason）
 *   - 不直接查询 KG（由 Projection 隔离）
 */

import type { ExplorationStateBuilderInput } from './ExplorationState'

// ============================================================================
// HistoricalKnowledgeProjection
// ============================================================================

export interface HistoricalDimension {
  id: string
  label: string
  description: string
}

export interface HistoricalEntity {
  ref: string
  name: string
  type: 'person' | 'event' | 'institution' | 'concept' | 'place'
  dimensions: string[]
  description: string
}

export interface HistoricalRelation {
  id: string
  from: string
  to: string
  type: 'causes' | 'enables' | 'influences' | 'precedes' | 'contrasts'
  description: string
}

export interface HistoricalUnderstandingTemplate {
  requiredDimensions: string[]
  expectedRelations: { from: string; to: string; type: string }[]
}

export interface HistoricalKnowledgeProjection {
  topicRef: string
  topicName: string
  description: string

  dimensions: HistoricalDimension[]
  entities: HistoricalEntity[]
  relations: HistoricalRelation[]
  understandingTemplate: HistoricalUnderstandingTemplate
}

// ============================================================================
// 法国大革命（第一验证场景）
// ============================================================================

export const FRENCH_REVOLUTION_PROJECTION: HistoricalKnowledgeProjection = {
  topicRef: 'french-revolution',
  topicName: '法国大革命',
  description: '1789-1799年法国社会、政治、经济的根本性变革，终结了君主专制，开启了现代民主政治。',

  dimensions: [
    { id: 'financial', label: '财政', description: '国家财政危机、税收制度、三级会议' },
    { id: 'political', label: '政治制度', description: '君主专制、三级会议、国民议会、共和制度' },
    { id: 'social', label: '阶级/社会', description: '三级等级制度、贵族、教士、第三等级' },
    { id: 'intellectual', label: '思想/启蒙', description: '启蒙思想、卢梭、伏尔泰、人权宣言' },
    { id: 'military', label: '军事/战争', description: '革命战争、拿破仑崛起、欧洲联军' },
    { id: 'diplomatic', label: '外交', description: '欧洲列强反应、反法同盟' },
  ],

  entities: [
    // 财政维度
    { ref: 'entity:fiscal-crisis', name: '法国财政危机', type: 'event', dimensions: ['financial'], description: '路易十六时期国家债务危机，触发三级会议召开' },
    { ref: 'entity:estates-general', name: '三级会议', type: 'institution', dimensions: ['financial', 'political'], description: '1789年召开，代表三个等级讨论财政改革' },
    // 政治维度
    { ref: 'entity:louis-xvi', name: '路易十六', type: 'person', dimensions: ['political'], description: '法国国王，大革命时期的君主' },
    { ref: 'entity:national-assembly', name: '国民议会', type: 'institution', dimensions: ['political'], description: '第三等级自行成立的立法机构' },
    { ref: 'entity:bastille', name: '攻占巴士底狱', type: 'event', dimensions: ['political', 'social'], description: '1789年7月14日，革命爆发的标志性事件' },
    { ref: 'entity:republic', name: '法兰西第一共和国', type: 'institution', dimensions: ['political'], description: '1792年建立，终结君主制' },
    // 社会维度
    { ref: 'entity:third-estate', name: '第三等级', type: 'concept', dimensions: ['social'], description: '平民阶级，占法国人口97%' },
    { ref: 'entity:nobility', name: '贵族', type: 'concept', dimensions: ['social'], description: '第二等级，享有特权' },
    { ref: 'entity:clergy', name: '教士', type: 'concept', dimensions: ['social'], description: '第一等级，天主教会' },
    // 思想维度
    { ref: 'entity:enlightenment', name: '启蒙运动', type: 'concept', dimensions: ['intellectual'], description: '18世纪欧洲思想运动，强调理性、自由、平等' },
    { ref: 'entity:rousseau', name: '卢梭', type: 'person', dimensions: ['intellectual'], description: '启蒙思想家，《社会契约论》作者' },
    { ref: 'entity:declaration-rights', name: '人权宣言', type: 'event', dimensions: ['intellectual', 'political'], description: '1789年发表，确立自由平等原则' },
    // 军事维度
    { ref: 'entity:revolutionary-wars', name: '法国革命战争', type: 'event', dimensions: ['military'], description: '1792-1802年法国与欧洲列强的战争' },
    { ref: 'entity:napoleon', name: '拿破仑·波拿巴', type: 'person', dimensions: ['military', 'political'], description: '军事将领，后成为法兰西第一帝国皇帝' },
    // 外交维度
    { ref: 'entity:anti-french-coalition', name: '反法同盟', type: 'event', dimensions: ['diplomatic', 'military'], description: '欧洲列强组成的反法军事联盟' },
    { ref: 'entity:european-monarchies', name: '欧洲君主国', type: 'concept', dimensions: ['diplomatic'], description: '奥地利、普鲁士、英国等对革命的反应' },
  ],

  relations: [
    // 财政→政治因果链
    { id: 'rel-1', from: 'entity:fiscal-crisis', to: 'entity:estates-general', type: 'causes', description: '财政危机迫使国王召开三级会议' },
    { id: 'rel-2', from: 'entity:estates-general', to: 'entity:national-assembly', type: 'causes', description: '三级会议投票争议导致第三等级成立国民议会' },
    { id: 'rel-3', from: 'entity:national-assembly', to: 'entity:bastille', type: 'precedes', description: '国民议会成立后民众攻占巴士底狱' },
    { id: 'rel-4', from: 'entity:bastille', to: 'entity:republic', type: 'causes', description: '革命爆发最终导致君主制终结，建立共和国' },
    // 社会维度
    { id: 'rel-5', from: 'entity:third-estate', to: 'entity:estates-general', type: 'influences', description: '第三等级要求改革投票制度' },
    { id: 'rel-6', from: 'entity:nobility', to: 'entity:fiscal-crisis', type: 'influences', description: '贵族特权导致税负不均，加剧财政危机' },
    // 思想维度
    { id: 'rel-7', from: 'entity:enlightenment', to: 'entity:declaration-rights', type: 'influences', description: '启蒙思想直接影响了人权宣言的内容' },
    { id: 'rel-8', from: 'entity:rousseau', to: 'entity:enlightenment', type: 'influences', description: '卢梭是社会契约论的代表人物' },
    // 军事→外交
    { id: 'rel-9', from: 'entity:revolutionary-wars', to: 'entity:napoleon', type: 'enables', description: '革命战争为拿破仑的崛起提供了舞台' },
    { id: 'rel-10', from: 'entity:european-monarchies', to: 'entity:anti-french-coalition', type: 'causes', description: '欧洲君主国恐惧革命扩散，组成反法同盟' },
    { id: 'rel-11', from: 'entity:republic', to: 'entity:revolutionary-wars', type: 'causes', description: '共和国成立引发欧洲列强军事干预' },
  ],

  understandingTemplate: {
    requiredDimensions: ['financial', 'political', 'social', 'intellectual', 'military', 'diplomatic'],
    expectedRelations: [
      { from: 'entity:fiscal-crisis', to: 'entity:estates-general', type: 'causes' },
      { from: 'entity:estates-general', to: 'entity:national-assembly', type: 'causes' },
      { from: 'entity:enlightenment', to: 'entity:declaration-rights', type: 'influences' },
      { from: 'entity:revolutionary-wars', to: 'entity:napoleon', type: 'enables' },
    ],
  },
}

// ============================================================================
// Projection → ExplorationState 转换
// ============================================================================

/**
 * projectHistoricalKnowledge()
 *
 * 将 HistoricalKnowledgeProjection 转换为 ExplorationStateBuilderInput，
 * 以便 buildExplorationState() 消费。
 *
 * 纯函数。不修改 Projection。不包含判断。
 */
export function projectHistoricalKnowledge(
  projection: HistoricalKnowledgeProjection,
  explorationId: string,
): ExplorationStateBuilderInput {
  const entityIds = projection.entities.map((e) => e.ref)

  // P-U08: 维度实体映射（实体维度标签 → 该维度下的实体 ref）。
  // Policy Rule 1 据此产出「真实可达实体」作为 open_dimension 目标，
  // 而非中文维度标签（旧版会产出 404 目标）。
  const dimensionMapping: Record<string, string[]> = {}
  for (const e of projection.entities) {
    for (const dim of e.dimensions) {
      if (!dimensionMapping[dim]) dimensionMapping[dim] = []
      if (!dimensionMapping[dim].includes(e.ref)) dimensionMapping[dim].push(e.ref)
    }
  }

  return {
    explorationId,
    currentTopic: projection.topicName,
    currentAnchorRef: entityIds[0] ?? '',
    understandingProjection: {
      stage: 'FACT',
      coverageState: {
        requiredDimensions: projection.understandingTemplate.requiredDimensions,
        coveredDimensions: [],      // 初始状态：未覆盖任何维度
        coverageRatio: 0,
      },
      missingLinks: projection.understandingTemplate.expectedRelations.map((r) => ({
        fromRef: r.from,
        toRef: r.to,
        expectedRelationType: r.type,
        templateRef: projection.topicRef,
      })),
      basedOn: { projectionVersion: '1.0' },
    },
    dimensionMapping,
    memoryProjection: {
      totalNodes: 0,
      daysSinceStart: 0,
      activeBranches: [],
      basedOn: { projectionVersion: '1.0' },
    },
    sessionHistory: {
      exploredAnchors: [],
      exploredRelations: [],
      activeQuestions: [],
    },
  }
}
