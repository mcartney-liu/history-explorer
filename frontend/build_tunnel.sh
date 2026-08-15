#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# 隧道部署专用构建脚本（一键，避免再次把 localhost 编进线上包）
#
# 为什么必须这样：frontend/.env 里写的是 VITE_API_BASE=http://localhost:8001
# （本地开发 / 管理后台用的地址）。如果直接 `vite build` 而不覆盖这个变量，
# 8001 会被编译进线上包；朋友/你用公网隧道域名打开时，浏览器会把所有
# 后端请求（/api、/explore、/topics、大家的声音……）打向「访客本机的 8001
# 端口」，而那里没服务 → 表现为页面能开、但一切后端交互无法加载。
#
# 正确做法：用根相对路径 `/`（serve.js 已把 /api、/explore、/topics、/entity
# 等相对路径反代到后端 8002，所以前端只需相对当前域名请求即可）。
# `${API_BASE}` 编译后为空串，fetch(`${API_BASE}/api/...`) 即 `/api/...`。
# 注意：不能用 `./`，否则页面在 /discover 等子路径下会变成 /discover/api/...
#       也不能留空 ''（会 fallback 到 localhost:8000）。必须用 `/`。
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

# 优先用托管的 node，找不到再退系统 node
NODE_BIN="$(command -v node || true)"
if [ -x "/c/Users/haizhi/.workbuddy/binaries/node/versions/22.22.2/node.exe" ]; then
  NODE_BIN="/c/Users/haizhi/.workbuddy/binaries/node/versions/22.22.2/node.exe"
fi

echo "[build_tunnel] VITE_API_BASE=/ (相对路径) -> vite build --outDir dist"
VITE_API_BASE=/ "$NODE_BIN" node_modules/vite/bin/vite.js build --outDir dist
echo "[build_tunnel] done. 刷新隧道页面(Ctrl+Shift+R)即可生效。"
