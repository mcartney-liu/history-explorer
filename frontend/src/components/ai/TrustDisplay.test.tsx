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
    expect(text).toContain('Roman Empire Established')
    expect(text).toContain('participated_in')
    expect(text).toContain('src-tacitus-ann')      // source id surfaced (Trust)
  })

  it('renders verified evidence entries with the verified badge', () => {
    const el = renderTrust({ evidence: EVIDENCE, engine: 'deterministic' })
    const text = el.textContent ?? ''
    expect(text).toContain('person-augustus')
    expect(text).toContain('已校验')                // verified badge
    expect(text).toContain('roman_empire:person-augustus')
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
    expect(text).toContain('src-tacitus-ann')
    expect(text).not.toContain('推荐原因')          // no reason -> no reason row
  })
})
