// 实体页宇宙背景：多层深空、星场、星云、行星、未开放雾区
// 纯 2D canvas，零新依赖；静态层预渲染，动画帧只重绘动态星点，2500 颗星兼顾效果与性能。

export interface CosmosMount {
  canvas: HTMLCanvasElement;
  resize(): void;
  dispose(): void;
}

interface Star {
  x: number; // 0..1 normalized
  y: number;
  z: number; // depth 0..1
  size: number;
  base: number;
  phase: number;
  speed: number;
  layer: 'noise' | 'mid' | 'bright';
}

interface Nebula {
  x: number;
  y: number;
  r: number;
  color: string;
  alpha: number;
}

interface Planet {
  x: number;
  y: number;
  r: number;
  kind: 'gas-ring' | 'ice' | 'rocky' | 'terrestrial' | 'gold-ring';
  angle: number;
  spin: number;
}

interface Unopened {
  x: number;
  y: number;
  r: number;
  color: string;
  label: string;
}

function random(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// 缓存一个通用光晕精灵，避免每帧 createRadialGradient
function makeGlowSprite(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  if (!g) return cv;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(238,242,255,0.35)');
  grd.addColorStop(0.45, 'rgba(238,242,255,0.08)');
  grd.addColorStop(1, 'rgba(238,242,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return cv;
}
const GLOW_SPRITE = makeGlowSprite();

export function mountEntityCosmos(container: HTMLElement): CosmosMount {
  const canvas = document.createElement('canvas');
  canvas.className = 'ev-cosmos-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  container.innerHTML = '';
  container.appendChild(canvas);

  const ctxRaw = canvas.getContext('2d');
  if (!ctxRaw) throw new Error('2D 上下文不可用');
  const ctx = ctxRaw;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seed = 20260831;
  const rng = random(seed);

  const stars: Star[] = [];
  const noiseN = 1400;
  const midN = 700;
  const brightN = 400;

  function addStar(layer: Star['layer']) {
    let size: number, base: number;
    if (layer === 'noise') { size = 0.4 + rng() * 0.6; base = 0.12 + rng() * 0.18; }
    else if (layer === 'mid') { size = 0.8 + rng() * 0.7; base = 0.32 + rng() * 0.25; }
    else { size = 1.2 + rng() * 1.4; base = 0.55 + rng() * 0.3; }
    stars.push({
      x: rng(),
      y: rng(),
      z: rng(),
      size,
      base,
      phase: rng() * Math.PI * 2,
      speed: 0.2 + rng() * 0.6,
      layer,
    });
  }
  for (let i = 0; i < noiseN; i++) addStar('noise');
  for (let i = 0; i < midN; i++) addStar('mid');
  for (let i = 0; i < brightN; i++) addStar('bright');

  const nebulae: Nebula[] = [
    { x: 0.18, y: 0.28, r: 0.42, color: '255,107,74', alpha: 0.44 }, // 左上橙红
    { x: 0.78, y: 0.72, r: 0.38, color: '79,209,229', alpha: 0.40 }, // 右下青
    { x: 0.52, y: 0.16, r: 0.32, color: '232,176,75', alpha: 0.34 }, // 上方金
    { x: 0.22, y: 0.78, r: 0.34, color: '150,90,220', alpha: 0.32 }, // 左下紫
  ];

  const planets: Planet[] = [
    { x: 0.86, y: 0.22, r: 0.045, kind: 'gas-ring', angle: 0.2, spin: 0.0006 },
    { x: 0.12, y: 0.38, r: 0.032, kind: 'ice', angle: 0.5, spin: -0.0004 },
    { x: 0.74, y: 0.84, r: 0.026, kind: 'rocky', angle: 0.8, spin: 0.0008 },
    { x: 0.30, y: 0.66, r: 0.035, kind: 'terrestrial', angle: 0.1, spin: 0.0003 },
    { x: 0.92, y: 0.58, r: 0.038, kind: 'gold-ring', angle: 0.4, spin: 0.0005 },
  ];

  const unopened: Unopened[] = [
    { x: 0.18, y: 0.18, r: 0.10, color: '100,120,150', label: '未开放 · 文学' },
    { x: 0.82, y: 0.30, r: 0.09, color: '90,140,170', label: '未开放 · 数学' },
    { x: 0.66, y: 0.12, r: 0.10, color: '160,130,90', label: '未开放 · 经济' },
    { x: 0.10, y: 0.72, r: 0.09, color: '130,90,170', label: '未开放 · 科技' },
    { x: 0.88, y: 0.82, r: 0.10, color: '170,100,140', label: '未开放 · 艺术' },
  ];

  // 静态层画布：星云、行星、未开放雾区、环境光晕，预渲染后每帧只 drawImage
  const staticCanvas = document.createElement('canvas');
  const sctxRaw = staticCanvas.getContext('2d');
  if (!sctxRaw) throw new Error('2D 上下文不可用');
  const sctx = sctxRaw;

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 1); // 宇宙背景降 DPR 到 1.0，显著降低 fill-rate

  function resize() {
    const rect = container.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    staticCanvas.width = canvas.width;
    staticCanvas.height = canvas.height;
    sctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderStatic();
  }

  function radialGradient(cx: number, cy: number, r: number, color: string, alpha: number) {
    const g = (ctx || sctx)!.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(${color}, ${alpha})`);
    g.addColorStop(0.45, `rgba(${color}, ${alpha * 0.35})`);
    g.addColorStop(1, `rgba(${color}, 0)`);
    return g;
  }

  function drawPlanet(c: CanvasRenderingContext2D, p: Planet, cx: number, cy: number, t: number) {
    const r = Math.max(4, p.r * Math.min(width, height));
    const x = p.x * width;
    const y = p.y * height;

    // 大气辉光
    const glow = c.createRadialGradient(x, y, r * 0.6, x, y, r * 2.6);
    glow.addColorStop(0, 'rgba(255,255,255,0.18)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = glow;
    c.beginPath();
    c.arc(x, y, r * 2.6, 0, Math.PI * 2);
    c.fill();

    if (p.kind === 'gas-ring') {
      const g = c.createLinearGradient(x - r, y - r, x + r, y + r);
      g.addColorStop(0, '#8a6a3a');
      g.addColorStop(0.5, '#c9a86c');
      g.addColorStop(1, '#5c4528');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      // 土星环
      c.save();
      c.translate(x, y);
      c.rotate(p.angle + t * p.spin * 3);
      c.scale(1, 0.28);
      c.strokeStyle = 'rgba(210,180,120,0.45)';
      c.lineWidth = r * 0.22;
      c.beginPath(); c.arc(0, 0, r * 2.1, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = 'rgba(210,180,120,0.22)';
      c.lineWidth = r * 0.42;
      c.beginPath(); c.arc(0, 0, r * 2.4, 0, Math.PI * 2); c.stroke();
      c.restore();
      // 条带
      for (let i = -3; i <= 3; i++) {
        c.strokeStyle = `rgba(120,90,50,${0.18 + Math.abs(i) * 0.05})`;
        c.lineWidth = r * 0.08;
        c.beginPath();
        c.arc(x, y, r * (0.55 + Math.abs(i) * 0.12), 0, Math.PI * 2);
        c.stroke();
      }
    } else if (p.kind === 'ice') {
      const g = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r * 1.3);
      g.addColorStop(0, '#a6d8e8');
      g.addColorStop(0.6, '#5fa8c8');
      g.addColorStop(1, '#2e5a78');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      // 漩涡
      c.strokeStyle = 'rgba(255,255,255,0.18)';
      c.lineWidth = r * 0.06;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        const a = i * 1.2 + t * p.spin * 4;
        c.arc(x, y, r * (0.3 + i * 0.18), a, a + Math.PI * 1.4);
        c.stroke();
      }
    } else if (p.kind === 'rocky') {
      const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 1.2);
      g.addColorStop(0, '#b86b5a');
      g.addColorStop(0.6, '#7a3e32');
      g.addColorStop(1, '#4a2420');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      // 坑洞
      for (let i = 0; i < 8; i++) {
        const rr = r * (0.12 + rng() * 0.18);
        const aa = rng() * Math.PI * 2;
        const d = rng() * r * 0.7;
        c.fillStyle = 'rgba(40,20,18,0.35)';
        c.beginPath();
        c.arc(x + Math.cos(aa) * d, y + Math.sin(aa) * d, rr, 0, Math.PI * 2);
        c.fill();
      }
    } else if (p.kind === 'terrestrial') {
      const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r * 1.25);
      g.addColorStop(0, '#4aa8b0');
      g.addColorStop(0.45, '#2d6a58');
      g.addColorStop(0.75, '#8b6f4e');
      g.addColorStop(1, '#1e3a4a');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(120,200,180,0.18)';
      c.lineWidth = r * 0.04;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(x, y, r * (0.35 + i * 0.25), rng() * Math.PI, rng() * Math.PI + Math.PI);
        c.stroke();
      }
    } else if (p.kind === 'gold-ring') {
      const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 1.2);
      g.addColorStop(0, '#f2d896');
      g.addColorStop(0.5, '#d4a856');
      g.addColorStop(1, '#8f6a2e');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.save();
      c.translate(x, y);
      c.rotate(p.angle - t * p.spin * 2);
      c.scale(1, 0.22);
      c.strokeStyle = 'rgba(255,230,170,0.45)';
      c.lineWidth = r * 0.18;
      c.beginPath(); c.arc(0, 0, r * 1.9, 0, Math.PI * 2); c.stroke();
      c.restore();
      c.strokeStyle = 'rgba(180,140,70,0.25)';
      for (let i = -2; i <= 2; i++) {
        c.lineWidth = r * 0.05;
        c.beginPath(); c.arc(x, y, r * (0.45 + Math.abs(i) * 0.13), 0, Math.PI * 2); c.stroke();
      }
    }

    // 共同：右侧阴影增强立体感
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.beginPath();
    c.arc(x, y, r, 0.5, Math.PI * 2.5);
    c.fill();
  }

  function renderStatic() {
    if (!sctx) return;
    sctx.clearRect(0, 0, width, height);

    // 1. 底色
    sctx.fillStyle = '#05070d';
    sctx.fillRect(0, 0, width, height);

    // 2. 环境光晕（蓝/紫）
    sctx.globalCompositeOperation = 'screen';
    const halo1 = radialGradient(width * 0.78, height * 0.18, Math.min(width, height) * 0.55, '20,33,61', 0.55);
    sctx.fillStyle = halo1;
    sctx.fillRect(0, 0, width, height);
    const halo2 = radialGradient(width * 0.22, height * 0.82, Math.min(width, height) * 0.42, '26,16,36', 0.48);
    sctx.fillStyle = halo2;
    sctx.fillRect(0, 0, width, height);

    // 3. 四片彩色星云
    for (const n of nebulae) {
      const nx = n.x * width;
      const ny = n.y * height;
      const nr = n.r * Math.min(width, height);
      const g = sctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
      g.addColorStop(0, `rgba(${n.color}, ${n.alpha})`);
      g.addColorStop(0.5, `rgba(${n.color}, ${n.alpha * 0.25})`);
      g.addColorStop(1, `rgba(${n.color}, 0)`);
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, width, height);
    }

    // 4. 五片未开放灰冷星云 + 标签
    sctx.globalCompositeOperation = 'source-over';
    sctx.font = '500 12px "Noto Sans SC", "Inter", sans-serif';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    for (const u of unopened) {
      const ux = u.x * width;
      const uy = u.y * height;
      const ur = u.r * Math.min(width, height);
      const g = sctx.createRadialGradient(ux, uy, 0, ux, uy, ur);
      g.addColorStop(0, `rgba(${u.color}, 0.28)`);
      g.addColorStop(0.55, `rgba(${u.color}, 0.08)`);
      g.addColorStop(1, `rgba(${u.color}, 0)`);
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, width, height);
      // 暗星点缀
      sctx.fillStyle = 'rgba(200,210,230,0.35)';
      for (let i = 0; i < 5; i++) {
        const a = rng() * Math.PI * 2;
        const d = rng() * ur * 0.7;
        const rr = 0.6 + rng() * 1.0;
        sctx.beginPath();
        sctx.arc(ux + Math.cos(a) * d, uy + Math.sin(a) * d, rr, 0, Math.PI * 2);
        sctx.fill();
      }
      sctx.fillStyle = 'rgba(200,210,230,0.55)';
      sctx.fillText(u.label, ux, uy + ur * 0.75);
    }

    // 5. 五颗行星
    sctx.globalCompositeOperation = 'source-over';
    const t = 0;
    for (const p of planets) drawPlanet(sctx, p, width * 0.5, height * 0.5, t);

    // 6. 指数雾：远处星融入背景的淡色渐变
    sctx.globalCompositeOperation = 'source-over';
    const fog = sctx.createLinearGradient(0, height * 0.55, 0, height);
    fog.addColorStop(0, 'rgba(5,7,13,0)');
    fog.addColorStop(1, 'rgba(5,7,13,0.55)');
    sctx.fillStyle = fog;
    sctx.fillRect(0, height * 0.55, width, height * 0.45);

    // 7. 主光暖白（顶部中央稍亮）和环境冷光
    sctx.globalCompositeOperation = 'screen';
    const key = sctx.createRadialGradient(width * 0.5, height * 0.18, 0, width * 0.5, height * 0.18, width * 0.55);
    key.addColorStop(0, 'rgba(255,242,224,0.10)');
    key.addColorStop(1, 'rgba(255,242,224,0)');
    sctx.fillStyle = key;
    sctx.fillRect(0, 0, width, height);
    const rim = sctx.createRadialGradient(width * 0.85, height * 0.15, 0, width * 0.85, height * 0.15, width * 0.55);
    rim.addColorStop(0, 'rgba(127,168,255,0.12)');
    rim.addColorStop(1, 'rgba(127,168,255,0)');
    sctx.fillStyle = rim;
    sctx.fillRect(0, 0, width, height);
  }

  let raf = 0;
  let start = performance.now();
  let lastT = 0;

  function drawStar(s: Star, t: number) {
    // 深度视差：z 越远，旋转越慢、越小、越淡
    const parallax = 0.03 + s.z * 0.09;
    const rot = t * parallax * 0.05;
    let sx = s.x + rot;
    sx -= Math.floor(sx);
    const sy = s.y + Math.sin(t * 0.02 + s.phase) * 0.004;
    const px = sx * width;
    const py = sy * height;

    const depthFade = 0.35 + s.z * 0.65; // 近处更亮
    let alpha = s.base * depthFade;
    if (!reduce) {
      const tw = Math.sin(t * s.speed + s.phase) * 0.5 + 0.5;
      alpha *= 0.75 + tw * 0.45; // 闪烁
    }

    const size = s.size * (0.7 + s.z * 0.6);
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = '#eef2ff';
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();

    // 亮星带微光晕：用缓存精灵 drawImage，避免每帧创建渐变
    if (s.layer === 'bright' && size > 1.4) {
      const r = size * 4;
      ctx.drawImage(GLOW_SPRITE, px - r, py - r, r * 2, r * 2);
    }
  }

  function frame(now: number) {
    const t = (now - start) / 1000;
    lastT = t;
    ctx.clearRect(0, 0, width, height);

    // 静态层
    if (sctx) {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(staticCanvas, 0, 0, width, height);
    }

    // 动态星层：加色混合；z 排序不需要每帧做（screen 混合可交换、z 仅用于 alpha/size）
    ctx.globalCompositeOperation = 'screen';
    for (const s of stars) drawStar(s, t);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    raf = requestAnimationFrame(frame);
  }

  resize();
  if (!reduce) raf = requestAnimationFrame(frame);
  else {
    // 静态模式下只绘制一帧星场（不闪烁不旋转）
    ctx.drawImage(staticCanvas, 0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    for (const s of stars) drawStar(s, 0);
  }

  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  return {
    canvas,
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      if (canvas.parentElement) canvas.parentElement.removeChild(canvas);
    },
  };
}
