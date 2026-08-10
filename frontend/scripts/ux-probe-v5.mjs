// v5 — 验证 topic 探索视图（RelationshipContext / ConnectionsExplainedPanel 所在路径）
// 只读探针：点主题卡进入 explore 视图，抓 API 调用 + 裸 DSL 残留 + 截图
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://127.0.0.1:5173/'
const OUT = '.ux-probe'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const apiCalls = []
page.on('request', (r) => {
  const u = r.url()
  if (u.includes(':8000')) apiCalls.push(u.replace('http://127.0.0.1:8000', ''))
})
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(2500)

// 找主题入口：优先带 topic 语义的按钮/卡片
const clicked = await page.evaluate(() => {
  const kw = ['丝绸之路', 'silk', '罗马', '古印度', '希腊']
  const els = [...document.querySelectorAll('button,a,[role="button"],.topic-card,[class*="topic"]')]
  for (const el of els) {
    const t = (el.textContent || '').trim()
    if (t && kw.some((k) => t.toLowerCase().includes(k.toLowerCase())) && t.length < 40) {
      el.click()
      return t
    }
  }
  return null
})
console.log('CLICKED_TOPIC:', clicked)
await page.waitForTimeout(4000)

const scan = await page.evaluate(() => {
  const body = document.body.innerText
  // 裸 DSL 特征：小写+连字符 id、下划线关系枚举、[rel direction] 方括号
  const rawId = body.match(/[a-z]+-[a-z]+-[a-z]+/g) || []
  const rawRel = body.match(/\b(participated_in|located_in|influenced_by|part_of|caused|preceded_by)\b/g) || []
  const bracketRel = body.match(/\[[a-z_]+\s+(outgoing|incoming)\]/g) || []
  const hasPanel = body.includes('可解释') || body.includes('Explainable') || body.includes('关联解释')
  return {
    textLen: body.length,
    hasConnPanel: hasPanel,
    rawIdSamples: [...new Set(rawId)].slice(0, 8),
    rawRelSamples: [...new Set(rawRel)].slice(0, 8),
    bracketRelSamples: [...new Set(bracketRel)].slice(0, 5),
  }
})

console.log('--- SCAN ---')
console.log(JSON.stringify(scan, null, 2))
console.log('--- API CALLS ---')
console.log([...new Set(apiCalls)].join('\n') || '(none)')
console.log('--- CONSOLE ERRORS ---')
console.log(errors.slice(0, 5).join('\n') || '(none)')

await page.screenshot({ path: `${OUT}/v5-topic-view.png`, fullPage: false })
await page.screenshot({ path: `${OUT}/v5-topic-full.png`, fullPage: true })
await browser.close()
