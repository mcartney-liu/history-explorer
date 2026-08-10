// UX probe v2 — 走完整探索链路，复现 P0-1（裸 DSL 路径）和 P0-2（搜索遮挡）
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.PROBE_BASE || 'http://127.0.0.1:5173'
const OUT = path.resolve(process.cwd(), '.ux-probe')
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)) })

async function shot(name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false })
  console.log(`  [shot] ${name}.png`)
}

// ---- 1. 首页 ----
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(3000)
await shot('01-home')

// ---- 2. 点"丝绸之路"主题卡片 ----
console.log('\n=== 2. CLICK SILK ROAD THEME ===')
const clicked = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.discover-theme-card')]
  const target = cards.find(c => c.textContent.includes('丝绸之路'))
  if (target) { target.click(); return `clicked: ${target.textContent.trim().slice(0, 40)}` }
  return 'not found'
})
console.log(clicked)
await page.waitForTimeout(3000)
await shot('02-after-theme-click')

// ---- 3. 点"开始探索"进入探索包 ----
console.log('\n=== 3. ENTER PACKAGE ===')
const pkgClicked = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button, [role="button"]')]
  const start = btns.find(b => b.textContent.includes('开始探索'))
  if (start) { start.click(); return 'clicked 开始探索' }
  // fallback: any package card
  const pkg = btns.find(b => b.className.includes('pkg-card-open'))
  if (pkg) { pkg.click(); return 'clicked pkg-card-open' }
  return 'not found'
})
console.log(pkgClicked)
await page.waitForTimeout(4000)
await shot('03-exploration-canvas')

// ---- 4. 抓取页面全部可见文本，检测裸 id / 裸关系枚举 ----
console.log('\n=== 4. TEXT SCAN FOR RAW IDS ===')
const fullText = await page.evaluate(() => document.body.innerText)
fs.writeFileSync(path.join(OUT, '03-canvas-text.txt'), fullText)

// 检测模式
const patterns = [
  { name: 'global_id pattern', regex: /[a-z]+-[a-z_]+→/g },
  { name: 'raw relationship enum', regex: /\b(participated_in|caused|influenced|located_at|related_to|before|after|contemporary_with|part_of|ruled|traded_with|invented|discovered|practiced|spoke|inherited|conquered|spread)\b/g },
  { name: 'local-id-like', regex: /\b(person-|event-|place-|concept-|artifact-)[a-z_]+\b/g },
]
for (const p of patterns) {
  const matches = fullText.match(p.regex)
  console.log(`  ${p.name}: ${matches ? matches.length : 0} hits`)
  if (matches && matches.length > 0) matches.slice(0, 8).forEach(m => console.log(`    → ${m}`))
}

// ---- 5. 点击一个实体，看详情页 ----
console.log('\n=== 5. CLICK ENTITY ===')
const entityClicked = await page.evaluate(() => {
  // 找任何看起来像实体链接的元素
  const all = [...document.querySelectorAll('button, a, [role="button"], .ep-node, .ce-item')]
  const entity = all.find(el => {
    const t = el.textContent.trim()
    return t.length > 2 && t.length < 40 && !t.includes('搜索') && !t.includes('了解') &&
           !t.includes('研究') && !t.includes('扩展') && !t.includes('开始')
  })
  if (entity) { entity.click(); return `clicked: ${entity.textContent.trim().slice(0, 30)} (${entity.className.slice(0, 60)})` }
  return 'none found'
})
console.log(entityClicked)
await page.waitForTimeout(3000)
await shot('04-entity-detail')

// ---- 6. 详情页文本扫描 ----
const detailText = await page.evaluate(() => document.body.innerText)
fs.writeFileSync(path.join(OUT, '04-detail-text.txt'), detailText)
for (const p of patterns) {
  const matches = detailText.match(p.regex)
  console.log(`  DETAIL ${p.name}: ${matches ? matches.length : 0} hits`)
  if (matches && matches.length > 0) matches.slice(0, 8).forEach(m => console.log(`    → ${m}`))
}

// ---- 7. 截取搜索区特写 ----
console.log('\n=== 7. SEARCH AREA INSPECT ===')
const searchArea = await page.evaluate(() => {
  const el = document.querySelector('.searchSlot, .search-slot, [class*="search"]')
  if (!el) return { found: false }
  const rect = el.getBoundingClientRect()
  return {
    found: true,
    tag: el.tagName,
    cls: el.className.slice(0, 100),
    top: Math.round(rect.top),
    left: Math.round(rect.left),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    text: el.innerText.slice(0, 100),
  }
})
console.log(JSON.stringify(searchArea, null, 2))

if (searchArea.found) {
  const searchEl = await page.$('.searchSlot, .search-slot, [class*="search"]')
  if (searchEl) await searchEl.screenshot({ path: path.join(OUT, '05-search-area.png') })
}

// ---- report ----
await browser.close()
const report = { consoleErrors, patterns: {} }
for (const p of patterns) {
  report.patterns[p.name] = (fullText + '\n---DETAIL---\n' + detailText).match(p.regex)?.length || 0
}
fs.writeFileSync(path.join(OUT, 'v2-report.json'), JSON.stringify(report, null, 2))
console.log('\n=== DONE ===')
console.log('Console errors:', consoleErrors.length)
