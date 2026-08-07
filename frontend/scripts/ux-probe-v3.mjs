// UX probe v3 — 直接进探索包页面，复现 P0-1 裸 DSL 路径
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

// ---- 直接导航到丝绸之路探索包 ----
await page.goto(`${BASE}#/package/silk-road-exploration`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(4000)
console.log('title:', await page.title())
await shot('v3-silk-road-package')

// ---- 抓文本检测裸 id / 裸关系 ----
const text = await page.evaluate(() => document.body.innerText)
fs.writeFileSync(path.join(OUT, 'v3-package-text.txt'), text)

const patterns = [
  { name: 'global_id chain (a→b)', regex: /[a-z]+-[a-z_]+→[a-z]+-[a-z_]+/g },
  { name: 'raw relationship enum', regex: /\b(participated_in|caused|influenced|located_at|related_to|before|after|contemporary_with|part_of|ruled|traded_with|invented|discovered|practiced|spoke|inherited|conquered|spread)\b/g },
  { name: 'local-id-like', regex: /\b(person-|event-|place-|concept-|artifact-)[a-z_]+\b/g },
  { name: 'bracketed rel enum', regex: /\[(participated_in|caused|influenced|located_at|related_to|before|after|contemporary_with|part_of|ruled|traded_with|invented|discovered|practiced|spoke|inherited|conquered|spread)\s+(incoming|outgoing)\]/g },
]
for (const p of patterns) {
  const matches = text.match(p.regex)
  console.log(`  ${p.name}: ${matches ? matches.length : 0} hits`)
  if (matches && matches.length > 0) matches.slice(0, 10).forEach(m => console.log(`    → ${m}`))
}

// ---- 点击一个实体进入详情（触发 connections_explained 渲染）----
console.log('\n=== CLICK FIRST ENTITY IN PACKAGE ===')
const clickResult = await page.evaluate(() => {
  // 找 ep-node 或任何可点击实体
  const nodes = [...document.querySelectorAll('.ep-node, button.ep-node, [class*="ep-node"]')]
  if (nodes.length > 0) { nodes[0].click(); return `clicked ep-node: ${nodes[0].textContent.trim()}` }
  // fallback: 任何看起来像实体的按钮
  const btns = [...document.querySelectorAll('button')]
  const entity = btns.find(b => {
    const t = b.textContent.trim()
    return t.length > 2 && t.length < 40 && !t.includes('搜索') && !/^(了解|研究|扩展|开始|列表|图谱)$/.test(t)
  })
  if (entity) { entity.click(); return `clicked button: ${entity.textContent.trim()}` }
  return 'no entity found'
})
console.log(clickResult)
await page.waitForTimeout(3000)
await shot('v3-after-entity-click')

// ---- 再扫一次文本 ----
const text2 = await page.evaluate(() => document.body.innerText)
fs.writeFileSync(path.join(OUT, 'v3-after-click-text.txt'), text2)
for (const p of patterns) {
  const matches = text2.match(p.regex)
  if (matches && matches.length > 0) {
    console.log(`  AFTER CLICK ${p.name}: ${matches.length} hits`)
    matches.slice(0, 10).forEach(m => console.log(`    → ${m}`))
  }
}

// ---- 检查 ConnectionsExplainedPanel 是否渲染了 path chain ----
console.log('\n=== CONNECTIONS EXPLAINED PANEL CHECK ===')
const panelInfo = await page.evaluate(() => {
  const panels = [...document.querySelectorAll('.ce-list, .ep-list, [class*="connections"]')]
  return panels.map(p => ({
    cls: p.className.slice(0, 80),
    childCount: p.children.length,
    textPreview: p.innerText.slice(0, 200),
  }))
})
console.log(JSON.stringify(panelInfo, null, 2))

// 如果有 panel，截图特写
if (panelInfo.length > 0) {
  for (let i = 0; i < Math.min(panelInfo.length, 3); i++) {
    const el = await page.$(`.ce-list, .ep-list, [class*="connections"]`)
    if (el) await el.screenshot({ path: path.join(OUT, `v3-panel-${i}.png`) })
  }
}

await browser.close()
fs.writeFileSync(path.join(OUT, 'v3-diagnostics.json'), JSON.stringify({ consoleErrors }, null, 2))
console.log('\n=== DONE ===')
console.log('Console errors:', consoleErrors.length)
if (consoleErrors.length) consoleErrors.forEach(e => console.log('  ERR:', e))
