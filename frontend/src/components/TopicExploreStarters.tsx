// TopicExploreStarters (Phase 5 / M9-001 family).
//
// Wraps FirstExplorationGuide and sources its starters from the DETERMINISTIC,
// EXPLAINABLE backend endpoint GET /api/v1/topics/{slug}/explore-starters
// (centrality + type-diversity over the Knowledge Graph — no AI, no DB).
//
// HYBRID MODE (v2 — "engine picks, curators write"):
//  The graph engine decides WHICH entities to show (by centrality + diversity).
//  The static TOPIC_STARTERS table provides HOW to present them (Chinese label +
//  human-curated description).  This gives us:
//    - Dynamic logic (every topic auto-covered, new entities appear)
//    - Human quality (curated Chinese copy, not machine language)
//
// Graceful degradation (per FRW resilience rule):
//  - On mount we immediately show the static curated table (resolveStarters),
//    so the UI is never empty while the fetch is in flight.
//  - If the endpoint errors or returns no entry_points, we KEEP the static
//    table. The dynamic data only replaces it when it actually has entries.
//  - For each engine-picked entity:
//      * Found in static table → curated label + description (reason hidden)
//      * NOT in static table   → raw name + generic type-based fallback

import { useEffect, useState, useMemo } from 'react'
import FirstExplorationGuide from './FirstExplorationGuide'
import { resolveStarters, type StarterItem } from '../data/explorationStarters'
import type { NavNode } from './navigation'

type TopicExploreStartersProps = {
  topic: string
  title: string
  onStarterClick: (target: NavNode) => void
}

const env = (import.meta as { env?: Record<string, string> }).env
const API_BASE = (env?.VITE_API_BASE || 'http://localhost:8001').replace(/\/$/, '')

type EntryPoint = {
  global_id: string
  name: string
  type: string
  reason?: string
  score?: number
}

// Generic fallback descriptions for un-curated entities (type → natural Chinese).
// These replace machine-language reasons like "连接 22 条关系" with
// user-facing copy that a normal person can read.
const TYPE_FALLBACK_DESC: Record<string, string> = {
  Civilization: '探索这个文明的核心脉络与兴衰',
  Event: '了解这一关键历史转折',
  Person: '认识这位塑造时代的历史人物',
  Religion: '了解这一信仰的起源与传播',
  Idea: '理解这一思想如何影响后世',
  Technology: '看看这项技术如何改变世界',
  Location: '走进这片承载历史的土地',
  Organization: '了解这个组织的兴衰历程',
}

function fallbackDescription(type: string): string {
  return TYPE_FALLBACK_DESC[type] ?? '点击深入了解这个历史条目'
}

export default function TopicExploreStarters({
  topic,
  title,
  onStarterClick,
}: TopicExploreStartersProps) {
  const [starters, setStarters] = useState<StarterItem[]>(() => resolveStarters(topic))

  // Build a lookup map from the static curated table (keyed by global_id)
  // so we can merge human-written Chinese copy onto engine-picked entities.
  const curatedMap = useMemo(() => {
    const map = new Map<string, StarterItem>()
    for (const s of resolveStarters(topic)) {
      map.set(s.id, s)
    }
    return map
  }, [topic])

  useEffect(() => {
    let cancelled = false
    // Show the static table immediately (no empty flash).
    setStarters(resolveStarters(topic))

    fetch(`${API_BASE}/api/v1/topics/${encodeURIComponent(topic)}/explore-starters`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { entry_points?: EntryPoint[] } | null) => {
        if (cancelled || !data) return
        const eps = data.entry_points || []
        if (eps.length === 0) return // keep static fallback

        // HYBRID MERGE: engine picks WHICH, static table provides HOW.
        setStarters(
          eps.map((e) => {
            const curated = curatedMap.get(e.global_id)
            if (curated) {
              // Curated entity → use human-written Chinese label + description.
              // Hide machine reason; the description IS the explanation.
              return {
                id: e.global_id,
                label: curated.label,
                description: curated.description,
                target: { type: 'entity', id: e.global_id, name: curated.label } as NavNode,
              }
            }
            // Un-curated entity (new topic / new entity) → fallback.
            return {
              id: e.global_id,
              label: e.name,
              description: fallbackDescription(e.type),
              target: { type: 'entity', id: e.global_id, name: e.name } as NavNode,
            }
          }),
        )
      })
      .catch(() => {
        /* keep static fallback */
      })
    return () => {
      cancelled = true
    }
  }, [topic])

  return (
    <FirstExplorationGuide
      topic={topic}
      title={title}
      starters={starters}
      onStarterClick={onStarterClick}
    />
  )
}
