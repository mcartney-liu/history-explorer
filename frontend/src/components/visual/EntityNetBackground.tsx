// EntityNetBackground — 首页"了解"区块背后的实体点阵氛围层。
//
// 设计要点（与 PO 拍板一致）：
//  - 点 = 真实实体名（由父组件传入 names，取自平台已有真实数据，不造假）。
//  - 无连线：只保留浮动的点，背景更干净、不抢内容视线。
//  - 探照灯：鼠标靠近才点亮附近实体名，平时是暗色星点。
//  - 持续浮动：每个点平时缓慢自发浮动；被点亮时浮动更明显（平滑，非抖动）。
//  - 零依赖：原生 canvas，守住"不引新依赖"红线。
//  - 不挡操作：canvas 设 pointer-events:none，鼠标事件监听 window，卡片照常可点。
//  - 仅作视觉氛围，不参与任何业务逻辑 / 导航 / 数据读写。

import { useEffect, useRef } from 'react'

type EntityNetBackgroundProps = {
  /** 真实实体名列表（去重、限量由本组件内部处理） */
  names: string[]
  className?: string
}

// 确定性随机：保证每次布局稳定，不随渲染跳变
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function EntityNetBackground({ names, className }: EntityNetBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = 0
    let H = 0
    let DPR = 1

    const resize = () => {
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      W = rect.width
      H = rect.height
      if (W === 0 || H === 0) return
      canvas.width = Math.floor(W * DPR)
      canvas.height = Math.floor(H * DPR)
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }

    // 取真实实体名：去重、不限制数量（PO 要求铺满所有实体）。
    const list = Array.from(new Set(names.filter(Boolean)))
    const N = list.length

    // 归一化坐标：椭圆区域散布 + 轻微分离，覆盖整个 hero 区域。
    const rand = mulberry32(0x9e3779b9)
    const nx = new Float32Array(N)
    const ny = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      nx[i] = rand() * 2 - 1
      ny[i] = rand() * 2 - 1
    }
    const radiusX = 0.5
    const radiusY = 0.42
    const minSep2 = (0.045 / Math.sqrt(Math.max(N, 50))) ** 2
    for (let it = 0; it < 80; it++) {
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = (nx[i] - nx[j]) / radiusX
          const dy = (ny[i] - ny[j]) / radiusY
          const d2 = dx * dx + dy * dy + 1e-4
          if (d2 < minSep2) {
            const d = Math.sqrt(d2)
            const f = (minSep2 - d2) * 0.4
            nx[i] += ((dx / d) * f) * radiusX
            nx[j] -= ((dx / d) * f) * radiusX
            ny[i] += ((dy / d) * f) * radiusY
            ny[j] -= ((dy / d) * f) * radiusY
          }
        }
      }
    }
    const sx = (i: number) => W * 0.5 + nx[i] * W * 0.48
    const sy = (i: number) => H * 0.5 + ny[i] * H * 0.42

    // 自发浮动参数
    const IDLE_AMP = 3.5 // 平时自发浮动幅度（px），缓慢、小到不影响"数据稳定"
    const HOVER_FLOAT_AMP = 7.0 // 被探照灯扫到时浮动更明显（px，按亮度缩放，平滑不抖动）
    const phaseX = new Float32Array(N)
    const phaseY = new Float32Array(N)
    const freqX = new Float32Array(N)
    const freqY = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      phaseX[i] = rand() * Math.PI * 2
      phaseY[i] = rand() * Math.PI * 2
      freqX[i] = 0.25 + rand() * 0.5
      freqY[i] = 0.25 + rand() * 0.5
    }
    const dispX = new Float32Array(N)
    const dispY = new Float32Array(N)
    const illum = new Float32Array(N)
    let tNow = 0

    // 鼠标（监听 window：canvas 设 pointer-events:none，卡片保持可点）
    let mx = -9999
    let my = -9999
    let active = false
    const R = 170
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mx = e.clientX - rect.left
      my = e.clientY - rect.top
      active = mx >= 0 && my >= 0 && mx <= rect.width && my <= rect.height
    }
    const onLeave = () => {
      active = false
      mx = -9999
      my = -9999
    }
    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)

    let raf = 0
    const frame = () => {
      tNow += 1 / 60
      ctx.clearRect(0, 0, W, H)
      // 1) 算每个点当前显示位置：基点 + 自发浮动 + 悬停放大浮动
      for (let i = 0; i < N; i++) {
        let target = 0
        const bx = sx(i)
        const by = sy(i)
        if (active) {
          const dx = mx - bx
          const dy = my - by
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < R) target = 1 - d / R
        }
        illum[i] += (target - illum[i]) * 0.15
        const e = illum[i]
        const idleX = Math.sin(tNow * freqX[i] + phaseX[i]) * IDLE_AMP
        const idleY = Math.cos(tNow * freqY[i] + phaseY[i]) * IDLE_AMP
        // 悬停浮动：被点亮时叠加更大平滑浮动，越亮越明显（保持"浮动"观感，不抖不颤）
        const hovX = Math.sin(tNow * (freqX[i] + 0.7) + phaseX[i] * 1.7) * HOVER_FLOAT_AMP * e
        const hovY = Math.cos(tNow * (freqY[i] + 0.7) + phaseY[i] * 1.7) * HOVER_FLOAT_AMP * e
        dispX[i] = bx + idleX + hovX
        dispY[i] = by + idleY + hovY
      }
      // 2) 画点（无连线）
      for (let i = 0; i < N; i++) {
        const x = dispX[i]
        const y = dispY[i]
        const e = illum[i]
        const rad = 2.2 + e * 2.6
        // 暗金 -> 亮金（平时暗金仍清晰可见，鼠标靠近点亮为亮金）
        const rr = Math.round(195 + (239 - 195) * e)
        const gg = Math.round(170 + (159 - 170) * e)
        const bb = Math.round(120 + (39 - 120) * e)
        ctx.globalAlpha = 0.55 + e * 0.45
        ctx.fillStyle = `rgb(${rr},${gg},${bb})`
        ctx.beginPath()
        ctx.arc(x, y, rad, 0, Math.PI * 2)
        ctx.fill()
        // 名字：点亮足够才显示（探照灯）。textBaseline='middle' 保证中文不扁。
        if (e > 0.22) {
          ctx.globalAlpha = (e - 0.22) / 0.78
          ctx.fillStyle = '#E8E6E0'
          ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(list[i], x, y + rad + 10)
        }
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }

    resize()
    raf = requestAnimationFrame(frame)
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', resize)
    }
  }, [names])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
