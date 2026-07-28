// ============================================================
// M59-020 — Exploration History + Compare Queue + AI Memory
// Workspace data models. Pure types. No UI binding.
// ============================================================

import type { NavNode } from '../../components/navigation'

// ---- Exploration History ----
export interface ExplorationHistoryItem {
  id: string
  entityId: string
  name: string
  type: string
  visitedAt: number
  source: 'search' | 'related' | 'recommendation' | 'direct'
  depth: number
}

export interface ExplorationHistory {
  items: ExplorationHistoryItem[]
  currentPath: string[]
  currentEntityId?: string
}

/** Build history from navigation stack */
export function buildExplorationHistory(nodes: NavNode[]): ExplorationHistory {
  const items: ExplorationHistoryItem[] = nodes.map((n, i) => ({
    id: n.type === 'entity' ? n.id : n.topic,
    entityId: n.type === 'entity' ? n.id : n.topic,
    name: n.name || n.type === 'entity' ? n.id : n.topic,
    type: n.type,
    visitedAt: Date.now() - (nodes.length - i) * 60000,
    source: i === 0 ? 'direct' : 'related',
    depth: i,
  }))

  return {
    items,
    currentPath: nodes.map((n) => (n.type === 'entity' ? n.name || n.id : n.topic)),
    currentEntityId: nodes.length > 0 ? (nodes[nodes.length - 1].type === 'entity' ? nodes[nodes.length - 1].id : nodes[nodes.length - 1].topic) : undefined,
  }
}

// ---- Compare Queue ----
export interface CompareQueueItem {
  entityId: string
  name: string
  type: string
  addedAt: number
}

export interface CompareQueue {
  items: CompareQueueItem[]
}

export function addToCompare(queue: CompareQueue, item: CompareQueueItem): CompareQueue {
  if (queue.items.some((i) => i.entityId === item.entityId)) return queue
  return { items: [...queue.items, item] }
}

export function removeFromCompare(queue: CompareQueue, entityId: string): CompareQueue {
  return { items: queue.items.filter((i) => i.entityId !== entityId) }
}

// ---- AI Exploration Memory ----
export interface AIExplorationMemory {
  entityHistory: string[]
  explorationPath: string[]
  userInterests: string[]
  previousQuestions: string[]
}

export function buildAIMemory(history: ExplorationHistory): AIExplorationMemory {
  const types = [...new Set(history.items.map((i) => i.type))]
  return {
    entityHistory: history.items.map((i) => i.name),
    explorationPath: history.currentPath,
    userInterests: types,
    previousQuestions: [],
  }
}
