@echo off
setlocal
set "ROOT=%~dp0"
for %%I in ("%ROOT%..") do set "PARENT=%%~fI"
set "LEGACY=%PARENT%\he-legacy"

echo ============================================================
echo  History Explorer - A/B 对比启动器 (方案A: worktree 共存)
echo  老版本 (he-legacy) : 前端 http://localhost:5173  后端 :8000
echo  新版本 (current)   : 前端 http://localhost:5174  后端 :8001
echo  两个版本共享同一份基线代码，互不影响，可并排对比。
echo ============================================================
echo.

REM ---- 老版本后端依赖 ----
if not exist "%LEGACY%\backend\.venv" (
  echo [legacy-backend] 首次安装依赖...
  pushd "%LEGACY%\backend"
  python -m venv .venv
  call .venv\Scripts\activate.bat
  pip install -r requirements.txt
  popd
)
REM ---- 老版本前端依赖 ----
if not exist "%LEGACY%\frontend\node_modules" (
  echo [legacy-frontend] 首次安装依赖...
  pushd "%LEGACY%\frontend"
  call npm install
  popd
)
REM ---- 新版本后端依赖 ----
if not exist "%ROOT%backend\.venv" (
  echo [new-backend] 首次安装依赖...
  pushd "%ROOT%backend"
  python -m venv .venv
  call .venv\Scripts\activate.bat
  pip install -r requirements.txt
  popd
)
REM ---- 新版本前端依赖 ----
if not exist "%ROOT%frontend\node_modules" (
  echo [new-frontend] 首次安装依赖...
  pushd "%ROOT%frontend"
  call npm install
  popd
)

echo 依赖就绪，启动双栈...
echo.

start "HE-legacy-backend" /D "%LEGACY%\backend" cmd /k "call .venv\Scripts\activate.bat && uvicorn app.main:app --port 8000"
start "HE-legacy-frontend" /D "%LEGACY%\frontend" cmd /k "npx vite --port 5173 --strictPort"
start "HE-new-backend" /D "%ROOT%backend" cmd /k "call .venv\Scripts\activate.bat && set CORS_ORIGINS=http://localhost:5174 && uvicorn app.main:app --port 8001"
start "HE-new-frontend" /D "%ROOT%frontend" cmd /k "set VITE_API_BASE=http://localhost:8001 && npx vite --port 5174 --strictPort"

echo 启动命令已发出。请稍候数秒待服务就绪，然后打开浏览器：
echo   老版本: http://localhost:5173
echo   新版本: http://localhost:5174
echo.
echo 停止: 关闭对应的 4 个命令行窗口即可。
echo.
pause
