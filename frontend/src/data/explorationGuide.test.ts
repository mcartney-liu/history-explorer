import { describe, it, expect } from 'vitest'
import { getPackages } from './explorationPackages'
import {
  getCurrentPosition,
  getNextSteps,
  getExplorationCoverage,
  getGuideSnapshot,
  visitedFromEvents,
} from './explorationGuide'
import type { UserBehaviorEvent } from './UserBehaviorEvent'

const china = () => getPackages().find((p) => p.slug === 'china-civilization-v1')!
const silkRoad = () => getPackages().find((p) => p.slug === 'silk-road-exploration')!
const romanEmpire = () => getPackages().find((p) => p.slug === 'roman-empire-exploration')!

describe('Exploration Guide — current position', () => {
  it('returns the package entry when nothing is visited yet (atEntry)', () => {
    const pos = getCurrentPosition(china(), [], 'zh')
    expect(pos).not.toBeNull()
    expect(pos!.atEntry).toBe(true)
    expect(pos!.entityGlobalId).toBe(china().entity_references[0])
  })

  it('returns the last visited package entity (trail order)', () => {
    const visited = ['china_v1:tp-tang', 'china_v1:tp-song']
    const pos = getCurrentPosition(china(), visited, 'zh')
    expect(pos).not.toBeNull()
    expect(pos!.atEntry).toBe(false)
    expect(pos!.entityGlobalId).toBe('china_v1:tp-song')
    expect(pos!.name).toContain('宋')
  })

  it('ignores entities outside the package (other datasets / unrelated)', () => {
    const visited = ['roman_empire:civ-roman', 'china_v1:tp-tang']
    const pos = getCurrentPosition(china(), visited, 'zh')
    expect(pos!.entityGlobalId).toBe('china_v1:tp-tang')
  })
})

describe('Exploration Guide — next steps (graph-reachable, unvisited, curated order)', () => {
  it('suggests every edge when nothing is visited yet (entry state)', () => {
    const steps = getNextSteps(china(), [], 'zh')
    // All china edges target unvisited entities → all suggested
    expect(steps.length).toBe(china().relationship_paths.length)
  })

  it('only suggests edges whose target is unvisited and source is visited', () => {
    const visited = ['china_v1:idea-keju']
    const steps = getNextSteps(china(), visited, 'zh')
    // keju is source of 科举→inherited→文官 → 文官 unvisited → suggested
    const kejuToWenguan = steps.find(
      (s) => s.edge.from === 'china_v1:idea-keju' && s.edge.to === 'china_v1:idea-wenguan',
    )
    expect(kejuToWenguan).toBeDefined()
    // 文官 not yet visited, so 文官→inherited→内阁 must NOT be suggested yet
    const wenguanToNeige = steps.find(
      (s) => s.edge.from === 'china_v1:idea-wenguan' && s.edge.to === 'china_v1:idea-neige',
    )
    expect(wenguanToNeige).toBeUndefined()
  })

  it('keeps the Package curated declaration order (no ranking / scoring)', () => {
    const steps = getNextSteps(china(), [], 'zh')
    const order = steps.map((s) => `${s.edge.from}->${s.edge.to}`)
    const declared = china()
      .relationship_paths.map((p) => `${p.from}->${p.to}`)
      .filter((k) => order.includes(k))
    expect(order).toEqual(declared)
  })

  it('returns no steps when everything is visited', () => {
    const all = china()
      .relationship_paths.flatMap((p) => [p.from, p.to])
      .filter((gid, i, arr) => arr.indexOf(gid) === i)
    const steps = getNextSteps(china(), all, 'zh')
    expect(steps.length).toBe(0)
  })

  it('resolves a reason from RELATIONSHIP_TEMPLATES (deterministic explanation)', () => {
    const visited = ['china_v1:idea-keju']
    const steps = getNextSteps(china(), visited, 'zh')
    const step = steps.find((s) => s.edge.type === 'inherited')
    expect(step).toBeDefined()
    // inherited forward template mentions actor and target
    expect(step!.reason).toContain('科举')
  })
})

describe('Exploration Guide — coverage', () => {
  it('is 0% with nothing visited', () => {
    const cov = getExplorationCoverage(china(), [])
    expect(cov.entityPercent).toBe(0)
    expect(cov.relationshipPercent).toBe(0)
    expect(cov.totalEntities).toBe(china().entity_references.length)
  })

  it('counts visited entities and completed edges', () => {
    const visited = ['china_v1:idea-keju', 'china_v1:idea-wenguan', 'china_v1:tp-tang']
    const cov = getExplorationCoverage(china(), visited)
    expect(cov.visitedEntities).toBe(3)
    // 科举→文官 edge completed; 唐 is a before-source (tang→song) but song unvisited → not completed
    expect(cov.visitedRelationships).toBe(1)
    expect(cov.entityPercent).toBe(Math.floor((3 / cov.totalEntities) * 100))
  })
})

