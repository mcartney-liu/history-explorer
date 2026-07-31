import { test, expect } from '@playwright/test'
import { assertBackendUp, readEvents } from './helpers'

// E2E-1 — main exploration chain:
// Discover → Official Package → Guide (deterministic reasons) → Entity page →
// Source badge click (view_source telemetry).
// Selector policy (PO): data-testid + role/accessible name first; text
// assertions only verify user-visible content.
test.beforeAll(assertBackendUp)

// Longest spec: home load + package page + guide + entity + source chain.
// Serial worker + web-font late load makes 30s default too tight.
test.setTimeout(60_000)

test('E2E-1 主探索链：Discover → 中国包 → Guide → Entity → Source(view_source)', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  // deterministic stream for this test
  await page.evaluate(() => localStorage.removeItem('history-explorer.events.v1'))

  // Discover → China package card CTA (role + accessible name). force: the
  // home hero uses a background animation + web-font late load which makes
  // Playwright's stability check flaky; we only assert visibility first.
  const chinaCta = page.getByRole('button', { name: '开始探索 中国文明演化探索包 V1' })
  await expect(chinaCta).toBeVisible()
  await chinaCta.click({ force: true })

  // Package first screen (user-visible content)
  await expect(
    page.getByRole('heading', { name: '中国文明演化探索包 V1', level: 1 }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: '探索目标' })).toBeVisible()

  // Guide panel (data-testid) with deterministic Chinese reasons
  const guide = page.getByTestId('exploration-guide')
  await expect(guide).toBeVisible()
  await expect(guide).toContainText('下一步可以探索')
  await expect(guide).toContainText(/在时间上早于|承继了|统治了|参与/)

  // Source chain: click a claim source badge (clickable only) → view_source
  // telemetry (behavior-analysis, anonymous localStorage)
  await page.locator('.source-badge--clickable').first().click()
  const sources = await readEvents(page, 'view_source')
  expect(sources.length).toBeGreaterThan(0)
  expect(sources[0]?.sourceId).toBeTruthy()

  // Guide next-step button (role) → drills into the entity page (breadcrumb nav)
  await guide.getByRole('button', { name: /查看 .* →/ }).first().click()
  await expect(page.getByRole('navigation', { name: '面包屑导航' })).toBeVisible()
})
