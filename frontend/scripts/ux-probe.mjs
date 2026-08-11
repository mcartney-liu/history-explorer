// UX probe — 只读真机复现脚本（不改产品代码，不进版本库产物）
// 用途：打开本地前端，走一遍真实探索链路，截图 + 抓取页面文本，
// 用来确证「裸 DSL 路径暴露」「搜索区遮挡」两个 P0 是否真实存在。
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.PROBE_BASE || 'http://127.0.0.1:5173'
const OUT = path.resolve(process.cwd(), '.ux-probe')
fs.mkdirSync(OUT, { recursive: true })

const consoleErrors = []
const failedRequests = []

function log(...a) { console.log(...a) }

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300))
})
page.on('requestfailed', (r) => {
  failedRequests.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText}`)
})

async function shot(name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false })
  log(`  [shot] ${name}.png`)
}

// ---- 1. 首页 ----
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(3000)
log('\n=== 1. LANDING ===')
log('title:', await page.title())
await shot('01-landing')

// 抓首屏可见文本，检测裸 id / 裸关系枚举
const landingText = await page.evaluate(() => document.body.innerText)
fs.writeFileSync(path.join(OUT, '01-landing.txt'), landingText)
log('text length:', landingText.length)

// ---- 2. 点进第一个可探索入口 ----
log('\n=== 2. ENTER EXPLORATION ===')
const candidates = await page.evaluate(() => {
  const out = []
  document.querySelectorAll('button, a, [role="button"]').forEach((el, i) => {
    const t = (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60)
    if (t) out.push({ i, t, cls: el.className?.toString().slice(0, 80) || '' })
  })
  return out.slice(0, 40)
})
fs.writeFileSync(path.join(OUT, '02-clickables.json'), JSON.stringify(candidates, null, 2))
log('clickable count:', candidates.length)
candidates.slice(0, 15).forEach((c) => log(`  [${c.i}] ${c.t}  (${c.cls})`))

await browser.close()

// ---- report ----
const report = { consoleErrors, failedRequests }
fs.writeFileSync(path.join(OUT, 'diagnostics.json'), JSON.stringify(report, null, 2))
log('\n=== DIAGNOSTICS ===')
log('console errors:', consoleErrors.length)
consoleErrors.slice(0, 10).forEach((e) => log('  ERR:', e))
log('failed requests:', failedRequests.length)
failedRequests.slice(0, 10).forEach((e) => log('  REQ:', e))