describe('Exploration Guide — snapshot & generalization (multi-civilization support)', () => {
  it('produces a full snapshot for the China package', () => {
    const snap = getGuideSnapshot(china(), ['china_v1:idea-keju'], 'zh')
    expect(snap.position).not.toBeNull()
    expect(snap.nextSteps.length).toBeGreaterThan(0)
    expect(snap.coverage.entityPercent).toBeGreaterThanOrEqual(0)
  })

  // Q7: Package Generalization Test — the SAME Guide functions drive every
  // civilization package with zero package-specific logic.
  it('generalizes to the Silk Road package (cross-dataset entities)', () => {
    const snap = getGuideSnapshot(silkRoad(), ['silk_road:person-zhang-qian'], 'zh')
    expect(snap.position!.entityGlobalId).toBe('silk_road:person-zhang-qian')
    // zhang-qian -> silk-road-opened is reachable and unvisited
    const next = snap.nextSteps.find((s) => s.edge.type === 'participated_in')
    expect(next).toBeDefined()
    // M73 Phase2-A: zh locale shows labels.zh (丝绸之路开辟), not the raw name
    expect(next!.toName).toContain('丝绸之路开辟')
  })

  it('generalizes to the Roman Empire package (evidence-bound edges)', () => {
    const snap = getGuideSnapshot(
      romanEmpire(),
      ['roman_empire:tp-republic', 'roman_empire:tp-27bc'],
      'zh',
    )
    expect(snap.position!.entityGlobalId).toBe('roman_empire:tp-27bc')
    // republic -> 27bc edge completed, so it must NOT be re-suggested
    const completed = snap.nextSteps.find(
      (s) => s.edge.from === 'roman_empire:tp-republic' && s.edge.to === 'roman_empire:tp-27bc',
    )
    expect(completed).toBeUndefined()
    // augustus -> empire-established remains reachable from tp-27bc? No — its
    // source (augustus) is unvisited, so it must NOT be suggested. Only edges
    // from visited sources are suggested (graph-reachability rule).
    const augustus = snap.nextSteps.find(
      (s) => s.edge.from === 'roman_empire:person-augustus',
    )
    expect(augustus).toBeUndefined()
    // nothing visited rule holds: nextSteps must not include already-visited targets
    for (const s of snap.nextSteps) {
      expect(snap.position ? ['roman_empire:tp-republic', 'roman_empire:tp-27bc'].includes(s.edge.to) : true).toBe(false)
    }
  })
})

describe('Exploration Guide — Representative Exploration Event Sequence (Q5, consume-only reuse)', () => {
  // A REPRESENTATIVE exploration sequence (fixture — NOT real user data, per PO).
  // It exercises the same UserBehaviorEvent stream that already powers the
  // deterministic ProductUsageAnalysis (M43–M49), proving reuse without
  // module convergence / refactor (Q-B).
  const representativeSequence: UserBehaviorEvent[] = [
    { action: 'open_discover' },
    { action: 'open_entity', entityGlobalId: 'roman_empire:tp-republic' },
    { action: 'click_relationship', entityGlobalId: 'roman_empire:tp-27bc' },
    { action: 'open_entity', entityGlobalId: 'roman_empire:tp-27bc' },
    { action: 'open_entity', entityGlobalId: 'roman_empire:tp-republic' }, // revisit → dedupe
    { action: 'open_entity', entityGlobalId: 'roman_empire:event-roman-empire-established' },
    { action: 'click_journey', entityGlobalId: 'roman_empire:event-roman-empire-established' },
  ]

  it('extracts a deduped visited trail from the event stream', () => {
    const visited = visitedFromEvents(representativeSequence)
    expect(visited).toEqual([
      'roman_empire:tp-republic',
      'roman_empire:tp-27bc',
      'roman_empire:event-roman-empire-established',
    ])
  })

  it('closes the loop: event stream → visited trail → Guide snapshot', () => {
    const visited = visitedFromEvents(representativeSequence)
    const snap = getGuideSnapshot(romanEmpire(), visited, 'zh')
    // position = last visited package entity
    expect(snap.position!.entityGlobalId).toBe('roman_empire:event-roman-empire-established')
    expect(snap.position!.atEntry).toBe(false)
    // coverage reflects 3 visited entities of the curated set
    expect(snap.coverage.visitedEntities).toBe(3)
    // next steps never suggest an already-visited target
    for (const s of snap.nextSteps) {
      expect(visited.includes(s.edge.to)).toBe(false)
    }
    // completed edges are not re-suggested: republic->27bc done, and
    // established->civ-roman is now reachable (source visited)
    const toCivRoman = snap.nextSteps.find((s) => s.edge.to === 'roman_empire:civ-roman')
    expect(toCivRoman).toBeDefined()
    // deterministic: same input → same output
    const snap2 = getGuideSnapshot(romanEmpire(), visited, 'zh')
    expect(snap2).toEqual(snap)
  })

  it('the same event stream is consumable by the deterministic intelligence stack (no refactor)', () => {
    // The fixture uses only fields UserBehaviorEvent already carries; the
    // Guide consumes the stream exactly as ProductUsageAnalysis does —
    // proving reuse without touching the M43–M49 modules.
    const visited = visitedFromEvents(representativeSequence)
    expect(visited.length).toBeGreaterThan(0)
    expect(visited.every((gid) => typeof gid === 'string')).toBe(true)
  })
})
