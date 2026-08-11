// ux-probe-v9.mjs — Verify P0-1 fix on Package path (RecommendationPanel + ExplorationJourney)
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE = 'http://127.0.0.1:5173'
const OUT = path.join(__dirname, '..', '.ux-probe')

async function main() {
  console.log('[v9] Launching browser...')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  // Step 1: Navigate to package page
  console.log('[v9] Opening package page...')
  await page.goto(`${BASE}/#/package/silk-road-exploration`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)

  await page.screenshot({ path: `${OUT}/v9-package-hero.png`, fullPage: false })
  console.log('[OK] Screenshot package hero → v9-package-hero.png')

  // Step 2: Click "开始探索" to scroll to journey
  const startBtn = page.locator('text=开始探索').first()
  if (await startBtn.count() > 0) {
    await startBtn.click()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${OUT}/v9-after-start.png`, fullPage: false })
    console.log('[OK] After 开始探索 → v9-after-start.png')
  }

  // Step 3: Click first entity to trigger RecommendationPanel  
  const entityBtn = page.locator('.guide-next-btn, .guide-position-value, .he-journey-node, .guide-next-cta').first()
  if (await entityBtn.count() > 0) {
    await entityBtn.click()
    console.log('[v9] Clicked entity, waiting for recommendations...')
    await page.waitForTimeout(4000)
    await page.screenshot({ path: `${OUT}/v9-entity-view.png`, fullPage: false })
    console.log('[OK] Entity view → v9-entity-view.png')
  }

  // Step 4: Scan for raw DSL patterns
  const bodyText = await page.evaluate(() => document.body.innerText)
  const rawPatterns = [
    /loc-[a-z]+→/,
    /person-[a-z]+→/,
    /[a-z]+_[a-z]+→[a-z_]+/,
    /→(part_of|traded_with|participated_in|related_to|influenced|caused|located_at|invented|spread)\b/,
  ]
  
  console.log('\n[v9] Raw DSL pattern scan:')
  let foundRaw = false
  for (const pat of rawPatterns) {
    const matches = bodyText.match(pat)
    if (matches) {
      console.log(`  ⚠️  FOUND: ${pat.source} → "${matches[0].substring(0, 100)}"`)
      foundRaw = true
    }
  }
  if (!foundRaw) console.log('  ✅ No raw DSL patterns found')

  console.log('\n[v9] Clean text check:')
  const cleanPatterns = [/张骞/, /班超/, /长安/, /参与/, /位于/, /贸易/, /发明/, /传播/]
  for (const pat of cleanPatterns) {
    if (pat.test(bodyText)) console.log(`  ✅ "${pat.source}" found`)
  }

  console.log('\n[v9] Text sample (first 1500 chars):')
  console.log(bodyText.substring(0, 1500))

  await browser.close()
  console.log('\n[v9] Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
