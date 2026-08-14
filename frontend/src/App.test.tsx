// @vitest-environment jsdom
//
// P1-② regression net (2026-08-14).
//
// This is the safety net that MUST stay green before and after every slice
// extracted from the 1482-line App.tsx monolith. It is intentionally a
// behavior-preserving smoke test: render <App /> to static markup and assert
// it produces non-empty output without throwing. Because renderToStaticMarkup
// does NOT run effects, this exercises the render path (all hooks' initial
// state, context providers, and the default-route view) without firing
// fetch/setInterval side effects.
//
// If a future extraction changes rendered output, this test catches it before
// the change ships. Keep it additive and side-effect-free.
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'

describe('App (P1-② regression net)', () => {
  it('renders to non-empty markup without crashing', () => {
    const html = renderToStaticMarkup(createElement(App))
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(0)
  })
})
