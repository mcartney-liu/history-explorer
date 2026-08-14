// P1-② (Engineering Health, 2026-08-14, PO-approved): runtime state extracted
// from App.tsx into a dedicated hook. Pure relocation — no logic change, no
// call-site change. App wraps with
//   <ExplorerRuntimeContext.Provider value={contextApi}>
// exactly as before.
//
// This isolates the Experience Runtime orchestration (Context + Projection +
// Memory + ExplorationPolicy + GrowthGraphStore + the projection→memory effect)
// so the 1482-line App.tsx can be sliced further without touching this logic.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import {
  EMPTY_CONTEXT,
  type ExplorerRuntimeContextValue,
  type CreateContextInput,
  type UpdateAnchorInput,
} from '../next/ExplorerRuntimeContext'
import { EMPTY_PROJECTION, type UnderstandingProjection } from '../next/UnderstandingProjection'
import { type ExplorationAction } from '../next/exploration/ExplorationPolicy'
import { EMPTY_EXPLORATION_STATE, type ExplorationState } from '../next/exploration/ExplorationState'
import { type Decision } from '../runtime/evaluation/Decision'
import { type ExplorationMetrics } from '../next/exploration/ExplorationMetrics'
import {
  evaluateMemory,
  type ProjectionDelta,
  type MemoryPersistencePayload,
  type ExistingMemoryState,
} from '../next/memory/MemoryPolicy'
import { GrowthGraphStore, type GrowthSnapshot } from '../next/memory/GrowthGraphStore'

export interface ExplorerRuntimeContextApi {
  context: ExplorerRuntimeContextValue
  createContext: (input: CreateContextInput) => void
  updateAnchor: (input: UpdateAnchorInput) => void
  clearContext: () => void
}

export interface ExplorerRuntime {
  runtimeContext: ExplorerRuntimeContextValue
  setRuntimeContext: Dispatch<SetStateAction<ExplorerRuntimeContextValue>>
  createContext: (input: CreateContextInput) => void
  updateAnchor: (input: UpdateAnchorInput) => void
  clearContext: () => void
  contextApi: ExplorerRuntimeContextApi
  projection: UnderstandingProjection
  setProjection: Dispatch<SetStateAction<UnderstandingProjection>>
  policyAction: ExplorationAction | null
  setPolicyAction: Dispatch<SetStateAction<ExplorationAction | null>>
  explorationState: ExplorationState
  setExplorationState: Dispatch<SetStateAction<ExplorationState>>
  explorationMetrics: ExplorationMetrics | null
  setExplorationMetrics: Dispatch<SetStateAction<ExplorationMetrics | null>>
  previousExplorationState: MutableRefObject<ExplorationState>
  graphStore: GrowthGraphStore
}

// M86.2 — computeDelta: 对比两次 Projection 生成 ProjectionDelta
function computeDelta(
  previous: UnderstandingProjection | null,
  current: UnderstandingProjection,
  sessionRef: string,
): ProjectionDelta {
  const delta: ProjectionDelta = {
    deltaId: `delta-${Date.now()}`,
    sessionRef,
    timestamp: Date.now(),
    cause: 'user_progress',
  }

  if (!previous || previous.topicRef !== current.topicRef) {
    // 首次 Projection——无对比
    return delta
  }

  // stage 变化
  if (previous.stage !== current.stage) {
    delta.stageChanged = { previous: previous.stage, current: current.stage }
  }

  // coverage 变化
  const prevCov = previous.coverageState.coverageRatio
  const currCov = current.coverageState.coverageRatio
  if (Math.abs(currCov - prevCov) > 0.01) {
    delta.coverageChanged = { previous: prevCov, current: currCov }
  }

  // 新维度覆盖
  const prevDims = new Set(previous.coverageState.coveredDimensions)
  const newDims = current.coverageState.coveredDimensions.filter((d) => !prevDims.has(d))
  if (newDims.length > 0) {
    delta.dimensionsCompleted = newDims
  }

  // missingLinks 减少
  const prevMissing = previous.missingLinks.length
  const currMissing = current.missingLinks.length
  if (currMissing < prevMissing) {
    delta.missingLinksResolved = current.missingLinks
      .filter((m) => !previous.missingLinks.some((pm) => pm.fromRef === m.fromRef && pm.toRef === m.toRef))
      .map((m) => `${m.fromRef}→${m.toRef}`)
  }

  return delta
}

