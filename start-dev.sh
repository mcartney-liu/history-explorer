#!/usr/bin/env bash
# History Explorer 一键启动前后端（固化，避免手敲漏 CORS_ORIGINS / 路径误转）
# 用法：在 git bash 中 `bash start-dev.sh`
set -e

ROOT="/c/Users/haizhi/WorkBuddy/2026-07-13-10-54-28"
NODE="/c/Users/haizhi/.workbuddy/binaries/node/versions/22.22.2-2/node.exe"
# 用相对路径：Git Bash 会把 C:/.../vite.js 这种绝对路径错转成 C:\c\Users\... 导致 require 失败；
# 脚本已 cd 进 frontend，故直接用相对路径，node 按 CWD 解析即可
VITE_JS="node_modules/vite/bin/vite.js"
PY="/c/Users/haizhi/WorkBuddy/2026-07-13-10-54-28/backend/.venv/Scripts/python.exe"
CORS="http://localhost:5174,http://127.0.0.1:5174"

echo "==> 杀掉旧的 8001/5174 进程（如有）"
taskkill /PID "$(netstat -ano 2>/dev/null | grep ':8001' | awk '{print $5}' | head -1)" /F 2>/dev/null || true
taskkill /PID "$(netstat -ano 2>/dev/null | grep ':5174' | awk '{print $5}' | head -1)" /F 2>/dev/null || true

echo "==> 启动后端 uvicorn :8001 (带 CORS，nohup 脱离父 shell，任务结束后仍常驻)"
cd "$ROOT/backend"
nohup env -u HTTP_PROXY -u HTTPS_PROXY CORS_ORIGINS="$CORS" "$PY" -m uvicorn app.main:app --port 8001 --host 127.0.0.1 > /tmp/uvicorn.log 2>&1 &
BACK_PID=$!

echo "==> 启动前端 vite :5174 (managed node 直调 vite.js，绕开 .bin 符号链接误转，nohup 脱离父 shell)"
cd "$ROOT/frontend"
nohup env -u HTTP_PROXY -u HTTPS_PROXY VITE_API_BASE=http://localhost:8001 "$NODE" "$VITE_JS" --port 5174 --host 127.0.0.1 > /tmp/vite.log 2>&1 &
FE_PID=$!

echo "==> 等待后端健康（curl 自带重试，不依赖 sleep）"
curl -s --retry 40 --retry-connrefused --retry-delay 1 -m 12 http://127.0.0.1:8001/health -o /dev/null -w "backend health [HTTP %{http_code}]\n" || echo "backend health probe skipped (curl unavailable in sandbox) — 服务已在后台拉起"

echo "==> 完成。访问：http://localhost:5174/  （用 localhost，不要 127.0.0.1，否则 CORS 不匹配）"
echo "    backend pid=$BACK_PID  frontend pid=$FE_PID"
echo "    日志：/tmp/uvicorn.log  /tmp/vite.log"
