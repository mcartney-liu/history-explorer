// v7 — 精确进入 silk_road topic 视图验证 ConnectionsExplainedPanel
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
await page.waitForTimeout(3000)

// 列出所有可点击的文本
const allClickable = await page.evaluate(() => {
  return [...document.querySelectorAll('button,a,[role="button"],[tabindex]')]
    .map(el => ({ tag: el.tagName, text: (el.textContent||'').trim().slice(0,60), cls: el.className.slice(0,40) }))
    .filter(x => x.text.length > 1 && x.text.length < 60)
})
console.log('=== CLICKABLE ELEMENTS ===')
allClickable.forEach((x,i) => console.log(`${i}: [${x.tag}] ${x.text} (${x.cls})`))

// 找 silk_road 或丝绸之路
const clicked = await page.evaluate(() => {
  const els = [...document.querySelectorAll('*')]
  for (const el of els) {
    const t = (el.textContent || '').trim()
    if ((t.includes('Silk') || t.includes('丝路') || t === '丝绸之路') 
        && el.children.length <= 3 && t.length < 50) {
      el.click()
      return t
    }
  }
  // fallback: 用 React 内部状态设置 topic（如果 App 暴露了的话）
  return 'NOT_FOUND'
})
console.log('\nCLICKED:', clicked)
await page.waitForTimeout(5000)

// 尝试等待 explore API
try {
  await page.waitForResponse(
    (r) => r.url().includes('/explore/') && !r.url().includes('locations'),
    { timeout: 10000 }
  )
  console.log('explore API received')
} catch(e) {
  console.log('explore API not caught, continuing...')
}
await page.waitForTimeout(2000)

const scan = await page.evaluate(() => {
  const body = document.body.innerText
  const rawId = body.match(/[a-z]+-[a-z]+-[a-z]+/g) || []
  const rawRel = body.match(/\b(participated_in|located_in|influenced_by|part_of|caused|preceded_by)\b/g) || []
  const bracketRel = body.match(/\[[a-z_]+\s+(outgoing|incoming)\]/g) || []
  
  // 抓所有 h3 标题
  const headings = [...document.querySelectorAll('h2,h3')].map(h => h.textContent.trim())
  
  // ConnectionsExplainedPanel 内容
  const connSections = []
  for (const h of document.querySelectorAll('h3')) {
    const t = h.textContent.trim()
    if (t.includes('可解释') || t.includes('Explainable') || t.includes('关联解释')) {
      let sib = h.nextElementSibling
      const lines = []
      for (let i = 0; i < 10 && sib; i++) {
        lines.push(sib.textContent?.trim() || '')
        sib = sib.nextElementSibling
      }
      connSections.push({ title: t, content: lines.join('|').slice(0, 800) })
    }
  }

  return {
    textLen: body.length,
    headings,
    rawIdSamples: [...new Set(rawId)].slice(0, 10),
    rawRelSamples: [...new Set(rawRel)].slice(0, 10),
    bracketRelSamples: [...new Set(bracketRel)].slice(0, 8),
    connSections,
  }
})

console.log('\n--- SCAN ---')
console.log(JSON.stringify(scan, null, 2))
console.log('\n--- API CALLS ---')
console.log([...new Set(apiCalls)].join('\n') || '(none)')
console.log('\n--- CONSOLE ERRORS ---')
console.log(errors.slice(0, 8).join('\n') || '(none)')

await page.screenshot({ path: `${OUT}/v7-silk-road.png`, fullPage: false })
await page.screenshot({ path: `${OUT}/v7-silk-road-full.png`, fullPage: true })
await browser.close()
