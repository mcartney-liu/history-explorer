// P1-② (Engineering Health, 2026-08-14, PO-approved): the M90.3 Stage E
// projection → ExplorationState → ExplorationPolicy effect extracted from
// App.tsx into a dedicated hook. Pure relocation — effect body, dependencies,
// and the setters it drives are unchanged. App calls
//   useExplorationProjection({ result, entityData, runtimeContext, currentTopic,
//     currentRef, history, setProjection, setRuntimeContext, setExplorationState,
//     setExplorationMetrics, previousExplorationState, setPolicyAction })
// with the same inputs + setters it previously closed over, so navigation
// behaviour and the rendered runtime state are identical.

import { useEffect, useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { ExplorationResult } from '../App'
import type { EntityDetail } from '../components/EntityPage'
import type { NavNode } from '../components/navigation'
import type { ExplorerRuntimeContextValue } from '../next/ExplorerRuntimeContext'
import {
  computeUnderstandingProjection,
  EMPTY_PROJECTION,
  type UnderstandingProjection,
  type ContextSnapshot,
  type UnderstandingTemplate,
} from '../next/UnderstandingProjection'
import { evaluateExploration, type ExplorationAction } from '../next/exploration/ExplorationPolicy'
import type { GapSnapshot } from '../data/GapLedger'
import { loadGap } from '../data/GapLedger'
import {
  buildExplorationState,
  EMPTY_EXPLORATION_STATE,
  type ExplorationState,
} from '../next/exploration/ExplorationState'
import { computeExplorationMetrics, type ExplorationMetrics } from '../next/exploration/ExplorationMetrics'
import type { PolicyContext } from '../runtime/evaluation/Decision'

export interface UseExplorationProjectionInput {
  result: ExplorationResult | null
  entityData: EntityDetail | null
  runtimeContext: ExplorerRuntimeContextValue
  currentTopic: string
  currentRef: string
  history: NavNode[]
  setProjection: Dispatch<SetStateAction<UnderstandingProjection>>
  setRuntimeContext: Dispatch<SetStateAction<ExplorerRuntimeContextValue>>
  setExplorationState: Dispatch<SetStateAction<ExplorationState>>
  setExplorationMetrics: Dispatch<SetStateAction<ExplorationMetrics | null>>
  previousExplorationState: MutableRefObject<ExplorationState>
  setPolicyAction: Dispatch<SetStateAction<ExplorationAction | null>>
}

// M90.3 Stage E — Projection → ExplorationState → ExplorationPolicy.
// Re-compute when anchorChain or relationChain changes. Moved after
// `current` declaration to avoid TDZ.
export function useExplorationProjection(input: UseExplorationProjectionInput): void {
  const {
    result,
    entityData,
    runtimeContext,
    currentTopic,
    currentRef,
    history,
    setProjection,
    setRuntimeContext,
    setExplorationState,
    setExplorationMetrics,
    previousExplorationState,
    setPolicyAction,
  } = input

  // Cognitive loop (P2, 2026-08-14): the persisted user-facing Knowledge Gap
  // is loaded once per topic and fed into ExplorationPolicy (Rule 0) so the
  // next step can target what the user said they still don't get.
  const [gapState, setGapState] = useState<GapSnapshot | null>(null)
  const [computedState, setComputedState] = useState<ExplorationState | null>(null)

  useEffect(() => {
    if (!currentTopic) {
      setGapState(null)
      return
    }
    let cancelled = false
    loadGap(currentTopic)
      .then((g) => {
        if (!cancelled) setGapState(g)
      })
      .catch(() => {
        if (!cancelled) setGapState(null)
      })
    return () => {
      cancelled = true
    }
  }, [currentTopic])

  useEffect(() => {
    console.log('[Projection useEffect] TRIGGERED', {
      hasResult: !!result,
      entityCount: result?.entities?.length,
      anchorChainLen: runtimeContext.anchorChain?.length,
    })
    // Compute projection for ALL topics as soon as data is available.
    const hasTopicData = result && result.entities && result.entities.length > 0
    const hasEntityData = !!(
      entityData &&
      (entityData.relationships?.length || entityData.exploration?.related_entities?.length)
    )
    if (!hasTopicData && !hasEntityData && runtimeContext.anchorChain.length === 0) {
      console.log('[Projection useEffect] SKIPPED — no topic data, no entity data, no anchor chain')
      setProjection(EMPTY_PROJECTION)
      return
    }

    const effectiveExplorationId = runtimeContext.explorationId || 'exploration-default'

    const snapshot: ContextSnapshot = {
      explorationId: effectiveExplorationId,
      anchorChain: runtimeContext.anchorChain,
      relationChain: runtimeContext.relationChain,
    }

    // Build UnderstandingTemplate. Entity-dimension source prefers topic
    // `result.entities`; on a bare entity page (result cleared by fetchNode)
    // it falls back to the current entity's `exploration.related_entities`
    // (neighbor entity types), so the projection still has dimensions to cover.
    const dimensionEntities: Array<{ id: string; type?: string }> = result?.entities
      ? result.entities.map((e) => ({ id: e.id, type: e.type }))
      : (entityData?.exploration?.related_entities ?? []).map((e) => ({ id: e.id ?? e.name, type: e.type }))
    const entityTypes = [...new Set(dimensionEntities.map((e) => e.type).filter((t): t is string => Boolean(t)))]
    // P-U08: local id → global_id ("topic:localid") map. Entity pages carry
    // global_ids in `relationships[].other`; topic results carry them on each
    // entity. Used so open_dimension next-steps point at real, clickable
    // entities instead of Chinese dimension labels (which 404).
    const shortToGlobal: Record<string, string> = {}
    for (const r of entityData?.relationships ?? []) {
      if (r.other?.global_id && r.other?.id) shortToGlobal[r.other.id] = r.other.global_id
    }
    for (const e of result?.entities ?? []) {
      if (e.global_id && e.id) shortToGlobal[e.id] = e.global_id
    }
    const dimensionMapping: Record<string, string[]> = {}
    for (const e of dimensionEntities) {
      if (!e.type) continue
      if (!dimensionMapping[e.type]) dimensionMapping[e.type] = []
      const gid = shortToGlobal[e.id] ?? e.id
      if (!dimensionMapping[e.type].includes(gid)) dimensionMapping[e.type].push(gid)
    }
    // Relation source prefers topic `result.relationships`, falls back to the
    // current entity's `relationships` (clean source/target/type triples) so the
    // policy can generate a meaningful next-step action anchored on this entity.
    const relationSource: any[] =
      result?.relationships ||
      entityData?.relationships ||
      result?.exploration?.related_entities ||
      entityData?.exploration?.related_entities ||
      []
    const template: UnderstandingTemplate = {
      templateId: 'auto-generated-from-topic-data',
      version: '1.0',
      topic: runtimeContext.userQuestion ?? currentTopic ?? entityData?.name ?? '',
      goal: runtimeContext.understandingGoal ?? '',
      requiredDimensions: entityTypes,
      dimensionMapping,
      expectedRelations: relationSource.map((r: any) => ({
        from: r.source || r.from_entity_id || '',
        to: r.target || r.to_entity_id || '',
        type: r.relation_type || r.relationship || r.type || 'related_to',
      })),
    }

    const newProjection = computeUnderstandingProjection(snapshot, template)
    console.log('[Understanding] Projection computed:', {
      stage: newProjection.stage,
      coverageRatio: newProjection.coverageState?.coverageRatio,
      requiredDimensions: newProjection.coverageState?.requiredDimensions,
      coveredDimensions: newProjection.coverageState?.coveredDimensions,
      missingLinks: newProjection.missingLinks?.length,
      templateDims: template.requiredDimensions,
      entityCount: result?.entities?.length,
    })
    setProjection(newProjection)

    // Projection → Context (stage + primaryGap)
    setRuntimeContext((prev) => ({
      ...prev,
      cognitiveStage: newProjection.stage,
      unresolvedGap: newProjection.missingLinks.length > 0
        ? `Missing connection: ${newProjection.missingLinks[0].fromRef} → ${newProjection.missingLinks[0].toRef}`
        : null,
    }))

    // Build ExplorationState → run ExplorationPolicy
    const eState = buildExplorationState({
      explorationId: runtimeContext.explorationId || '',
      currentTopic: currentTopic,
      currentAnchorRef: currentRef,
      understandingProjection: {
        stage: newProjection.stage,
        coverageState: {
          requiredDimensions: newProjection.coverageState.requiredDimensions || [],
          coveredDimensions: newProjection.coverageState.coveredDimensions || [],
          coverageRatio: newProjection.coverageState.coverageRatio || 0,
        },
        missingLinks: newProjection.missingLinks,
        basedOn: newProjection.basedOn || { projectionVersion: '1.0' },
      },
      dimensionMapping, // P-U08: Policy Rule 1 用真实实体作 open_dimension 目标
      memoryProjection: {
        totalNodes: history.length,
        daysSinceStart: 0,
        activeBranches: [],
      },
      sessionHistory: {
        exploredAnchors: runtimeContext.anchorChain.map((a) => a.entityId),
        exploredRelations: runtimeContext.relationChain.map((r) => r.relationId),
        activeQuestions: runtimeContext.userQuestion ? [runtimeContext.userQuestion] : [],
      },
    })
    setExplorationState(eState)

    // M90.3 Stage E-3 — Compute ExplorationMetrics (before → after delta)
    const prev = previousExplorationState.current
    if (prev.explorationId && prev.explorationId !== eState.explorationId) {
      // Topic changed — treat as new session, metrics show growth from empty
      const metrics = computeExplorationMetrics(EMPTY_EXPLORATION_STATE, eState, prev.missingDimensions)
      setExplorationMetrics(metrics)
    } else if (prev.coverageRatio !== eState.coverageRatio || prev.missingDimensions.length !== eState.missingDimensions.length) {
      // Same topic, cognitive state changed — compute delta
      const metrics = computeExplorationMetrics(prev, eState, prev.missingDimensions)
      setExplorationMetrics(metrics)
    }
    previousExplorationState.current = eState
    // Hand the freshly built state to the policy effect (below), which also
    // consumes the persisted gap so Rule 0 can target user-marked gaps.
    setComputedState(eState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtimeContext.explorationId, runtimeContext.anchorChain, runtimeContext.relationChain, currentTopic, currentRef, entityData])

  // Cognitive loop (P2, 2026-08-14): run ExplorationPolicy whenever the
  // projected state OR the persisted gap changes. Feeding gapState here (not
  // inside the projection effect) avoids re-running the heavy projection when
  // only the gap changes, and keeps the Policy's input always up to date.
  useEffect(() => {
    if (!computedState) return
    const policyContext: PolicyContext = {
      policyVersion: '1.0',
      timestamp: Date.now(),
      engineProtocolVersion: '1.0',
    }
    const decision = evaluateExploration(computedState, policyContext, gapState)
    setPolicyAction(decision.output)
  }, [computedState, gapState, setPolicyAction])
}
