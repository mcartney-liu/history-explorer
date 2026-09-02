// 实体页「类型化科幻徽标」：按文明 / 技术 / 人物呈现不同形态，保留轨道卫星。
// 纯 SVG/CSS，零 WebGL，避免实体页同时跑第二个 GL 上下文；prefers-reduced-motion 下降级。

export interface RelNode {
  gid: string;
  name: string;
  color: string;
  score: number;
  recommended: boolean;
  clickable: boolean;
  tier?: 'sure' | 'debated' | 'weak';
}

export interface EntityEmblemHandle {
  setType(type: string, truth: string): void;
  setRelations(nodes: RelNode[]): void;
  onPick(cb: (gid: string, score?: number) => void): void;
  dispose(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function setAttributes(el: Element, attrs: Record<string, string>) {
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
}

function createGradient(
  id: string,
  stops: { offset: string; color: string; opacity?: string }[],
  type: 'radial' | 'linear' = 'radial',
  attrs: Record<string, string> = {},
): SVGGradientElement {
  const el = document.createElementNS(SVG_NS, type + 'Gradient') as SVGGradientElement;
  setAttributes(el, { id, ...attrs });
  stops.forEach((s) => {
    const stop = document.createElementNS(SVG_NS, 'stop');
    setAttributes(stop, {
      offset: s.offset,
      'stop-color': s.color,
      ...(s.opacity ? { 'stop-opacity': s.opacity } : {}),
    });
    el.appendChild(stop);
  });
  return el;
}

export function createEntityEmblem(container: HTMLElement): EntityEmblemHandle {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  container.innerHTML = '';

  const svg = document.createElementNS(SVG_NS, 'svg');
  setAttributes(svg, {
    viewBox: '0 0 420 320',
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': '实体徽标',
  });
  svg.classList.add('ev-emblem-svg');

  // defs：通用光晕滤镜 + 三类渐变
  const defs = document.createElementNS(SVG_NS, 'defs');
  const glow = document.createElementNS(SVG_NS, 'filter');
  setAttributes(glow, {
    id: 'evCoreGlow',
    x: '-80%',
    y: '-80%',
    width: '260%',
    height: '260%',
  });
  glow.innerHTML = `
    <feGaussianBlur stdDeviation="9" result="b1"/>
    <feGaussianBlur stdDeviation="18" result="b2"/>
    <feMerge>
      <feMergeNode in="b2"/>
      <feMergeNode in="b1"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  `;
  defs.appendChild(glow);

  // 文明：金色恒星 + 行星环
  defs.appendChild(
    createGradient(
      'evCivCore',
      [
        { offset: '0%', color: '#fff8e8' },
        { offset: '35%', color: '#f2ca6d' },
        { offset: '100%', color: '#c98f2e' },
      ],
      'radial',
      { cx: '42%', cy: '38%', r: '58%' },
    ),
  );
  defs.appendChild(
    createGradient(
      'evCivRing',
      [
        { offset: '0%', color: 'rgba(232,176,75,0.55)' },
        { offset: '50%', color: 'rgba(232,176,75,0.18)' },
        { offset: '100%', color: 'rgba(232,176,75,0)' },
      ],
      'linear',
      { x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
    ),
  );

  // 技术：青蓝晶体
  defs.appendChild(
    createGradient(
      'evTechCore',
      [
        { offset: '0%', color: '#e6ffff' },
        { offset: '40%', color: '#7dd3fc' },
        { offset: '100%', color: '#0ea5e9' },
      ],
      'radial',
      { cx: '40%', cy: '30%', r: '70%' },
    ),
  );
  defs.appendChild(
    createGradient(
      'evTechFacet',
      [
        { offset: '0%', color: 'rgba(224,247,255,0.55)' },
        { offset: '100%', color: 'rgba(14,165,233,0.12)' },
      ],
      'linear',
      { x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
    ),
  );

  // 人物：暖白光晕恒星
  defs.appendChild(
    createGradient(
      'evPersonCore',
      [
        { offset: '0%', color: '#ffffff' },
        { offset: '45%', color: '#ffecd2' },
        { offset: '100%', color: '#f5b971' },
      ],
      'radial',
      { cx: '45%', cy: '40%', r: '60%' },
    ),
  );
  defs.appendChild(
    createGradient(
      'evPersonHalo',
      [
        { offset: '0%', color: 'rgba(255,236,210,0.55)' },
        { offset: '100%', color: 'rgba(255,236,210,0)' },
      ],
      'radial',
      {},
    ),
  );

  svg.appendChild(defs);

  const cx = 210;
  const cy = 145;

  // 轨道组
  const orbitGroup = document.createElementNS(SVG_NS, 'g');
  orbitGroup.classList.add('ev-orbits');
  if (!reduce) orbitGroup.classList.add('ev-orbit-spin');

  const orbit1 = document.createElementNS(SVG_NS, 'ellipse');
  setAttributes(orbit1, {
    cx: String(cx), cy: String(cy), rx: '172', ry: '58',
    fill: 'none', stroke: 'rgba(232,176,75,0.24)', 'stroke-width': '1.2',
    transform: `rotate(12 ${cx} ${cy})`,
  });
  const orbit2 = document.createElementNS(SVG_NS, 'ellipse');
  setAttributes(orbit2, {
    cx: String(cx), cy: String(cy), rx: '154', ry: '48',
    fill: 'none', stroke: 'rgba(232,176,75,0.16)', 'stroke-width': '0.9',
    transform: `rotate(-22 ${cx} ${cy})`,
  });
  orbitGroup.appendChild(orbit1);
  orbitGroup.appendChild(orbit2);
  svg.appendChild(orbitGroup);

  // 背景光晕（类型切换时会更新颜色）
  const halo = document.createElementNS(SVG_NS, 'circle');
  setAttributes(halo, {
    cx: String(cx), cy: String(cy), r: '96',
    fill: 'rgba(232,176,75,0.14)',
    filter: 'url(#evCoreGlow)',
  });
  halo.classList.add('ev-halo');
  if (!reduce) halo.classList.add('ev-halo-pulse');
  svg.appendChild(halo);

  // 中央核心容器：由 setType 填充
  const coreGroup = document.createElementNS(SVG_NS, 'g');
  coreGroup.classList.add('ev-core-group');
  if (!reduce) coreGroup.classList.add('ev-core-pulse');
  svg.appendChild(coreGroup);

  // 卫星容器
  const satGroup = document.createElementNS(SVG_NS, 'g');
  satGroup.classList.add('ev-sats');
  svg.appendChild(satGroup);

  container.appendChild(svg);

  let relations: RelNode[] = [];
  let pickCb: ((gid: string, score?: number) => void) | null = null;
  let currentType = '';

  function renderCivCore(g: Element, reduce: boolean) {
    // 文明：恒星主体 + 土星式行星环 + 小环
    const body = document.createElementNS(SVG_NS, 'circle');
    setAttributes(body, {
      cx: String(cx), cy: String(cy), r: '46',
      fill: 'url(#evCivCore)', filter: 'url(#evCoreGlow)',
    });
    body.classList.add('ev-core-body');
    g.appendChild(body);

    const ring1 = document.createElementNS(SVG_NS, 'ellipse');
    setAttributes(ring1, {
      cx: String(cx), cy: String(cy), rx: '78', ry: '20',
      fill: 'none', stroke: 'url(#evCivRing)', 'stroke-width': '3.5',
      transform: `rotate(16 ${cx} ${cy})`,
    });
    if (!reduce) ring1.classList.add('ev-ring-drift');
    g.appendChild(ring1);

    const ring2 = document.createElementNS(SVG_NS, 'ellipse');
    setAttributes(ring2, {
      cx: String(cx), cy: String(cy), rx: '62', ry: '14',
      fill: 'none', stroke: 'rgba(255,230,180,0.28)', 'stroke-width': '1.4',
      transform: `rotate(-38 ${cx} ${cy})`,
    });
    g.appendChild(ring2);

    // 表面纹理：几条纬线
    for (let i = -1; i <= 1; i++) {
      const arc = document.createElementNS(SVG_NS, 'path');
      const y = cy + i * 22;
      const r = Math.sqrt(46 * 46 - i * i * 22 * 22);
      arc.setAttribute('d', `M ${cx - r} ${y} A ${r} ${r * 0.35} 0 0 1 ${cx + r} ${y}`);
      arc.setAttribute('fill', 'none');
      arc.setAttribute('stroke', 'rgba(120,70,20,0.22)');
      arc.setAttribute('stroke-width', '1');
      g.appendChild(arc);
    }
  }

  function renderTechCore(g: Element, reduce: boolean) {
    // 技术：悬浮晶体（六边形 + 内三角刻线）+ 锐角光环
    const hexPts = [];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      hexPts.push(`${cx + Math.cos(a) * 52},${cy + Math.sin(a) * 52}`);
    }

    const crystal = document.createElementNS(SVG_NS, 'polygon');
    setAttributes(crystal, {
      points: hexPts.join(' '),
      fill: 'url(#evTechCore)', stroke: '#bae6fd', 'stroke-width': '1.2',
      filter: 'url(#evCoreGlow)',
    });
    crystal.classList.add('ev-core-body');
    if (!reduce) crystal.classList.add('ev-crystal-float');
    g.appendChild(crystal);

    // 刻面高光
    const facet = document.createElementNS(SVG_NS, 'polygon');
    const innerPts = [];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      innerPts.push(`${cx + Math.cos(a) * 28},${cy + Math.sin(a) * 28}`);
    }
    setAttributes(facet, {
      points: innerPts.join(' '),
      fill: 'url(#evTechFacet)', stroke: 'rgba(186,230,253,0.35)', 'stroke-width': '0.8',
    });
    g.appendChild(facet);

    // 内部电路纹理
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
      const x2 = cx + Math.cos(a) * 42;
      const y2 = cy + Math.sin(a) * 42;
      const line = document.createElementNS(SVG_NS, 'line');
      setAttributes(line, {
        x1: String(cx), y1: String(cy), x2: String(x2), y2: String(y2),
        stroke: 'rgba(224,247,255,0.35)', 'stroke-width': '1',
      });
      g.appendChild(line);
    }

    // 锐角光环（两个倾斜椭圆）
    const ring = document.createElementNS(SVG_NS, 'ellipse');
    setAttributes(ring, {
      cx: String(cx), cy: String(cy), rx: '86', ry: '18',
      fill: 'none', stroke: 'rgba(125,211,252,0.35)', 'stroke-width': '2',
      transform: `rotate(34 ${cx} ${cy})`,
    });
    if (!reduce) ring.classList.add('ev-ring-drift');
    g.appendChild(ring);
  }

  function renderPersonCore(g: Element, reduce: boolean) {
    // 人物：光晕恒星 + 柔和光环
    const halo2 = document.createElementNS(SVG_NS, 'circle');
    setAttributes(halo2, {
      cx: String(cx), cy: String(cy), r: '72',
      fill: 'url(#evPersonHalo)', opacity: '0.8',
    });
    g.appendChild(halo2);

    const body = document.createElementNS(SVG_NS, 'circle');
    setAttributes(body, {
      cx: String(cx), cy: String(cy), r: '42',
      fill: 'url(#evPersonCore)', filter: 'url(#evCoreGlow)',
    });
    body.classList.add('ev-core-body');
    g.appendChild(body);

    const ring = document.createElementNS(SVG_NS, 'ellipse');
    setAttributes(ring, {
      cx: String(cx), cy: String(cy), rx: '68', ry: '16',
      fill: 'none', stroke: 'rgba(255,236,210,0.32)', 'stroke-width': '2',
      transform: `rotate(8 ${cx} ${cy})`,
    });
    if (!reduce) ring.classList.add('ev-ring-drift');
    g.appendChild(ring);

    // 散射光线
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r1 = 54;
      const r2 = 74;
      const line = document.createElementNS(SVG_NS, 'line');
      setAttributes(line, {
        x1: String(cx + Math.cos(a) * r1),
        y1: String(cy + Math.sin(a) * r1),
        x2: String(cx + Math.cos(a) * r2),
        y2: String(cy + Math.sin(a) * r2),
        stroke: 'rgba(255,236,210,0.22)', 'stroke-width': '1.4', 'stroke-linecap': 'round',
      });
      if (!reduce) line.classList.add('ev-ray-fade');
      g.appendChild(line);
    }
  }

