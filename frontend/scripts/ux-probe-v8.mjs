// ux-probe-v8.mjs — 精准截图"下一站探索"面板（ContinueExploringPanel）
import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:5173'
const OUT = '.ux-probe'

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  // 1. Navigate to silk_road topic view (where ContinueExploringPanel appears)
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)

  // Click on Silk Road theme card to enter topic exploration
  try {
    const themeCard = page.locator('text=Silk Road').first()
    if (await themeCard.isVisible({ timeout: 5000 })) {
      await themeCard.click()
      await page.waitForTimeout(3000)
    }
  } catch (_) {}

  // Now navigate directly to topic view via hash
  await page.evaluate(() => { window.location.hash = '#/topic/silk_road' })
  await page.waitForTimeout(4000)

  // 2. Find and screenshot the "下一站探索" / "Continue Exploring" section
  const continueSection = page.locator('.he-continue').first()
  
  let found = false
  if (await continueSection.isVisible({ timeout: 5000 }).catch(() => false)) {
    found = true
    await continueSection.screenshot({ path: `${OUT}/v8-continue-exploring.png`, fullPage: false })
    console.log('[OK] Screenshot "继续探索" panel → v8-continue-exploring.png')
  } else {
    console.log('[WARN] .he-continue not visible, trying full-page fallback')
  }

  // Also try finding by text content
  const altLocator = page.locator('text=/Pax Romana|Roman Egypt|traded_with|part_of/').first()
  if (await altLocator.isVisible({ timeout: 3000 }).catch(() => false)) {
    await altLocator.screenshot({ path: `${OUT}/v8-raw-dsl-found.png`, fullPage: false })
    console.log('[WARN] Still found raw DSL text! → v8-raw-dsl-found.png')
  }

  // 3. Full page scroll to capture everything
  await page.screenshot({ 
    path: `${OUT}/v8-full-page.png`, 
    fullPage: true 
  })

  // 4. Extract all text from the continue exploring panel
  const panelText = await page.evaluate(() => {
    const panel = document.querySelector('.he-continue') || document.querySelector('[class*="continue"]')
    if (!panel) return '[NOT FOUND] No .he-continue element on page'
    
    // Get all list item texts
    const items = panel.querySelectorAll('li, .he-continue-item')
    const texts = []
    items.forEach(li => {
      texts.push(li.innerText.replace(/\s+/g, ' ').trim())
    })
    return texts.length > 0 ? texts.join('\n---\n') : '[EMPTY] Panel exists but no items'
  })
  
  console.log('\n=== 下一站探索 PANEL TEXT ===')
  console.log(panelText)

  // 5. Scan entire page for remaining bare IDs patterns
  const scanResult = await page.evaluate(() => {
    const body = body || document.body
    const text = body.innerText
    const patterns = [
      { name: 'arrow-path (→)', regex: /\w+→\w+/g },
      { name: 'local-id (topic:id)', regex: /[a-z]+_[a-z]+:[a-z_-]+/g },
      { name: 'bare-rel-enum', regex: /\b(traded_with|part_of|influenced|invented|participated_in|located_at|related_to|caused_by|preceded|followed|belongs_to|originated_from|connected_to|fought_in|born_in|died_in)\b/g },
    ]
    const results = {}
    for (const p of patterns) {
      const matches = text.match(p.regex) || []
      if (matches.length > 0) results[p.name] = [...new Set(matches)].slice(0, 10)
    }
    return results
  })

  console.log('\n=== REMAINING RAW DSL SCAN ===')
  console.log(JSON.stringify(scanResult, null, 2))

  await browser.close()
})().catch(e => { console.error(e.message); process.exit(1) })
