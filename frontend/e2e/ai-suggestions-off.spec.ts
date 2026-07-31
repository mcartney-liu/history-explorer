// M74-003 (C3-2) — Case 1: Feature OFF (default :5173, flag unset).
// Verifies M73 byte-identical behaviour on the Package page:
//  - the exploration-suggestions touchpoint is NOT in the DOM
//  - ZERO /api/v1/ai/explain requests are issued
import { test, expect } from '@playwright/test'

test.describe('AI suggestions — Feature OFF (default build)', () => {
  test('Package page renders no AI touchpoint and issues no /ai/explain request', async ({
    page,
  }) => {
    const aiRequests: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/ai/explain')) aiRequests.push(req.url())
    })

    await page.goto('/#/package/roman-empire-exploration', { waitUntil: 'domcontentloaded' })
    // Wait for the package page body (local data) to settle.
    await page.getByRole('heading', { name: /罗马帝国/ }).first().waitFor({ timeout: 10_000 })
    await page.waitForTimeout(1200)

    // 1) zero render — no AI touchpoint in the DOM
    await expect(page.getByTestId('exploration-suggestions')).toHaveCount(0)
    await expect(page.getByText('基于知识库证据的探索建议')).toHaveCount(0)

    // 2) zero request — nothing ever hit /api/v1/ai/explain
    expect(aiRequests).toHaveLength(0)
  })
})