export function useExplorerRuntime(): ExplorerRuntime {
  // =========================================================================
  // M86.1 — Explorer Runtime Context（Experience Runtime 单一语义核心）
  // 宿主：App() = ExplorePage 层。所有 Experience Layer 通过同一个 Context
  // 实例读写——不创建副本，不独立推断，不各自维护。
  // Batch 2: Anchor/Relation 语义数据模型 + anchorChain/relationChain
  // =========================================================================
  const [runtimeContext, setRuntimeContext] = useState<ExplorerRuntimeContextValue>(EMPTY_CONTEXT)

  const createContext = useCallback((input: CreateContextInput) => {
    // EP-009: user_question 和 understanding_goal 来自 Curator 预写数据，
    // 不由 AI 生成，不由开发者硬编码。来源由调用方保证。
    setRuntimeContext({
      explorationId: input.explorationId,
      userQuestion: input.userQuestion,
      understandingGoal: input.understandingGoal,
      currentAnchor: null,
      previousAnchor: null,
      activeRelation: null,
      anchorChain: [],
      relationChain: [],
      cognitiveStage: 'FACT',
      unresolvedGap: null,
    })
  }, [])

  const updateAnchor = useCallback((input: UpdateAnchorInput) => {
    // Batch 2: 接收 Anchor 对象 + 可选 Relation。
    // EP-007: Anchor 存的是理解锚点（用户概念），不是 Entity 数据副本。
    // activeRelation 来源 = Causal Layer 已有关系数据（EP-009）。
    // cognitive_stage 不由 Navigation 写入——由 Understanding Layer 判定（M86.1.2）。
    setRuntimeContext((prev) => ({
      ...prev,
      currentAnchor: input.anchor,
      previousAnchor: prev.currentAnchor,
      activeRelation: input.relation ?? null,
      // 累积锚点链和关系链
      anchorChain: [...prev.anchorChain, input.anchor],
      relationChain: input.relation
        ? [...prev.relationChain, input.relation]
        : prev.relationChain,
    }))
  }, [])

  const clearContext = useCallback(() => {
    // Batch 2 note: 当前为销毁语义。M86.2 应演进为 completeContext()
    // → Workspace Snapshot（保留理解记忆）。
    setRuntimeContext(EMPTY_CONTEXT)
  }, [])

  const contextApi = useMemo(() => ({
    context: runtimeContext,
    createContext,
    updateAnchor,
    clearContext,
  }), [runtimeContext, createContext, updateAnchor, clearContext])
  // =========================================================================

  // =========================================================================
  // M86.1 Batch 3 — Understanding Projection Runtime
  // Understanding Layer = Analysis Runtime。独立于 Context，单向依赖。
  // 读取 Context 快照 + UnderstandingTemplate → 输出 UnderstandingProjection。
  // =========================================================================
  const [projection, setProjection] = useState<UnderstandingProjection>(EMPTY_PROJECTION)

  // =========================================================================
  // M86.2 — Memory Module（Evaluation Runtime 的第二个 Domain Module）
  // Memory 是 Evaluation Runtime 的 Consumer，不是参与者。
  // 消费 ProjectionDelta → MemoryPolicy → Decision<MemoryPersistencePayload>
  // =========================================================================
  const [lastProjection, setLastProjection] = useState<UnderstandingProjection | null>(null)
  const [, setMemoryDecision] = useState<Decision<MemoryPersistencePayload> | null>(null)

  // M90.3 Stage E — ExplorationPolicy live state (wired from projection)
  const [policyAction, setPolicyAction] = useState<ExplorationAction | null>(null)
  const [explorationState, setExplorationState] = useState<ExplorationState>(EMPTY_EXPLORATION_STATE)

  // M90.3 Stage E-3 — ExplorationMetrics (before → after delta)
  const [explorationMetrics, setExplorationMetrics] = useState<ExplorationMetrics | null>(null)
  const previousExplorationState = useRef<ExplorationState>(EMPTY_EXPLORATION_STATE)

  // M86.2 Phase 2 — GrowthGraphStore（Append Only 认知成长图）
  const [graphStore] = useState(() => new GrowthGraphStore('graph-default', 'unit-default'))

  // 当 Projection 变化时，计算 Delta → 调用 MemoryPolicy → 驱动 GrowthGraphStore
  useEffect(() => {
    if (!projection.topicRef) {
      setMemoryDecision(null)
      return
    }

    const delta: ProjectionDelta = computeDelta(lastProjection, projection, runtimeContext.explorationId!)
    setLastProjection(projection)

    const existingState: ExistingMemoryState = {
      currentStage: lastProjection?.stage ?? 'FACT',
      currentCoverageRatio: lastProjection?.coverageState.coverageRatio ?? 0,
      lastMilestoneAt: null,
      growthNodeCount: graphStore.getGraph().nodes.length,
    }

    const decision = evaluateMemory(delta, existingState, {
      timestamp: Date.now(),
      policyVersion: '1.0',
      engineProtocolVersion: '1.0',
    })
    setMemoryDecision(decision)

    // Phase 2: 基于 Decision 驱动 GrowthGraphStore
    const snapshot: GrowthSnapshot = {
      stage: projection.stage,
      coverageRatio: projection.coverageState.coverageRatio,
      missingLinkCount: projection.missingLinks.length,
      dimensionCount: projection.coverageState.coveredDimensions.length,
    }
    graphStore.applyDecision(decision, delta, snapshot)
  }, [projection])
  // =========================================================================

  return {
    runtimeContext,
    setRuntimeContext,
    createContext,
    updateAnchor,
    clearContext,
    contextApi,
    projection,
    setProjection,
    policyAction,
    setPolicyAction,
    explorationState,
    setExplorationState,
    explorationMetrics,
    setExplorationMetrics,
    previousExplorationState,
    graphStore,
  }
}
