// ux-probe-v10.mjs — Measure layout overlap on the Explore view (P0-2 search occlusion check)
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE = 'http://127.0.0.1:5173'
const OUT = path.join(__dirname, '..', '.ux-probe')

async function main() {
  console.log('[v10] Launching browser...')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  console.log('[v10] Opening explore view (root)...')
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2500)

  // Collect geometry + positioning for every element whose class mentions
  // search / explore / nav / canvas / hero / app / shell / results.
  const report = await page.evaluate(() => {
    const sel = '*'
    const all = Array.from(document.querySelectorAll(sel))
    const wanted = (cls) =>
      /search|explore|nav|canvas|hero|app|shell|results|topic-input|explore-button|entity-search/i.test(cls || '')
    const out = []
    for (const el of all) {
      const cls = (el.className && el.className.baseVal !== undefined)
        ? el.className.baseVal
        : (typeof el.className === 'string' ? el.className : '')
      if (!wanted(cls)) continue
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      // only keep elements with non-zero size and a meaningful class
      if (r.width === 0 && r.height === 0) continue
      const classes = cls.split(/\s+/).filter(Boolean).slice(0, 4)
      if (classes.length === 0) continue
      out.push({
        cls: classes.join('.'),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        left: Math.round(r.left),
        right: Math.round(r.right),
        h: Math.round(r.height),
        pos: cs.position,
        z: cs.zIndex,
        sticky: cs.position,
        fixedParent: (function findFixed(n) {
          let p = n.parentElement
          while (p) {
            const pcs = getComputedStyle(p)
            if (pcs.position === 'fixed' || pcs.position === 'sticky') return p.className || p.tagName
            p = p.parentElement
          }
          return null
        })(el),
      })
    }
    return out
  })

  // Definitive scan: ANY element with position fixed/sticky (regardless of class)
  const fixedAll = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .filter((el) => {
        const cs = getComputedStyle(el)
        return cs.position === 'fixed' || cs.position === 'sticky'
      })
      .map((el) => {
        const r = el.getBoundingClientRect()
        const cls = (typeof el.className === 'string' ? el.className : '').split(/\s+/).filter(Boolean).slice(0, 3).join('.')
        return { cls: cls || el.tagName, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), z: getComputedStyle(el).zIndex }
      })
  })
  console.log('\n[v10] ★ GLOBAL fixed/sticky scan (any class):')
  if (fixedAll.length === 0) {
    console.log('  ✅ NONE — no fixed/sticky element on this page at all.')
  } else {
    for (const f of fixedAll) console.log(`  ⚠️  ${f.cls} top=${f.top} bottom=${f.bottom} left=${f.left} right=${f.right} z=${f.z}`)
  }

  console.log('\n[v10] Element geometry (search/explore/nav/canvas/shell):')
  // sort by top then left for readability
  report.sort((a, b) => a.top - b.top || a.left - b.left)
  for (const e of report) {
    const flag = []
    if (e.pos === 'fixed' || e.pos === 'sticky') flag.push('POS=' + e.pos)
    if (e.z && e.z !== 'auto') flag.push('z=' + e.z)
    if (e.fixedParent) flag.push('inFixed:' + e.fixedParent)
    console.log(
      `  ${e.cls.padEnd(42)} top=${String(e.top).padStart(4)} bottom=${String(e.bottom).padStart(4)} h=${String(e.h).padStart(4)} ${flag.join(' ')}`
    )
  }

  // Specifically: is there any element whose top is < 0 OR overlapping the search box region?
  const searchEls = report.filter((e) => /search|topic-input|explore-button|entity-search/i.test(e.cls))
  const canvasEls = report.filter((e) => /canvas|explore/i.test(e.cls))
  console.log('\n[v10] Search-area elements:')
  for (const e of searchEls) console.log(`  ${e.cls} top=${e.top} bottom=${e.bottom} pos=${e.pos}`)
  console.log('\n[v10] Canvas/main elements:')
  for (const e of canvasEls.slice(0, 8)) console.log(`  ${e.cls} top=${e.top} bottom=${e.bottom} pos=${e.pos}`)

  // Overlap test: does any fixed/sticky element sit ON TOP of a content element?
  const overlappers = report.filter((e) => e.pos === 'fixed' || e.pos === 'sticky')
  if (overlappers.length) {
    console.log('\n[v10] ⚠️  FIXED/STICKY elements present (potential occluders):')
    for (const o of overlappers) {
      console.log(`  ${o.cls} top=${o.top} bottom=${o.bottom} z=${o.z} h=${o.h}`)
    }
  } else {
    console.log('\n[v10] ✅ No fixed/sticky search-area elements on this view.')
  }

  await page.screenshot({ path: `${OUT}/v10-explore-view.png`, fullPage: false })
  console.log('\n[v10] Screenshot → v10-explore-view.png')

  // Second pass: package view (where the user's screenshots were)
  console.log('\n[v10] Opening package view #/package/silk-road-exploration ...')
  await page.goto(`${BASE}/#/package/silk-road-exploration`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2500)
  const fixedPkg = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .filter((el) => { const cs = getComputedStyle(el); return cs.position === 'fixed' || cs.position === 'sticky' })
      .map((el) => {
        const r = el.getBoundingClientRect()
        const cls = (typeof el.className === 'string' ? el.className : '').split(/\s+/).filter(Boolean).slice(0, 3).join('.')
        return { cls: cls || el.tagName, top: Math.round(r.top), bottom: Math.round(r.bottom), z: getComputedStyle(el).zIndex }
      })
  })
  console.log('[v10] ★ GLOBAL fixed/sticky scan on PACKAGE view:')
  if (fixedPkg.length === 0) console.log('  ✅ NONE — no fixed/sticky element on package view.')
  else for (const f of fixedPkg) console.log(`  ⚠️  ${f.cls} top=${f.top} bottom=${f.bottom} z=${f.z}`)
  await page.screenshot({ path: `${OUT}/v10-package-view.png`, fullPage: false })
  console.log('[v10] Screenshot → v10-package-view.png')

  await browser.close()
  console.log('[v10] Done.')
}

main().catch((e) => { console.error(e); process.exit(1) })
