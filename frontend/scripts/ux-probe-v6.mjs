// v6 — 用 silk_road（数据最全的主题）验证 ConnectionsExplainedPanel 修复
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

// 找"丝绸之路"或 silk road 相关入口
const clicked = await page.evaluate(() => {
  const kw = ['丝绸之路', 'silk', 'Silk Road']
  const els = [...document.querySelectorAll('button,a,[role="button"],.topic-card,[class*="topic"]')]
  for (const el of els) {
    const t = (el.textContent || '').trim()
    if (t && kw.some((k) => t.toLowerCase().includes(k.toLowerCase())) && t.length < 40) {
      el.click()
      return t
    }
  }
  // fallback: 点第一个能点的主题卡
  for (const el of els) {
    if (el.textContent.trim().length > 2 && el.textContent.trim().length < 50) {
      el.click()
      return el.textContent.trim()
    }
  }
  return null
})
console.log('CLICKED:', clicked)
await page.waitForTimeout(5000)

// 等待 explore API 返回
await page.waitForResponse(
  (r) => r.url().includes(':8000') && r.url().includes('/explore/'),
  { timeout: 15000 }
).catch(() => console.log('explore API timeout'))

// 检查裸 DSL 残留 + 面板存在性
const scan = await page.evaluate(() => {
  const body = document.body.innerText
  const rawId = body.match(/[a-z]+-[a-z]+-[a-z]+/g) || []
  const rawRel = body.match(/\b(participated_in|located_in|influenced_by|part_of|caused|preceded_by)\b/g) || []
  const bracketRel = body.match(/\[[a-z_]+\s+(outgoing|incoming)\]/g) || []
  
  // 检查 ConnectionsExplainedPanel 特征文本
  const hasConnExplained = body.includes('可解释') || body.includes('Explainable') || body.includes('关联解释')
  const hasPathChain = body.includes('→') && !body.includes('菜单') // 排除导航箭头
  
  // 抓面板标题和前几行内容
  const connSection = (() => {
    const h3s = [...document.querySelectorAll('h3')]
    for (const h of h3s) {
      const t = h.textContent.trim()
      if (t.includes('可解释') || t.includes('Explainable') || t.includes('关联')) {
        let sib = h.nextElementSibling
        const lines = []
        for (let i = 0; i < 6 && sib; i++) {
          lines.push(sib.textContent?.trim() || '')
          sib = sib.nextElementSibling
        }
        return { title: t, content: lines.join('\n').slice(0, 500) }
      }
    }
    return null
  })()

  return {
    textLen: body.length,
    hasConnExplained,
    hasPathChain,
    rawIdSamples: [...new Set(rawId)].slice(0, 10),
    rawRelSamples: [...new Set(rawRel)].slice(0, 10),
    bracketRelSamples: [...new Set(bracketRel)].slice(0, 8),
    connSection,
  }
})

console.log('--- SCAN ---')
console.log(JSON.stringify(scan, null, 2))
console.log('--- API CALLS ---')
console.log([...new Set(apiCalls)].join('\n') || '(none)')
console.log('--- CONSOLE ERRORS ---')
console.log(errors.slice(0, 8).join('\n') || '(none)')

await page.screenshot({ path: `${OUT}/v6-silk-road.png`, fullPage: false })
await page.screenshot({ path: `${OUT}/v6-silk-road-full.png`, fullPage: true })
await browser.close()
