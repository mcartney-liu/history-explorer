import { describe, it, expect } from 'vitest'
import {
  DISCOVER_PAGE_AUDIT,
  ENTITY_PAGE_AUDIT,
  allPageAudits,
  sectionsWithoutGuidance,
  sectionsWithoutEmptyState,
  auditSummary,
} from './UIAudit'

describe('UIAudit', () => {
  it('returns both page audits', () => {
    const audits = allPageAudits()
    expect(audits).toHaveLength(2)
    expect(audits[0].route).toBe('/')
    expect(audits[1].route).toBe('/entity/:id')
  })

  it('DiscoverPage has all expected sections', () => {
    const names = DISCOVER_PAGE_AUDIT.sections.map((s) => s.name)
    expect(names).toContain('DiscoverHero')
    expect(names).toContain('RecentResearches')
    expect(names).toContain('ExplorationTrail')
    expect(names).toContain('ThemeExplorer')
    expect(names).toContain('FeaturedExploration')
  })

  it('EntityPage has all tab sections', () => {
    const names = ENTITY_PAGE_AUDIT.sections.map((s) => s.name)
    expect(names).toContain('InfoTab')
    expect(names).toContain('ExploreTab')
    expect(names).toContain('ResearchTab')
    expect(names).toContain('AnalyzeTab')
  })

  it('every section has userGoal and successMetric', () => {
    for (const audit of allPageAudits()) {
      for (const section of audit.sections) {
        expect(section.userGoal).toBeTruthy()
        expect(section.successMetric).toBeTruthy()
      }
    }
  })

  it('identifies sections without guidance', () => {
    const missing = sectionsWithoutGuidance(ENTITY_PAGE_AUDIT)
    expect(missing.length).toBeGreaterThan(0)
    expect(missing.every((s) => !s.hasGuidance)).toBe(true)
  })

  it('generates audit summary', () => {
    const summary = auditSummary(DISCOVER_PAGE_AUDIT)
    expect(summary).toContain('/')
    expect(summary).toContain('sections')
    expect(summary).toContain('missing')
  })

  it('EntityPage newUserGuidance is false', () => {
    expect(ENTITY_PAGE_AUDIT.newUserGuidance).toBe(false)
  })
})
