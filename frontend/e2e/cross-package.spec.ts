import { test, expect } from '@playwright/test'
import { assertBackendUp } from './helpers'

// E2E-2 — cross-civilization chain:
// China package → recommended_next (stable ID pointer) → India package →
// cross-civilization relation chain (Buddhism → spread → Silk Road).
// Selector policy: data-testid + role/accessible name; text = visible content.
test.beforeAll(assertBackendUp)

test('E2E-2 跨文明链：中国包 → 推荐下一步 → 印度包 → 跨文明关系链', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const chinaCta = page.getByRole('button', { name: '开始探索 中国文明演化探索包 V1' })
  await expect(chinaCta).toBeVisible()
  await chinaCta.click({ force: true })

  // recommended_next block (data-testid) → India package entry (role + name)
  const next = page.getByTestId('recommended-next')
  await expect(next).toBeVisible()
  await next.getByRole('button', { name: /印度文明探索包 V1/ }).click()

  // India package page
  await expect(
    page.getByRole('heading', { name: '印度文明探索包 V1', level: 1 }),
  ).toBeVisible()

  // Cross-civilization relation chain: Buddhism → spread → Silk Road
  const chain = page.getByTestId('relationship-chain')
  await expect(chain).toBeVisible()
  await expect(chain).toContainText('佛教')
  await expect(chain).toContainText('传播')
  await expect(chain).toContainText('丝绸之路')
})