  function renderCore(type: string) {
    coreGroup.innerHTML = '';
    const t = (type || '').toLowerCase();
    if (t.includes('civ') || t.includes('文明')) {
      halo.setAttribute('fill', 'rgba(232,176,75,0.16)');
      renderCivCore(coreGroup, reduce);
    } else if (t.includes('tech') || t.includes('技术')) {
      halo.setAttribute('fill', 'rgba(125,211,252,0.14)');
      renderTechCore(coreGroup, reduce);
    } else if (t.includes('person') || t.includes('人物')) {
      halo.setAttribute('fill', 'rgba(255,236,210,0.14)');
      renderPersonCore(coreGroup, reduce);
    } else {
      // 默认按文明渲染，保持金色统一
      halo.setAttribute('fill', 'rgba(232,176,75,0.14)');
      renderCivCore(coreGroup, reduce);
    }
  }

  function renderSats() {
    satGroup.innerHTML = '';
    const picks = relations.slice(0, 4);
    if (!picks.length) return;

    const slots = [
      { a: Math.PI * 0.92, r: 162 },
      { a: Math.PI * 0.22, r: 156 },
      { a: Math.PI * 0.02, r: 160 },
      { a: -Math.PI * 0.62, r: 152 },
    ];

    picks.forEach((n, i) => {
      const slot = slots[i % slots.length];
      const x = cx + Math.cos(slot.a) * slot.r;
      const y = cy + Math.sin(slot.a) * slot.r * 0.45;
      const g = document.createElementNS(SVG_NS, 'g');
      g.style.cursor = n.clickable ? 'pointer' : 'default';
      g.setAttribute('class', 'ev-sat');

      const color = n.recommended ? '#F0D27A' : n.color || '#9fb4d8';
      const star = document.createElementNS(SVG_NS, 'circle');
      setAttributes(star, {
        cx: String(x), cy: String(y), r: '5',
        fill: color, filter: 'url(#evCoreGlow)',
      });
      g.appendChild(star);

      const text = document.createElementNS(SVG_NS, 'text');
      const display = n.name.length > 4 ? n.name.slice(0, 3) + '…' : n.name;
      setAttributes(text, {
        x: String(x), y: String(y + 16),
        fill: '#eef2f8', 'font-size': '11', 'text-anchor': 'middle',
        'font-family': '"Noto Sans SC", "Inter", sans-serif',
      });
      text.textContent = display;
      g.appendChild(text);

      if (n.clickable && pickCb) {
        g.addEventListener('click', () => pickCb && pickCb(n.gid, n.score));
      }
      satGroup.appendChild(g);
    });
  }

  function setType(type: string, _truth: string) {
    currentType = type;
    renderCore(type);
  }
  function setRelations(nodes: RelNode[]) {
    relations = nodes;
    renderSats();
  }
  function onPick(cb: (gid: string, score?: number) => void) {
    pickCb = cb;
  }
  function dispose() {
    container.innerHTML = '';
  }

  // 默认渲染一次
  renderCore('');

  return { setType, setRelations, onPick, dispose };
}
