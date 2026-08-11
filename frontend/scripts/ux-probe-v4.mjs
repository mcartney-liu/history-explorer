// UX probe v4 — 点"开始探索"进入画布，复现 P0-1 裸路径 + P0-2 搜索遮挡
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

// ---- 1. 进探索包 ----
await page.goto(`${BASE}#/package/silk-road-exploration`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(3000)
await shot('v4-01-package-home')

// ---- 2. 点"开始探索" ----
console.log('\n=== CLICK 开始探索 ===')
const startResult = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const start = btns.find(b => b.textContent.includes('开始探索'))
  if (start) { start.click(); return `clicked: ${start.textContent.trim()}` }
  // fallback
  const all = [...document.querySelectorAll('[class*="start"], [class*="explore"]')]
  return `not found. buttons: ${btns.map(b => b.textContent.trim().slice(0, 30)).join(' | ')}`
})
console.log(startResult)
await page.waitForTimeout(4000)
await shot('v4-02-canvas')

// ---- 3. 全页文本扫描 ----
const text = await page.evaluate(() => document.body.innerText)
fs.writeFileSync(path.join(OUT, 'v4-canvas-text.txt'), text)

const patterns = [
  { name: 'global_id chain (a→b)', regex: /[a-z]+-[a-z_]+→[a-z]+-[a-z_]+/g },
  { name: 'raw relationship enum', regex: /\b(participated_in|caused|influenced|located_at|related_to|before|after|contemporary_with|part_of|ruled|traded_with|invented|discovered|practiced|spoke|inherited|conquered|spread)\b/g },
  { name: 'local-id-like', regex: /\b(person-|event-|place-|concept-|artifact-)[a-z_]+\b/g },
  { name: 'bracketed rel enum', regex: /\[(participated_in|caused|influenced|located_at|related_to|before|after|contemporary_with|part_of|ruled|traded_with|invented|discovered|practiced|spoke|inherited|conquered|spread)\s+(incoming|outgoing)\]/g },
]
console.log('\n=== TEXT SCAN ===')
for (const p of patterns) {
  const matches = text.match(p.regex)
  console.log(`  ${p.name}: ${matches ? matches.length : 0} hits`)
  if (matches && matches.length > 0) matches.slice(0, 10).forEach(m => console.log(`    → ${m}`))
}

// ---- 4. 点击探索向导中的第一个建议（进入多跳链路）----
console.log('\n=== CLICK EXPLORATION SUGGESTION ===')
const sugResult = await page.evaluate(() => {
  // 找探索向导里的可点击项
  const items = [...document.querySelectorAll('button, a, [role="button"], [class*="suggestion"], [class*="next-step"], [class*="guide"]')]
  // 过滤掉导航/搜索类
  const candidates = items.filter(el => {
    const t = el.textContent.trim()
    return t.length > 4 && t.length < 60 &&
           !t.includes('搜索') && !t.includes('了解') && !t.includes('研究') &&
           !t.includes('扩展') && !t.includes('返回') && !t.includes('Home')
  })
  if (candidates.length > 0) {
    candidates[0].click()
    return `clicked: ${candidates[0].textContent.trim().slice(0, 50)} (${candidates[0].className.slice(0, 60)})`
  }
  return `no suggestion found. items: ${items.slice(0, 10).map(i => i.textContent.trim().slice(0, 30)).join(' | ')}`
})
console.log(sugResult)
await page.waitForTimeout(4000)
await shot('v4-03-after-suggestion')

// ---- 5. 再扫文本 ----
const text2 = await page.evaluate(() => document.body.innerText)
fs.writeFileSync(path.join(OUT, 'v4-after-sug-text.txt'), text2)
console.log('\n=== AFTER SUGGESTION SCAN ===')
for (const p of patterns) {
  const matches = text2.match(p.regex)
  if (matches && matches.length > 0) {
    console.log(`  ${p.name}: ${matches.length} hits`)
    matches.slice(0, 10).forEach(m => console.log(`    → ${m}`))
  }
}

// ---- 6. 检查搜索区位置（P0-2 遮挡）----
console.log('\n=== SEARCH AREA POSITION (P0-2) ===')
const searchInfo = await page.evaluate(() => {
  const candidates = [
    document.querySelector('.searchSlot'),
    document.querySelector('[class*="search-slot"]'),
    document.querySelector('[class*="search"]'),
    ...document.querySelectorAll('[class*="SearchBox"], [class*="EntitySearch"]'),
  ].filter(Boolean)
  return candidates.map(el => {
    const r = el.getBoundingClientRect()
    return {
      cls: el.className.slice(0, 100),
      top: Math.round(r.top), left: Math.round(r.left),
      width: Math.round(r.width), height: Math.round(r.height),
      visible: r.top >= 0 && r.top < 900,
      text: el.innerText.slice(0, 80),
    }
  })
})
console.log(JSON.stringify(searchInfo, null, 2))

// 截取搜索区特写
for (let i = 0; i < searchInfo.length; i++) {
  const s = searchInfo[i]
  if (s.visible || s.height > 0) {
    try {
      const els = await page.$$('[class*="search"]')
      if (els[i]) await els[i].screenshot({ path: path.join(OUT, `v4-search-${i}.png`) })
    } catch(e) { /* ignore */ }
  }
}

await browser.close()
fs.writeFileSync(path.join(OUT, 'v4-report.json'), JSON.stringify({ consoleErrors, searchInfo }, null, 2))
console.log('\n=== DONE ===')
console.log('Console errors:', consoleErrors.length)
