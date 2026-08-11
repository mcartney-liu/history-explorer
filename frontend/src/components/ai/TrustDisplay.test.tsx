// @vitest-environment jsdom
// M74-003 (C3-1) — TrustDisplay unit tests.
// Renders the REAL component through LocaleProvider. Hard-asserts:
//  - title is evidence-based copy ("基于知识库证据的探索建议"), NEVER "AI" wording
//    for deterministic output (PO Condition 2)
//  - engine badge distinguishes deterministic vs AI (PO Condition 1)
//  - consumes only validated fields (evidence / next_exploration) — renders
//    them as-is, no local fact assembly (PO Condition 3)
//  - empty state renders when nothing to show
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { LocaleProvider } from '../../data/locale'
import { TrustDisplay } from './TrustDisplay'
import type { AIConfidence, AIEvidence, AIEngine, AINextExploration } from '../../data/aiClient'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const EVIDENCE: AIEvidence[] = [
  { global_id: 'roman_empire:person-augustus', kind: 'entity', label: 'person-augustus', status: 'verified' },
]
const NEXT: AINextExploration[] = [
  {
    global_id: 'roman_empire:event-roman-empire-established',
    label: 'Roman Empire Established',
    relationship: 'participated_in',
    source_id: 'src-tacitus-ann',
    claim_ids: ['ec-rom-021'],
  },
]
// M74-004-002 (2B): Evidence Card detail — all fields from the backend Planner.
const NEXT_FULL: AINextExploration[] = [
  {
    ...NEXT[0],
    reason: '因为该事件与焦点实体的关系有两条已校验证据支持',
    claim_text: 'Augustus 成为首位罗马皇帝。',
    source_title: '塔西佗编年史',
    source_tier: 'primary',
  },
]

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function renderTrust(props: {
  evidence?: AIEvidence[]
  nextExploration?: AINextExploration[]
  engine?: AIEngine
  confidence?: AIConfidence
}) {
  act(() => {
    root.render(
      <LocaleProvider>
        <TrustDisplay {...props} />
      </LocaleProvider>,
    )
  })
  return container
}

describe('TrustDisplay', () => {
  it('renders evidence-based title, never AI wording, for deterministic output', () => {
    const el = renderTrust({ evidence: EVIDENCE, nextExploration: NEXT, engine: 'deterministic' })
    const text = el.textContent ?? ''
    expect(text).toContain('基于知识库证据的探索建议')
    expect(text).toContain('顺着它')            // 视角副标题：探索导航
    expect(text).toContain('确定性输出')
    expect(text).not.toContain('AI 生成')          // deterministic ≠ AI-generated
    expect(text).not.toContain('AI-generated')
  })

  it('marks AI-generated output with the AI engine badge', () => {
    const el = renderTrust({ evidence: EVIDENCE, engine: 'ai' })
    expect(el.textContent ?? '').toContain('AI 生成')
  })

  it('renders next-exploration items with relationship and source binding', () => {
    const el = renderTrust({ nextExploration: NEXT, engine: 'deterministic' })
    const text = el.textContent ?? ''
    expect(text).toContain('罗马帝国建立')           // getEntityDisplayName mapped
    expect(text).toContain('参与')                    // getRelationshipLabel mapped
    expect(text).toContain('tacitus ann')             // formatSourceId cleaned
  })

  it('renders verified evidence entries with the verified badge', () => {
    const el = renderTrust({ evidence: EVIDENCE, engine: 'deterministic' })
    const text = el.textContent ?? ''
    expect(text).toContain('person-augustus')          // formatSourceId stripped prefix
    expect(text).toContain('已校验')                // verified badge
    expect(text).toContain('person-augustus')          // global_id also formatted
  })

  it('renders the empty state when nothing is available', () => {
    const el = renderTrust({})
    expect(el.textContent ?? '').toContain('暂无可用知识库证据')
  })

  // ---- M74-004-002 (Commit 2B): Evidence Card detail assertions ----

  it('renders reason / claim_text / source_title / source_tier from the backend', () => {
    const el = renderTrust({ nextExploration: NEXT_FULL, engine: 'deterministic' })
    const text = el.textContent ?? ''
    expect(text).toContain('推荐原因')
    expect(text).toContain('因为该事件与焦点实体的关系有两条已校验证据支持')
    expect(text).toContain('证据原文')
    expect(text).toContain('Augustus 成为首位罗马皇帝。')
    expect(text).toContain('塔西佗编年史')          // source_title surfaced
    expect(text).toContain('一手史料')              // source_tier label (primary)
    expect(text).not.toContain('AI 生成')          // deterministic ≠ AI-generated
  })

  it('renders confidence when provided (server-side binding indicator)', () => {
    const el = renderTrust({ evidence: EVIDENCE, engine: 'deterministic', confidence: 'high' })
    expect(el.textContent ?? '').toContain('可信度')
  })

  it('keeps legacy next items (no detail fields) rendering source_id only', () => {
    const el = renderTrust({ nextExploration: NEXT, engine: 'deterministic' })
    const text = el.textContent ?? ''
    expect(text).toContain('tacitus ann')             // formatSourceId cleaned
    expect(text).not.toContain('推荐原因')          // no reason -> no reason row
  })

  // ---- M74-004-003 (G1-G4): Trust Experience Finalization assertions ----

  it('G1: tier badge maps to the Design System semantic tone (primary)', () => {
    const el = renderTrust({ nextExploration: NEXT_FULL, engine: 'deterministic' })
    const tierBadge = el.querySelector('.trust-display-next-source .badge')
    expect(tierBadge).not.toBeNull()
    expect(tierBadge!.className).toContain('badge--primary')  // NOT neutral
    expect(tierBadge!.className).not.toContain('badge--neutral')
  })

  it('G2: next section label is "推荐探索" — differentiated from GuidePanel', () => {
    const el = renderTrust({ nextExploration: NEXT_FULL, engine: 'deterministic' })
    expect(el.textContent ?? '').toContain('推荐探索')
    // title (Trust Boundary marker) stays untouched
    expect(el.textContent ?? '').toContain('基于知识库证据的探索建议')
  })

  it('G3: confidence is localised to zh (no English High/Medium/Low)', () => {
    const el = renderTrust({ evidence: EVIDENCE, engine: 'deterministic', confidence: 'high' })
    const text = el.textContent ?? ''
    expect(text).toContain('可信度：高')
    expect(text).not.toMatch(/High|Medium|Low/)
  })

  it('G4: section exposes an aria-label (GuidePanel accessibility pattern)', () => {
    const el = renderTrust({ evidence: EVIDENCE, nextExploration: NEXT, engine: 'deterministic' })
    const section = el.querySelector('[data-testid="trust-display"]')
    expect(section!.getAttribute('aria-label')).toBe('基于知识库证据的探索建议')
  })
})
