import { test, expect } from '@playwright/test'

// M74 Phase1 (C2) — QuickStart semantic navigation.
// Natural-language question chips must resolve to exploration packages
// (deterministic resolver), NEVER hit /explore/<中文> (backend TOPIC_PATTERN
// rejects non-slug topics with 400 + misleading copy).
const CASES: Array<[chip: string, hash: string]> = [
  ['凯撒为什么重要？', '#/package/roman-empire-exploration'],
  ['秦始皇统一六国以后发生了什么？', '#/package/china-civilization-v1'],
  ['罗马为什么灭亡？', '#/package/roman-empire-exploration'],
  ['丝绸之路改变了什么？', '#/package/silk-road-exploration'],
]

test.describe('E2E QuickStart (M74 Phase1)', () => {
  for (const [chip, hash] of CASES) {
    test(`chip「${chip}」opens ${hash} without errors`, async ({ page }) => {
      const exploreHits: string[] = []
      page.on('response', (r) => {
        if (r.url().includes('/explore/')) exploreHits.push(r.url())
      })
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.locator(`button:has-text("${chip}")`).first().click({ force: true })
      await expect(page).toHaveURL(new RegExp(hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
      // No 400 /explore request with a Chinese topic (the pre-fix bug).
      expect(exploreHits.some((u) => decodeURIComponent(u).includes('为什么') || decodeURIComponent(u).includes('灭亡'))).toBe(false)
      // No misleading network-error card.
      await expect(page.locator('.he-error-card')).toHaveCount(0)
    })
  }
})
