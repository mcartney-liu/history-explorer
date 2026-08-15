// M35 Feature E — FeedbackWidget smoke + regression test.
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import FeedbackWidget from './FeedbackWidget'

// silence React act-environment warning under jsdom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('FeedbackWidget', () => {
  it('renders the prompt and the two sentiment buttons', () => {
    const html = renderToStaticMarkup(<FeedbackWidget />)
    expect(html).toContain('feedback-widget')
    expect(html).toContain('这个探索有用吗？')
    expect(html).toContain('data-sentiment="up"')
    expect(html).toContain('data-sentiment="down"')
    expect(html).toContain('feedback-message')
  })

  it('forwards the page prop without breaking render', () => {
    const html = renderToStaticMarkup(<FeedbackWidget page="entity" />)
    expect(html).toContain('feedback-widget')
  })

  it('does NOT claim success when the POST fails (false-success regression)', async () => {
    // simulate a backend that rejects the feedback POST
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<FeedbackWidget page="discover" />)
    })

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )!.set!
    await act(async () => {
      setter.call(textarea, '断裂感测试')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const submitBtn = container.querySelector('.feedback-submit') as HTMLButtonElement
    expect(submitBtn).toBeTruthy()

    await act(async () => {
      submitBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 20))
    })

    // On a failed POST the widget must NOT report success; it must show a
    // retry affordance and preserve the draft so the visitor can resend.
    expect(container.textContent).not.toContain('已收到')
    expect(container.textContent).toContain('未送达')
    expect(container.textContent).toContain('重试提交')
    expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toBe('断裂感测试')

    root.unmount()
    vi.unstubAllGlobals()
  })
})
