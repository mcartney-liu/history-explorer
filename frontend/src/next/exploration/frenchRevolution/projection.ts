/**
 * M89.2.10 — 法国大革命 Experience Projection
 *
 * 将法国大革命 Evidence Fixture 翻译为 UnderstandingWorkspaceState。
 * 这是 Runtime → UI 的转换层。
 */

import type { UnderstandingWorkspaceState } from '../UnderstandingWorkspaceState'
import { FRENCH_REVOLUTION_EVIDENCE } from './evidence'

// ============================================================================
// 法国大革命 Understanding Path 配置
// ============================================================================

const PATH_CONFIG = {
  question: '法国大革命为什么发生？',
  startingBelief: '革命就是人民不满意国王，把他推翻了。',
  nodes: [
    { dimension: '财政', completed: false },
    { dimension: '政治', completed: false },
    { dimension: '社会', completed: false },
  ],
  connections: [
    {
      from: '财政',
      to: '政治',
      reason: '财政危机迫使国王召开三级会议，暴露了政治制度的结构性矛盾',
    },
    {
      from: '政治',
      to: '社会',
      reason: '政治制度的不公根源于社会结构的不平等——特权 vs 平民',
    },
  ],
  totalNodes: 3,
}

const NEXT_ACTIONS = [
  {
    reason: '我们先从财政危机开始——它是革命的直接触发点',
    hook: '为什么一个国家的财政问题会引发推翻君主制度的革命？',
    targetEvidenceId: 'evidence-fiscal-crisis',
  },
  {
    reason: '财政问题需要政治解决——三级会议暴露了制度的结构性矛盾',
    hook: '为什么国王召开了会议，问题反而变得更严重？',
    targetEvidenceId: 'evidence-estates-general',
  },
  {
    reason: '政治制度的不公反映了更深层的社会结构问题',
    hook: '为什么 98% 的人愿意冒着生命危险参与革命？',
    targetEvidenceId: 'evidence-third-estate',
  },
]

// ============================================================================
// buildFrenchRevolutionWorkspaceState()
// ============================================================================

export function buildFrenchRevolutionWorkspaceState(
  currentEvidenceIndex: number,
): UnderstandingWorkspaceState {
  if (currentEvidenceIndex < 0 || currentEvidenceIndex > 3) {
    throw new Error(`Invalid evidence index: ${currentEvidenceIndex}`)
  }

  // Phase: orientation
  if (currentEvidenceIndex === 0) {
    return {
      question: PATH_CONFIG.question,
      startingBelief: PATH_CONFIG.startingBelief,
      currentEvidence: null,
      understandingPath: {
        nodes: PATH_CONFIG.nodes.map((n) => ({ ...n })),
        connections: [],
        currentNodeIndex: 0,
        totalNodes: PATH_CONFIG.totalNodes,
      },
      nextAction: NEXT_ACTIONS[0],
      reflection: null,
      phase: 'orientation',
    }
  }

  // Phase: closure
  if (currentEvidenceIndex === 3) {
    return {
      question: PATH_CONFIG.question,
      startingBelief: PATH_CONFIG.startingBelief,
      currentEvidence: null,
      understandingPath: {
        nodes: PATH_CONFIG.nodes.map((n) => ({ ...n, completed: true })),
        connections: PATH_CONFIG.connections.map((c) => ({ ...c })),
        currentNodeIndex: 3,
        totalNodes: PATH_CONFIG.totalNodes,
      },
      nextAction: null,
      reflection: {
        observedChange:
          '从"革命 = 人民推翻国王"到"革命 = 财政、制度、社会结构多重危机叠加的过程"',
        newQuestion: '为什么革命最后产生了拿破仑，而不是共和国？',
      },
      phase: 'closure',
    }
  }

  // Phase: exploring (index 1 or 2)
  const completedNodes = PATH_CONFIG.nodes.map((n, i) => ({
    ...n,
    completed: i < currentEvidenceIndex,
  }))

  return {
    question: PATH_CONFIG.question,
    startingBelief: PATH_CONFIG.startingBelief,
    currentEvidence: FRENCH_REVOLUTION_EVIDENCE[currentEvidenceIndex - 1],
    understandingPath: {
      nodes: completedNodes,
      connections: PATH_CONFIG.connections
        .slice(0, currentEvidenceIndex - 1)
        .map((c) => ({ ...c })),
      currentNodeIndex: currentEvidenceIndex,
      totalNodes: PATH_CONFIG.totalNodes,
    },
    nextAction:
      currentEvidenceIndex < 3 ? NEXT_ACTIONS[currentEvidenceIndex] : null,
    reflection: null,
    phase: 'exploring',
  }
}
