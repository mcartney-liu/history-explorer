import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup as r2s } from 'react-dom/server'
import { LocaleProvider } from '../../data/locale'
import type { ReactElement } from 'react'
import NextStepPanel, { NextStepPanelView } from '../NextStepPanel'
import type { ExplorationAction, ExplorationActionType } from '../../next/exploration/ExplorationPolicy'

const render = (el: ReactElement) => r2s(<LocaleProvider>{el}</LocaleProvider>)

// --- Fixtures ---

// Mirrors ExplorationPolicy.evaluateExploration output (Knowledge Progression,
// NOT a content recommendation). No score, no relation_path, no candidate_source.
function action(
  type: ExplorationActionType,
  targetRef: string,
  reason: string,
  narrativeHook: string,
): ExplorationAction {
  return {
    type,
    targetRef,
    reason,
    narrativeHook,
    expectedGrowth: { dimension: 'causality', relationType: 'influenced' },
    confidence: 0.85,
  }
}

// --- NextStepPanelView (presentational) ---

describe('NextStepPanelView (Phase 5 A3 presentational)', () => {
  it('renders the heading, cognitive-action label, reason and narrative hook', () => {
    const actions = [
      action('follow_cause', 'roman_empire:octavian', 'Same dynasty successor.', 'How did Augustus shape Octavian?'),
    ]
    const html = render(<NextStepPanelView actions={actions} />)
    expect(html).toContain('下一站探索') // discover.nextStepHeading (zh default)
    expect(html).toContain('追因') // ACTION_LABELS.follow_cause (VS-03 TP-16)
    expect(html).toContain('Same dynasty successor.') // reason
    expect(html).toContain('How did Augustus shape Octavian?') // narrativeHook
    expect(html).toContain('he-nextstep')
  })

  it('carries NO recommendation vocabulary (A3 red-line: ExplorationPolicy is not a RecommendationPolicy)', () => {
    // M88.0 §8.3 / ADR-0015 D1: the surfaced "next step" must read as a
    // cognitive action, never as a content recommendation. Guard against any
    // recommendation vocabulary leaking back into the rendered UI.
    const actions = [action('open_dimension', 'roman_empire:x', 'a reason', 'a hook')]
    const html = render(<NextStepPanelView actions={actions} />)
    expect(html).not.toContain('推荐')
    expect(html.toLowerCase()).not.toContain('recommend')
  })

  it('maps every cognitive-action type to its Chinese label', () => {
    const all: ExplorationActionType[] = [
      'open_dimension',
      'follow_cause',
      'deep_continue',
      'compare_context',
      'reflect',
    ]
    const actions = all.map((t, i) => action(t, `t:${i}`, `reason-${i}`, `hook-${i}`))
    const html = render(<NextStepPanelView actions={actions} />)
    expect(html).toContain('展开维度')
    expect(html).toContain('追因')
    expect(html).toContain('深入延续')
    expect(html).toContain('比较语境')
    expect(html).toContain('反思')
  })

  it('preserves the policy action order and does NOT re-rank', () => {
    const actions = [
      action('open_dimension', 't:first', 'first reason', 'h1'),
      action('follow_cause', 't:second', 'second reason', 'h2'),
      action('deep_continue', 't:third', 'third reason', 'h3'),
    ]
    const html = render(<NextStepPanelView actions={actions} />)
    expect(html.indexOf('first reason')).toBeLessThan(html.indexOf('second reason'))
    expect(html.indexOf('second reason')).toBeLessThan(html.indexOf('third reason'))
  })

  it('weakly marks already-seen targets without reordering them', () => {
    const actions = [
      action('follow_cause', 't:seen_node', 'seen reason', 'h'),
      action('open_dimension', 't:new_node', 'new reason', 'h'),
    ]
    const seen = new Set(['t:seen_node'])
    const html = render(<NextStepPanelView actions={actions} seenGlobalIds={seen} />)
    expect(html).toContain('is-seen')
    // The seen target stays first (this panel never reorders).
    expect(html.indexOf('seen reason')).toBeLessThan(html.indexOf('new reason'))
  })

  it('binds each card to its target via an explore aria-label (navigation contract)', () => {
    // Navigation ownership stays with App: the card is a clickable action whose
    // aria-label binds the policy's target entity. Actual DOM-click dispatch
    // needs jsdom (intentionally unavailable here); the wiring is proven
    // structurally via the rendered button + aria contract.
    const actions = [action('follow_cause', 'roman_empire:octavian', 'r', 'h')]
    const html = render(<NextStepPanelView actions={actions} onNodeClick={() => {}} />)
    expect(html).toContain('探索') // entity.exploreAria = "探索 %{name}"
    expect(html).toContain('he-nextstep-node')
  })
})

// --- Container (null when no actions; navigation delegated to App) ---

describe('NextStepPanel container (Phase 5 A3)', () => {
  it('renders nothing when there are no actions', () => {
    const html = render(<NextStepPanel actions={[]} />)
    expect(html).toBe('')
  })

  it('renders the panel when at least one action exists', () => {
    const html = render(<NextStepPanel actions={[action('reflect', 'x:y', 'summarize now', 'wrap it up?')]} />)
    expect(html).toContain('反思') // ACTION_LABELS.reflect (VS-03 TP-16)
    expect(html).toContain('summarize now')
  })
})
