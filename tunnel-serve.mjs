// 本地对外隧道服务：托管 frontend/dist 静态包 + 把 /api/* 代理到后端 8002。
// 不代理 /admin（后台管理页仅本机 localhost:8002 可访问，见 backend/app/feedback.py）。
// 用法：node tunnel-serve.mjs   （监听 [::]:4173）
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'frontend', 'dist')
const UPSTREAM = 'http://127.0.0.1:8002'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = decodeURIComponent(url.pathname)

  // 安全：后台管理页绝不经隧道暴露
  if (pathname.startsWith('/admin')) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Forbidden')
    return
  }

  // 代理 /api/* 到后端 8002
  if (pathname.startsWith('/api/')) {
    const options = {
      method: req.method,
      headers: { ...req.headers, host: '127.0.0.1:8002' },
    }
    const proxyReq = http.request(
      UPSTREAM + pathname + url.search,
      options,
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers)
        proxyRes.pipe(res)
      }
    )
    proxyReq.on('error', (e) => {
      res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: 'backend unreachable', detail: e.message }))
    })
    req.pipe(proxyReq)
    return
  }

  // 静态文件
  let filePath = path.join(DIST, pathname)
  if (pathname === '/' || pathname === '') filePath = path.join(DIST, 'index.html')
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }
  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) {
      const ext = path.extname(filePath).toLowerCase()
      res.writeHead(200, {
        'content-type': MIME[ext] || 'application/octet-stream',
        'cache-control': 'no-cache',
      })
      fs.createReadStream(filePath).pipe(res)
      return
    }
    // SPA 兜底：未知路由返回 index.html
    fs.readFile(path.join(DIST, 'index.html'), (e2, data) => {
      if (e2) {
        res.writeHead(404)
        res.end('Not found')
        return
      }
      res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-cache' })
      res.end(data)
    })
  })
})

server.listen(4173, '::', () => {
  console.log(`tunnel-serve listening on [::]:4173  (dist + /api->8002, /admin blocked)`)
})
