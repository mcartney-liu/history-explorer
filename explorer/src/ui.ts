import { api } from './api';
import { ACHIEVEMENTS, CURATED_QUESTS } from './quest';
import type { EntityNode, Progress, Quest, Truth, RelatedRec, Citation, StageInfo } from './types';
import { createEntityEmblem, type EntityEmblemHandle, type RelNode } from './entity3d';
import { createEntityRoom, type EntityRoomHandle, type RoomInfo } from './entityRoom';

const TRUTH_ZH: Record<Truth, string> = { verified: '高可信', debated: '有争议', pending: '待核实' };
const TRUTH_COLOR: Record<Truth, string> = { verified: '#5fd38a', debated: '#e8b04b', pending: '#6fa8dc' };
const CONF_ZH: Record<string, string> = { high: '高', medium: '中', low: '低' };
const TIER_CLASS: Record<string, string> = { 入门: 'tier-easy', 进阶: 'tier-mid', 通识: 'tier-open' };

// ---- 实体 3D 展厅：进入钮挂实体面板，整屏切换成可拖动环视的 3D 房间；与 2D 面板并存，可还原 ----
let roomCtx: {
  gid: string;
  node?: EntityNode;
  onNext: (gid: string, score?: number) => void;
  nameOf: (gid: string) => string;
  nodeOf: (gid: string) => EntityNode | undefined;
} | null = null;
let roomHandle: EntityRoomHandle | null = null;
let roomWired = false;
let roomEnterAnim: Animation | null = null; // 进场"从 2D 方块滑入"动画句柄，退场/重入时取消

export function toast(msg: string) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

export function setGalaxyBadge(text: string, live: boolean) {
  const b = document.getElementById('galaxyBadge');
  if (!b) return;
  b.textContent = text;
  b.className = live ? 'galaxy-badge live' : 'galaxy-badge';
}

// M1：HUD 主线文案行（"主线 · 罗马的共和之道 · 第 1/4 站"）
export function setQuestLabel(text: string) {
  const el = document.getElementById('hudQuest');
  if (el) el.textContent = text;
}

// §9.2 理解度具象化：把抽象百分比译成"你已点亮 N / M 颗星"，让进度可感知
export function setHudSub(text: string) {
  const el = document.getElementById('hudSub');
  if (el) el.innerHTML = text;
}

// §9.2 常驻「下一步建议」出口：始终给一个可行动方向，闭合 Article 0「离变聪明还差什么」
export function setHudNext(text: string) {
  const el = document.getElementById('hudNext');
  if (el) el.textContent = text;
}

// §9.1-B 首屏引导气泡：首次进入时轻提示从一条线入门；传 null 即隐藏
export function setOnboardTip(text: string | null) {
  const el = document.getElementById('onboardTip');
  if (!el) return;
  if (text) {
    const t = el.querySelector('.ob-text');
    if (t) t.textContent = text;
    el.removeAttribute('hidden');
  } else {
    el.setAttribute('hidden', '');
  }
}

// §9.1-B 高亮第一张主线卡（脉冲），引导新用户从一条线入门
export function pulseFirstQuest(on: boolean) {
  const card = document.querySelector<HTMLElement>('.quest-card[data-qid="maurya"]');
  if (card) card.classList.toggle('firstrun', on);
}

export function rankOf(understanding: number): string {
  if (understanding >= 90) return '文明智者';
  if (understanding >= 60) return '资深旅人';
  if (understanding >= 30) return '见习向导';
  return '新手探索者';
}

let lastHudPct = 0;
let lastRank = '';

export function updateHud(understanding: number, rankText?: string) {
  const pct = document.querySelector<HTMLElement>('.hud-deck .progress b');
  const rank = document.querySelector<HTMLElement>('.hud-deck .progress .rank');
  const rankNow = rankText || rankOf(understanding);
  if (rank) rank.textContent = rankNow;
  if (pct) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || lastHudPct === understanding) {
      pct.textContent = understanding + '%';
    } else {
      // M3：理解度数字滚动 + 脉冲，让"长认知"这一刻有即时反馈
      const from = lastHudPct;
      const to = understanding;
      const t0 = performance.now();
      const tick = () => {
        const k = Math.min(1, (performance.now() - t0) / 600);
        pct.textContent = Math.round(from + (to - from) * k) + '%';
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      pct.classList.remove('bump');
      void pct.offsetWidth; // 重启动画
      pct.classList.add('bump');
    }
    lastHudPct = understanding;
    const meter = document.getElementById('hudMeter');
    if (meter) meter.style.width = Math.max(0, Math.min(100, understanding)) + '%';
  }
  if (rankNow !== lastRank && lastRank) toast('⚡ 段位提升 · ' + rankNow);
  lastRank = rankNow;
}

export function renderQuestHall(
  container: HTMLElement,
  quests: Quest[],
  progress: Progress,
  understandingOf: (q: Quest) => number,
  isDone: (q: Quest) => boolean,
  onPick: (q: Quest) => void,
) {
  container.innerHTML = '';
  let stageIdx = 0;
  for (const q of quests) {
    const card = document.createElement('div');
    card.className = 'quest-card' + (q.id === 'free' ? ' free' : '');
    card.setAttribute('data-qid', q.id);
    const u = understandingOf(q);
    const done = isDone(q);
    const walked = progress.quests[q.id]?.path.length || 0;
    const scale = q.id === 'free' ? '不限站数' : walked + ' / ' + q.requiredVisits + ' 站';
    // 主线卡按顺序镂空大号关卡号 01–04（自由漫游不计数），作为闯关路标视觉锚点
    const stageNo = q.id === 'free' ? '' : String(++stageIdx).padStart(2, '0');
    card.innerHTML = `
      <span class="tier ${TIER_CLASS[q.tier] || ''}">${q.tier}</span>
      <span class="scale">${scale}</span>
      ${stageNo ? `<span class="stage-no">${stageNo}</span>` : ''}
      <h3>${q.title}</h3>
      <p>${q.blurb}</p>
      <div class="bar"><i style="width:${u}%"></i></div>
      ${done ? '<div class="done">✓ 已通关</div>' : `<div class="done" style="color:var(--paper-dim)">理解度 ${u}%</div>`}
    `;
    card.addEventListener('click', () => onPick(q));
    container.appendChild(card);
  }
}

function truthBadge(el: HTMLElement, truth: Truth) {
  el.textContent = '真值层 · ' + TRUTH_ZH[truth];
  el.style.color = TRUTH_COLOR[truth];
  el.style.borderColor = TRUTH_COLOR[truth];
}

// --- 实体页 3D 徽标 + 视差倾斜（让平面板"浮"起来，与星图 3D 风格统一）-----------
let emblem: EntityEmblemHandle | null = null;
let tiltCleanup: (() => void) | null = null;

function mountEntityEmblem(type: string, truth: Truth) {
  const cv = document.getElementById('evEmblem') as HTMLCanvasElement | null;
  if (!cv) return;
  if (emblem) emblem.dispose();
  emblem = createEntityEmblem(cv);
  emblem.setType(type, truth as string);
}

// 鼠标在面板上移动 → 整块玻璃板朝光标轻微倾斜(rotateX/Y)，子元素 translateZ 产生真实视差纵深。
// reduced-motion 下不绑（避免眩晕），徽标静止旋转也已在 entity3d 内尊重该偏好。
function wireEntityTilt() {
  const ev = document.getElementById('entityView');
  const inner = document.querySelector<HTMLElement>('.entity-view .ev-inner');
  if (!ev || !inner) return;
  if (tiltCleanup) tiltCleanup();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const onMove = (e: PointerEvent) => {
    const r = ev.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    inner.style.transform = `rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg)`;
  };
  const onLeave = () => {
    inner.style.transform = 'rotateX(0deg) rotateY(0deg)';
  };
  ev.addEventListener('pointermove', onMove);
  ev.addEventListener('pointerleave', onLeave);
  tiltCleanup = () => {
    ev.removeEventListener('pointermove', onMove);
    ev.removeEventListener('pointerleave', onLeave);
  };
}

// 返回星图 / 切换实体前释放徽标的 WebGL 上下文（避免第二个 GL context 常驻）
export function disposeEntityEmblem() {
  if (emblem) {
    emblem.dispose();
    emblem = null;
  }
  if (tiltCleanup) {
    tiltCleanup();
    tiltCleanup = null;
  }
}

// ---- 实体 3D 展厅：进入 / 返回 / 模式切换 / 点星直达（与 2D 面板并存，可一键还原） ----
function wireEntityRoom() {
  if (roomWired) return;
  roomWired = true;
  document.getElementById('evToRoom')?.addEventListener('click', () => enterRoom());
  document.getElementById('roomBack')?.addEventListener('click', () => closeRoom());
  document.getElementById('roomMode')?.addEventListener('click', () => toggleRoomMode());
}

// 由真实接口数据拼出相关实体悬浮星点（与 2D 面板同口径，守真值层着色 + 置信度档位）
function buildRoomRelNodes(rel: any, ent: any, nodeOf: (gid: string) => EntityNode | undefined): RelNode[] {
  const recs = (rel?.recommendations || []).filter((r: any) => r.target_entity?.global_id).slice(0, 5);
  const relData = ent?.relationships && Array.isArray(ent.relationships) ? ent.relationships : [];
  const out: RelNode[] = [];
  const tierOf = (sc: number, rec: boolean): 'sure' | 'debated' | 'weak' =>
    !rec ? 'weak' : sc >= 0.7 ? 'sure' : sc >= 0.4 ? 'debated' : 'weak';
  recs.forEach((r: any) => {
    const g = r.target_entity.global_id;
    const sc = typeof r.score === 'number' ? r.score : 0.6;
    const nd = nodeOf(g);
    out.push({ gid: g, name: nd?.n || r.target_entity.name || g, color: '#F0D27A', score: sc, recommended: true, clickable: true, tier: tierOf(sc, true) });
  });
  relData
    .filter((r: any) => (r.target && r.target.global_id) || r.target_global_id)
    .slice(0, 5)
    .forEach((r: any) => {
      const g = (r.target && r.target.global_id) || r.target_global_id;
      if (out.some((x) => x.gid === g)) return;
      const nd = nodeOf(g);
      const truth = (nd?.truth || (r.target && r.target.truth) || r.target_truth || 'verified') as Truth;
      out.push({ gid: g, name: nd?.n || r.target_name || g, color: TRUTH_COLOR[truth] || '#7e8aa0', score: 0, recommended: false, clickable: true, tier: 'weak' });
    });
  return out;
}

// 由真实接口数据拼出三面信息墙文字（概览 / 时间线 / 因果），全部来自后端，不编造
function buildRoomInfo(ent: any, rel: any, desc: string): RoomInfo {
  const sum = ent?.summary || {};
  const overview: string[] = [];
  if (desc) overview.push(desc);
  if (sum.description && sum.description !== desc) overview.push(sum.description);
  if (sum.overview) overview.push(String(sum.overview));
  const tls: any[] = Array.isArray(ent?.timeline) ? ent.timeline : [];
  const timeline: string[] = [];
  for (const it of tls.slice(0, 8)) {
    const yr = it?.year || it?.date || it?.time || '';
    const tx = it?.title || it?.label || it?.event || it?.name || '';
    if (yr || tx) timeline.push((yr ? '〔' + yr + '〕' : '') + ' ' + tx);
  }
  const cause: string[] = [];
  const recs = (rel?.recommendations || []).filter((r: any) => r.target_entity?.global_id && (r.reasons || []).length).slice(0, 6);
  for (const r of recs) {
    const name = r.target_entity.name || r.target_entity.global_id;
    cause.push('◆ ' + name + '：' + (r.reasons || []).join('；'));
  }
  if (!cause.length) {
    const relData = ent?.relationships && Array.isArray(ent.relationships) ? ent.relationships : [];
    for (const r of relData.slice(0, 6)) {
      const g = (r.target && r.target.global_id) || r.target_global_id;
      const name = r.target_name || (g ? (roomCtx?.nameOf(g) || g) : '');
      if (name) cause.push('· ' + name + (r.label || r.kind ? '（' + (r.label || r.kind) + '）' : ''));
    }
  }
  return { overview: overview.length ? overview : [desc || '（暂无概览内容）'], timeline: timeline.length ? timeline : ['（暂无时间线）'], cause: cause.length ? cause : ['（暂无因果连接）'] };
}

function ensureRoom(canvas: HTMLCanvasElement) {
  if (roomHandle) return;
  roomHandle = createEntityRoom(canvas, {
    reduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    onPick: (gid, score) => roomPick(gid, score),
    onExit: () => closeRoom(),
  });
}

async function enterRoom(gid?: string) {
  if (!roomCtx) return;
  const target = gid || roomCtx.gid;
  const node = gid ? roomCtx.nodeOf(target) : roomCtx.node;
  if (!node) {
    toast('该节点暂无 3D 数据，先回 2D 面板');
    return;
  }
  const section = document.getElementById('entityRoom');
  const canvas = document.getElementById('roomCanvas') as HTMLCanvasElement | null;
  if (!section || !canvas) return;
  (document.getElementById('roomTitle') as HTMLElement).textContent = node.n + ' · ' + (node.zhType || '实体');
  // 拉取真实数据（后端有缓存，开销可控）；拿到后再建/刷新展厅，避免空房间
  const [ent, rel] = await Promise.all([api.entity(target), api.related(target)]);
  ensureRoom(canvas);
  const relNodes = buildRoomRelNodes(rel, ent, roomCtx.nodeOf);
  const info = buildRoomInfo(ent, rel, node.desc);
  roomHandle?.setData(node, relNodes, info);
  roomHandle?.setMode('orbit');
  updateRoomModeUI('orbit');
  // 首帧尺寸校正（覆盖层刚展开，clientWidth 可能尚未稳）
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  // 显示 + 进场过渡：首次从 2D 面板进入时，从实体方块(#evEmblem)位置缩放淡入，
  // 让 3D 展厅中央的实体晶体像从 2D 方块里"滑"出来，衔接更顺（展厅内换站不再滑入）
  revealRoom(section, !gid);
}

function roomPick(gid: string, score?: number) {
  if (!roomCtx) return;
  roomCtx.onNext(gid, score); // 与星图点击同效果：更新 2D 面板进度 + 路径
  enterRoom(gid); // 重建展厅为下一站
}

function closeRoom() {
  const section = document.getElementById('entityRoom');
  if (roomEnterAnim) {
    roomEnterAnim.cancel();
    roomEnterAnim = null;
  }
  if (!section) return;
  // 退场：反向滑回 2D 方块(#evEmblem)位置淡出，与进场形成闭环（reduced-motion 或方块不可见时直接关）
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && section.classList.contains('open')) {
    const emb = document.getElementById('evEmblem');
    const r = emb?.getBoundingClientRect();
    if (r && r.width > 0) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (r.left + r.width / 2) - cx;
      const dy = (r.top + r.height / 2) - cy;
      const anim = section.animate(
        [
          { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.18)`, opacity: 0 },
        ],
        { duration: 420, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      );
      anim.onfinish = () => {
        section.classList.remove('open');
        section.setAttribute('aria-hidden', 'true');
        section.style.transform = '';
        section.style.opacity = '';
        if (roomHandle) {
          roomHandle.dispose();
          roomHandle = null;
        }
      };
      return;
    }
  }
  section.classList.remove('open');
  section.setAttribute('aria-hidden', 'true');
  if (roomHandle) {
    roomHandle.dispose();
    roomHandle = null;
  }
}

// 显示 3D 展厅覆盖层，并按需播放"从 2D 实体方块滑入"的进场过渡。
// from2D=true 且为首次进入（覆盖层尚未 open）时：以 #evEmblem 屏幕位置为起点缩放淡入，
// 3D 中央实体晶体因此像从 2D 方块里滑出；展厅内换站(alreadyOpen)或 reduced-motion 时直接显示、无过渡。
function revealRoom(section: HTMLElement, from2D: boolean) {
  const alreadyOpen = section.classList.contains('open');
  section.classList.add('open');
  section.setAttribute('aria-hidden', 'false');
  if (alreadyOpen) return; // 展厅内换站：保持现状，不重复滑入
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const emb = document.getElementById('evEmblem');
  const r = emb?.getBoundingClientRect();
  if (!r || r.width === 0) return; // 方块不可见（理论上不会），退化为普通显示
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const dx = (r.left + r.width / 2) - cx;
  const dy = (r.top + r.height / 2) - cy;
  if (roomEnterAnim) roomEnterAnim.cancel();
  roomEnterAnim = section.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(0.18)`, opacity: 0 },
      { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
    ],
    { duration: 560, easing: 'cubic-bezier(0.2, 0.85, 0.25, 1.08)' },
  );
  roomEnterAnim.onfinish = () => {
    roomEnterAnim = null;
  };
}

function toggleRoomMode() {
  if (!roomHandle) return;
  const next = roomHandle.getMode() === 'orbit' ? 'walk' : 'orbit';
  roomHandle.setMode(next);
  updateRoomModeUI(next);
}

function updateRoomModeUI(mode: 'orbit' | 'walk') {
  const btn = document.getElementById('roomMode') as HTMLButtonElement | null;
  const hint = document.getElementById('roomHint') as HTMLElement | null;
  if (btn) {
    btn.setAttribute('aria-pressed', mode === 'walk' ? 'true' : 'false');
    btn.textContent = mode === 'walk' ? '🖱️ 环视' : '🚶 走进去';
  }
  if (hint) hint.textContent = mode === 'walk' ? '点击画面锁定视角 · WASD / 方向键走动 · Esc 退出' : '拖动旋转环视 · 滚轮拉远拉近';
}

// 分面「塔罗抽牌 + 中央揭示 + 聚焦放大」：三张塔罗牌点哪张 → 飞中央放大翻转、详情在大牌面揭示板舒展，其余退两侧；
// 并补充「收起出口」：点牌之外的空白、或「收起 ✕」按钮 → 三张收回并排小牌（正面朝上、待选），不再卡在居中放大终态
function wireFacetHatch(defaultFacet: string) {
  const wrap = document.getElementById('evHatch');
  if (!wrap) return;
  const cards = Array.from(wrap.querySelectorAll<HTMLElement>('.flip-card'));
  const collapse = () => {
    cards.forEach((c) => {
      c.classList.remove('selected', 'side');
      c.style.order = '';
      const front = c.querySelector<HTMLButtonElement>('.flip-card-front');
      const back = c.querySelector<HTMLElement>('.flip-card-back');
      if (front) front.setAttribute('aria-expanded', 'false');
      if (back) back.setAttribute('aria-hidden', 'true');
    });
  };
  const activate = (f: string) => {
    const idx = cards.findIndex((c) => c.dataset.facet === f);
    if (idx < 0) return;
    cards.forEach((c, i) => {
      const on = i === idx;
      const front = c.querySelector<HTMLButtonElement>('.flip-card-front');
      const back = c.querySelector<HTMLElement>('.flip-card-back');
      c.classList.toggle('selected', on);   // 选中：居中放大 + 翻转
      c.classList.toggle('side', !on);       // 其余：缩小退两侧
      c.style.order = on ? '2' : i < idx ? '1' : '3';
      if (front) front.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (back) back.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
  };
  cards.forEach((c) => {
    const front = c.querySelector<HTMLButtonElement>('.flip-card-front');
    if (front) front.addEventListener('click', () => activate(c.dataset.facet || 'overview'));
  });
  // 点牌之外的空白（card-deck 两侧留白、或 ev-hatch 上下留白）→ 收起三张待选；
  // 点牌本身冒泡命中 closest('.flip-card') 不会触发，故点牌=选中、点空白=收回
  wrap.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.flip-card')) collapse();
  });
  collapse(); // 初始化：三张并排收起（正面朝上、待选），不预翻任一张
}

const SVG_NS = 'http://www.w3.org/2000/svg';

// 时间线 → 可滑动发光的年代带：刻度按时间顺序均布，悬停看"年份 + 事件"（非行列表）
function renderTimelineRibbon(container: HTMLElement, tls: any[]) {
  container.innerHTML = '';
  if (!tls || !tls.length) {
    container.innerHTML = '<div class="ev-graph-empty">暂无时间线</div>';
    return;
  }
  const W = 680, H = 70, pad = 44, y = 34;
  const n = tls.length;
  const xs = tls.map((_, i) => (n === 1 ? W / 2 : pad + ((W - 2 * pad) * i) / (n - 1)));
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('role', 'img');
  const st = document.createElementNS(SVG_NS, 'title');
  st.textContent = '可滑动的时间线年代带，悬停刻度查看事件';
  svg.appendChild(st);

  const base = document.createElementNS(SVG_NS, 'line');
  base.setAttribute('x1', String(pad));
  base.setAttribute('y1', String(y));
  base.setAttribute('x2', String(W - pad));
  base.setAttribute('y2', String(y));
  base.setAttribute('stroke', '#2a3344');
  base.setAttribute('stroke-width', '2');
  svg.appendChild(base);

  const prog = document.createElementNS(SVG_NS, 'line');
  prog.setAttribute('x1', String(pad));
  prog.setAttribute('y1', String(y));
  prog.setAttribute('x2', xs[0].toFixed(1));
  prog.setAttribute('y2', String(y));
  prog.setAttribute('stroke', '#e8b04b');
  prog.setAttribute('stroke-width', '2');
  svg.appendChild(prog);

  tls.forEach((ev: any, i: number) => {
    const x = xs[i];
    const yr = ev.year || ev.date || '';
    const ti = ev.title || ev.label || '';
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', x.toFixed(1));
    dot.setAttribute('cy', String(y));
    dot.setAttribute('r', i === 0 ? '7' : '5');
    dot.setAttribute('fill', i === 0 ? '#ff6b4a' : '#9aa3b2');
    dot.setAttribute('class', 'tl-tick');
    const tt = document.createElementNS(SVG_NS, 'title');
    tt.textContent = (yr ? yr + '  ' : '') + ti;
    dot.appendChild(tt);
    svg.appendChild(dot);
    const lab = document.createElementNS(SVG_NS, 'text');
    lab.setAttribute('x', x.toFixed(1));
    lab.setAttribute('y', String(i === 0 ? 16 : 56));
    lab.setAttribute('text-anchor', 'middle');
    lab.setAttribute('fill', i === 0 ? '#ff6b4a' : '#9aa3b2');
    lab.setAttribute('font-size', '10');
    lab.textContent = String(yr);
    svg.appendChild(lab);
  });

  container.appendChild(svg);
}

// --- 成就徽章（真实奖章形态）------------------------------------------------
export function renderAchievements(container: HTMLElement, unlocked: string[]) {
  container.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const got = unlocked.includes(a.id);
    const el = document.createElement('div');
    el.className = 'ach' + (got ? ' got' : '');
    el.title = a.desc + (got ? '（已解锁）' : '（未解锁）');
    const grad0 = got ? '#ffe08a' : '#5b6579';
    const grad1 = got ? '#c78f28' : '#2e3440';
    const stroke = got ? '#e8b04b' : '#4a4f5a';
    const ribbon = got ? '#c78f28' : '#3a3f4a';
    const iconColor = got ? '#fff' : '#6b7280';
    const glow = got ? '0.6' : '0.3';
    el.innerHTML =
      '<div class="ach-medal">' +
      '<svg viewBox="0 0 64 84" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="grad-' + a.id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="' + grad0 + '"/>' +
      '<stop offset="100%" stop-color="' + grad1 + '"/>' +
      '</linearGradient>' +
      '<filter id="glow-' + a.id + '">' +
      '<feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#e8b04b" flood-opacity="' + glow + '"/>' +
      '</filter>' +
      '</defs>' +
      '<path d="M32 3 L55 12 L55 42 C55 59 32 74 32 74 C32 74 9 59 9 42 L9 12 Z" fill="url(#grad-' + a.id + ')" stroke="' + stroke + '" stroke-width="2" filter="url(#glow-' + a.id + ')"/>' +
      '<circle cx="32" cy="34" r="15" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>' +
      '<text x="32" y="40" text-anchor="middle" font-size="16" fill="' + iconColor + '">' + a.icon + '</text>' +
      '<path d="M18 70 L24 80 L32 72 L40 80 L46 70" fill="none" stroke="' + ribbon + '" stroke-width="2.5"/>' +
      '</svg>' +
      '</div>' +
      '<span class="nm">' + a.name + '</span>';
    container.appendChild(el);
  }
}

// 用通关路径生成确定性迷你星座图（点+连线）
function miniConstellationSvg(path: string[]) {
  if (!path.length) return '';
  const points = path.map((gid) => {
    let h = 0;
    for (let k = 0; k < gid.length; k++) h = (h * 31 + gid.charCodeAt(k)) % 100000;
    const x = 14 + (h % 68);
    const y = 14 + ((h >> 8) % 68);
    return { x, y };
  });
  const lines: string[] = [];
  for (let i = 1; i < points.length; i++) {
    lines.push(
      '<line x1="' + points[i - 1].x + '" y1="' + points[i - 1].y + '" x2="' + points[i].x + '" y2="' + points[i].y + '" stroke="rgba(232,176,75,0.35)" stroke-width="1"/>',
    );
  }
  const dots = points.map(
    (p, i) =>
      '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (i === points.length - 1 ? 3.5 : 2.5) + '" fill="' + (i === points.length - 1 ? '#ffe08a' : '#e8b04b') + '"/>',
  );
  return '<svg viewBox="0 0 96 96" class="cname-stars" aria-hidden="true">' + lines.join('') + dots.join('') + '</svg>';
}

// --- 认知星座墙（真实数据） -------------------------------------------------
// 已访问节点按真值层着色并发光；未访问的取一批暗置作为"待点亮的支线"。
export function renderConstellation(
  container: HTMLElement,
  nodes: EntityNode[],
  progress: Progress,
  onPick: (gid: string) => void,
) {
  container.innerHTML = '';
  const visitedGids = Object.keys(progress.visited);
  const visited = visitedGids
    .map((g) => nodes.find((n) => n.gid === g))
    .filter((n): n is EntityNode => !!n);
  const rest = nodes.filter((n) => !progress.visited[n.gid]);
  // 暗节点数量随已点亮数增长，保持"星空还有很多没探索"的观感但不过载
  const dimCount = Math.min(60, Math.max(24, visited.length * 3));
  const dim = rest.slice(0, dimCount);

  const lit = document.getElementById('constLit');
  const total = document.getElementById('constTotal');
  if (lit) lit.textContent = String(visited.length);
  if (total) total.textContent = String(nodes.length);

  if (!visited.length) {
    const hint = document.createElement('div');
    hint.className = 'const-empty';
    hint.textContent = '你的星座还是一片暗的 —— 回到星图点亮第一颗星辰吧。';
    container.appendChild(hint);
  }

  // 用确定性伪随机布点（按 gid 派生），保证刷新后位置稳定
  const place = (gid: string, i: number) => {
    let h = 0;
    for (let k = 0; k < gid.length; k++) h = (h * 31 + gid.charCodeAt(k)) % 100000;
    const ang = ((h % 360) + i * 13) * (Math.PI / 180);
    const rad = 12 + ((h >> 4) % 36);
    return { top: 50 + Math.sin(ang) * rad, left: 50 + Math.cos(ang) * rad * 1.7 };
  };

  dim.forEach((n, i) => {
    const p = place(n.gid, i);
    const s = document.createElement('span');
    s.className = 'cnode off';
    s.style.top = p.top + '%';
    s.style.left = p.left + '%';
    s.title = n.n + '（未探索）';
    container.appendChild(s);
  });

  visited.forEach((n, i) => {
    const p = place(n.gid, i);
    const s = document.createElement('span');
    s.className = 'cnode ' + n.truth;
    s.style.top = p.top + '%';
    s.style.left = p.left + '%';
    s.title = n.n + ' · ' + TRUTH_ZH[n.truth];
    s.addEventListener('click', () => onPick(n.gid));
    const lbl = document.createElement('i');
    lbl.textContent = n.n;
      s.appendChild(lbl);
      container.appendChild(s);
    });

    // 命名星座：通关主线后玩家给这趟起的名字，以真实星座图形态留在墙中
    const namedWrap = document.getElementById('constNamed');
    if (namedWrap) {
      namedWrap.innerHTML = '';
      const named = Object.entries(progress.quests).filter(([, v]) => v.done && v.name);
      if (named.length) {
        const h = document.createElement('h4');
        h.className = 'ach-title';
        h.textContent = '已命名星座';
        namedWrap.appendChild(h);
        for (const [qid, v] of named) {
          const q = CURATED_QUESTS.find((x) => x.id === qid);
          const d = document.createElement('div');
          d.className = 'cname';
          d.innerHTML =
            miniConstellationSvg(v.path) +
            '<div class="cname-meta"><b>' +
            (v.name || '') +
            '</b><span>' +
            (q ? q.title : '自由漫游') +
            ' · ' +
            v.path.length +
            ' 站</span></div>';
          namedWrap.appendChild(d);
        }
      }
    }
  }

  // --- 关卡上下文条 + 路径轴（M5） -------------------------------------------
  function renderStage(stage: StageInfo | undefined, gid: string, understanding = 0) {
    const el = document.getElementById('evStage');
    const cps = document.getElementById('evCps');
    if (!el) return;
    // Tier1-B：关卡条常驻——自由漫游也显示"理解度 X%"，不再凭空消失
    if (!stage) {
      el.style.display = '';
      el.innerHTML = '<span class="ev-stage-q">自由漫游</span> 随性点亮 · <b>理解度 ' + understanding + '%</b>';
      if (cps) cps.innerHTML = '';
      return;
    }
    el.style.display = '';
    const idx = stage.path.indexOf(gid);
    const station = idx >= 0 ? idx + 1 : stage.walked;
    el.innerHTML =
      '<span class="ev-stage-q">主线</span> ' +
      stage.title +
      ' · <b>第 ' +
      station +
      '/' +
      stage.required +
      ' 站</b> · 阶段：解谜 · 读因果';
    // Tier1-C：在关卡条下方铺一行"叙事节拍"芯片（已点亮=金、待点亮=暗），让主线像故事而非计数器
    if (cps) {
      if (stage.checkpoints?.length) {
        const chips = stage.checkpoints
          .map((c) => '<span class="cp ' + (c.done ? 'done' : 'todo') + '" title="' + c.hint + '">' + (c.done ? '◆ ' : '◇ ') + c.name + '</span>')
          .join('');
        cps.innerHTML = '<span class="ev-cps-label">节拍</span>' + chips;
      } else {
        cps.innerHTML = '';
      }
    }
    // 认知回音壁·引导：把用户出发前的疑问轻轻浮现在关卡条下方，让探索带着问题走
    const gapEl = document.getElementById('evGap');
    if (gapEl) {
      if (stage && stage.gap) {
        gapEl.textContent = '🧭 这趟你想搞清楚：' + stage.gap;
        gapEl.removeAttribute('hidden');
      } else {
        gapEl.setAttribute('hidden', '');
      }
    }
  }

  // 探索路线：已过站亮、当前站"你在这里"带辉光拖尾、前方站暗淡幽灵。
  // 进度条随 walked/required 流动（CSS 过渡），让"走路线"可视化。
  function renderPathRail(
    stage: StageInfo | undefined,
    gid: string,
    nameOf: (g: string) => string,
    onJump: (g: string) => void,
  ) {
    const el = document.getElementById('pathRail');
    if (!el) return;
    if (!stage) {
      el.innerHTML = '<div class="pr-free">自由漫游模式 · 随性点亮任何星辰，进度自会在你的认知星座上留痕</div>';
      return;
    }
    const fill = Math.min(100, Math.round((stage.walked / stage.required) * 100));
    const ghosts = stage.frontier.filter((g) => g !== gid && !stage.path.includes(g)).slice(0, 3);
    let dots = '';
    stage.path.forEach((g) => {
      const cur = g === gid;
      dots +=
        '<li class="pr-dot ' + (cur ? 'current' : 'done') + '" title="' + nameOf(g) + '" data-g="' + g + '"><i></i><b>' + nameOf(g) + '</b></li>';
    });
    ghosts.forEach((g) => {
      dots += '<li class="pr-dot ghost" title="' + nameOf(g) + '" data-g="' + g + '"><i></i><b>' + nameOf(g) + '</b></li>';
    });
    el.innerHTML =
      '<div class="pr-head">探索路线 · <span class="pr-here">你在这里</span></div>' +
      '<div class="pr"><div class="pr-line"><span class="pr-fill" style="width:' + fill + '%"></span></div>' +
      '<ol class="pr-dots">' + dots + '</ol></div>';
    el.querySelectorAll<HTMLElement>('.pr-dot').forEach((d) => {
      d.addEventListener('click', () => {
        const g = d.getAttribute('data-g');
        if (g) onJump(g);
      });
    });
  }

// --- 实体页 -----------------------------------------------------------------
export async function openEntityView(
  gid: string,
  node: EntityNode | undefined,
  recs: RelatedRec[],
  onNext: (gid: string, score?: number) => void,
  nameOf: (gid: string) => string,
  prevGid: string | null,
  visited: string[],
  stage?: StageInfo,
  understanding?: number,
  onBridge?: (from: string, to: string, conf: string) => void,
  nodeOf?: (gid: string) => EntityNode | undefined,
  neighbors?: { gid: string; name: string; dist: number }[],
) {
  const ev = document.getElementById('entityView');
  if (!ev) return;
  // 记住当前实体上下文，供「3D 展厅」进入钮拉取真实数据（与 2D 渲染解耦，可还原）
  roomCtx = { gid, node, onNext, nameOf, nodeOf: nodeOf || (() => undefined) };
  wireEntityRoom();
  const swapping = ev.classList.contains('open'); // E. 换站：已开则不重放开场动画，原地淡入
  const tb = document.getElementById('evTruth')!;
  const snap = node || { gid, n: gid, en: '', type: '', desc: '', truth: 'verified' as Truth, zhType: '实体' };
  let relData: any[] = [];
  let tls: any[] = [];
  const defaultFacet = prevGid && prevGid !== gid ? 'cause' : 'overview';

  (document.getElementById('evCat') as HTMLElement).textContent = (snap.zhType || '实体') + ' · 真实历史节点';
  (document.getElementById('evName') as HTMLElement).textContent = snap.n;
  (document.getElementById('evSub') as HTMLElement).textContent = '文明星图 · ' + gid;
  (document.getElementById('evDesc') as HTMLElement).textContent = snap.desc || '';
  truthBadge(tb as HTMLElement, snap.truth);
  const src = document.getElementById('evSrc') as HTMLElement;
  src.textContent = '○ 离线快照（演示数据）';
  src.className = 'src offline';
  (document.getElementById('evTlRibbon') as HTMLElement).innerHTML = '';
  ev.classList.add('open');
  ev.setAttribute('aria-hidden', 'false');
  if (swapping) {
    ev.classList.add('ev-swap');
    window.setTimeout(() => ev.classList.remove('ev-swap'), 380);
  }
  ev.scrollTop = 0;

  // 实体页 3D 化：顶部旋转晶体徽标 + 鼠标视差倾斜（面板"浮"起来，呼应星图）
  mountEntityEmblem(snap.type, snap.truth);
  wireEntityTilt();
  wireFacetHatch(defaultFacet);

  // 关卡上下文条 + 路径轴（M5）：让人知道"我在哪、在闯第几站、进度怎么流"
  renderStage(stage, gid, understanding);
  renderPathRail(stage, gid, nameOf, onNext);

  // 因果解说与实体详情并行拉取（AI 通常最慢，先起）
  const aiTask = renderAIExplain(gid, snap.n, prevGid, prevGid ? nameOf(prevGid) : '', visited, onNext, nameOf, onBridge);

  const [ent, ins] = await Promise.all([api.entity(gid), api.insights(gid)]);

  if (ent) {
    const sum = ent.summary || {};
    if (sum.description) (document.getElementById('evDesc') as HTMLElement).textContent = sum.description;
    if (ent.name) (document.getElementById('evName') as HTMLElement).textContent = ent.name;
    relData = Array.isArray(ent.relationships) ? ent.relationships : [];
    tls = Array.isArray(ent.timeline) ? ent.timeline : [];
    src.textContent = '● 实时后端 · ' + gid + (relData.length ? ' · ' + relData.length + ' 条关系' : '');
    src.className = 'src live';
  }

  if (ins) {
    const st = truthFromEvidence(ins) || snap.truth;
    truthBadge(tb as HTMLElement, st);
  }

  // 关系/推荐下一站 → 真 3D 轨道英雄（entity3d.ts）：相关节点作绕飞卫星，点击直达。
  // 推荐下一站用金色脉冲标出；其余节点按真值层着色。取代原静态 SVG 关系图。
  const relNodes: RelNode[] = [];
  // D. 下一站置信度档位：推荐候选按 score 分 确定/有争议/弱关联；其余同主题连接一律标弱关联（仅作脉络，不强推）
  const tierOf = (sc: number, rec: boolean): 'sure' | 'debated' | 'weak' =>
    !rec ? 'weak' : sc >= 0.7 ? 'sure' : sc >= 0.4 ? 'debated' : 'weak';
  recs
    .filter((r) => r.target_entity && r.target_entity.global_id)
    .slice(0, 4)
    .forEach((r) => {
      const g = r.target_entity.global_id;
      const sc = typeof r.score === 'number' ? r.score : 0.6;
      relNodes.push({ gid: g, name: nameOf(g), color: '#F0D27A', score: sc, recommended: true, clickable: true, tier: tierOf(sc, true) });
    });
  relData
    .filter((r: any) => (r.target && r.target.global_id) || r.target_global_id)
    .slice(0, 4)
    .forEach((r: any) => {
      const g = (r.target && r.target.global_id) || r.target_global_id;
      if (relNodes.some((x) => x.gid === g)) return;
      const truth = ((r.target && r.target.truth) || r.target_truth || 'verified') as Truth;
      relNodes.push({ gid: g, name: r.target_name || nameOf(g), color: TRUTH_COLOR[truth] || '#7e8aa0', score: 0, recommended: false, clickable: true, tier: 'weak' });
    });
  if (emblem) {
    emblem.setRelations(relNodes);
    emblem.onPick((gid, score) => onNext(gid, score));
  }
  const orbitCap = document.getElementById('evOrbitCap') as HTMLElement | null;
  if (orbitCap) {
    const valid = relNodes.filter((n) => n.recommended).length;
    const weak = relNodes.filter((n) => n.tier === 'weak').length;
    const debated = relNodes.filter((n) => n.tier === 'debated').length;
    const hint = valid
      ? '此刻有 ' + valid + ' 条推荐路 · 点亮的星可直达（你选的方向决定星座长什么样）'
      : relNodes.length
        ? '这个节点连着这些文明脉络 · 点星直达'
        : '图谱暂未给出确定性下一站，回星图换个方向继续探索';
    // D. 置信度图例 + 弱关联/有争议的 Article 0 提示（踏入不确定地带 = 逼近真相）
    const legend =
      '<span class="oc-legend"><b class="lg-sure">◆ 确定</b><b class="lg-deb">⚑ 有争议</b><b class="lg-weak">· 弱关联</b></span>' +
      (weak || debated
        ? '<span class="oc-a0">冷色星 = 踏入不确定地带——真值常藏在争议里（Article 0）</span>'
        : '');
    orbitCap.innerHTML = '<span class="oc-hint">' + hint + '</span>' + legend;
  }
  // D. 下一站归因：把后端 related-entities 的 reasons（中文多理由）显式呈现，
  // 让用户看见「为什么推这条」，而非黑箱推荐（呼应 Article 0 真值层不编造）
  const reasonsEl = document.getElementById('evReasons');
  if (reasonsEl) {
    const withReason = recs.filter((r) => r.target_entity?.global_id && (r.reasons || []).length).slice(0, 4);
    reasonsEl.innerHTML = '';
    if (withReason.length) {
      const head = document.createElement('div');
      head.className = 'evr-head';
      head.textContent = '为什么推这条（基于你的后端关系）';
      reasonsEl.appendChild(head);
      withReason.forEach((r) => {
        const tier = r.score && r.score >= 0.7 ? 'sure' : r.score && r.score >= 0.4 ? 'debated' : 'weak';
        const prefix = tier === 'sure' ? '◆ ' : tier === 'debated' ? '⚑ ' : '· ';
        const item = document.createElement('div');
        item.className = 'evr-item';
        const nm = document.createElement('span');
        nm.className = 'evr-name';
        nm.textContent = prefix + (r.target_entity.name || nameOf(r.target_entity.global_id));
        const why = document.createElement('span');
        why.className = 'evr-why';
        why.textContent = (r.reasons || [])[0] || '';
        item.appendChild(nm);
        item.appendChild(why);
        reasonsEl.appendChild(item);
      });
    }
  }
  renderTimelineRibbon(document.getElementById('evTlRibbon') as HTMLElement, tls);

  // 方案A·空间邻居：列出"附近在空间上离它最近的星"，点一下平滑飞过去（以该星为新锚点）
  renderNeighbors(document.getElementById('evNeighbors') as HTMLElement | null, neighbors || [], onNext);

  (document.getElementById('evFoot') as HTMLElement).textContent =
    '数据来源：你的后端 GET /api/v1/entity/' + gid;

  await aiTask;
}

// 方案A·空间邻居列表：在实体面板内给出"附近在空间上离它最近的星"，点一下即以前者为新锚点飞过去。
// 与后端 related（关联推荐）互补：related 是语义/因果相连，neighbors 是纯粹的空间相邻，让"想顺路看看旁边的星"变顺。
function renderNeighbors(el: HTMLElement | null, list: { gid: string; name: string; dist: number }[], onNext: (gid: string, score?: number) => void) {
  if (!el) return;
  el.innerHTML = '';
  if (!list.length) {
    el.setAttribute('hidden', '');
    return;
  }
  el.removeAttribute('hidden');
  const head = document.createElement('div');
  head.className = 'evn-head';
  head.textContent = '附近的星 · 空间相邻（点一下飞过去）';
  el.appendChild(head);
  const wrap = document.createElement('div');
  wrap.className = 'evn-list';
  list.forEach((n) => {
    const b = document.createElement('button');
    b.className = 'evn-item';
    b.type = 'button';
    b.innerHTML = '<span class="evn-name">' + esc(n.name) + '</span><span class="evn-dist">距 ' + Math.round(n.dist) + '</span>';
    b.addEventListener('click', () => onNext(n.gid));
    wrap.appendChild(b);
  });
  el.appendChild(wrap);
}

// 主线通关结算面板（M6 + 收口）：回顾真实因果链 + AI 凝练"你比出发时多懂了什么" + 给这趟命名。
// 全部基于玩家真实走过的节点，不编造；AI 关闭时静默降级为"由你亲自总结"。
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
}

// 认知回音壁：把"通关=走过哪"升级为"离场=懂了什么"，闭合 Article 0 认知闭环。
// 内容只来自真实已点亮节拍 + 用户本人自填疑问，不捏造收获。
function renderEchoWall(
  ov: HTMLElement,
  quest: Quest,
  path: string[],
  gap: string | undefined,
  checkpoints: { name: string; hint: string; done: boolean }[] | undefined,
  onReflect: ((smart: number) => void) | undefined,
) {
  const echo = ov.querySelector('.qd-echo') as HTMLElement | null;
  if (!echo) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gapLine = echo.querySelector('.qd-gap') as HTMLElement | null;
  if (gapLine) {
    if (gap) {
      gapLine.innerHTML = '你出发时想搞清楚：<b>' + esc(gap) + '</b> —— 走完这趟，答案该由你亲自确认。';
      gapLine.removeAttribute('hidden');
    } else {
      gapLine.setAttribute('hidden', '');
    }
  }
  const takes = echo.querySelector('#qdTakeaways') as HTMLElement | null;
  if (takes) {
    const lit = (checkpoints || []).filter((c) => c.done);
    if (lit.length) {
      takes.innerHTML = lit
        .map((c, i) => {
          const delay = reduce ? '' : ' style="animation-delay:' + (i * 0.1) + 's"';
          return (
            '<div class="qd-take"' + delay + '>' +
            '<span class="qd-take-n">顿悟 ' + (i + 1) + '</span>' +
            '<b>' + esc(c.name) + '</b>' +
            '<span class="qd-take-h">' + esc(c.hint) + '</span>' +
            '</div>'
          );
        })
        .join('');
    } else {
      takes.innerHTML = '<div class="qd-take solo">这趟你点亮了 <b>' + path.length + '</b> 颗星辰 —— 收获由你亲自命名最准。</div>';
    }
  }
  const stars = echo.querySelector('#qdStars') as HTMLElement | null;
  if (stars && onReflect) {
    stars.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      b.onclick = () => {
        const v = Number(b.getAttribute('data-v')) || 0;
        stars.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        onReflect(v);
      };
    });
  }
}

export function openQuestDone(
  quest: Quest,
  path: string[],
  nameOf: (g: string) => string,
  onName: (name: string) => void,
  gap?: string,
  checkpoints?: { name: string; hint: string; done: boolean }[],
  onReflect?: (smart: number) => void,
) {
  const ov = document.getElementById('questDone');
  if (!ov) return;
  const names = path.map(nameOf);

  (ov.querySelector('.qd-title') as HTMLElement).textContent = '「' + quest.title + '」通关 · 你点亮了 ' + path.length + ' 颗星辰';

  // 因果链回顾：把走过的"从 A→B"真实顺序铺出来，呼应 M4 的"为什么"
  const chain = ov.querySelector('.qd-chain') as HTMLElement;
  chain.innerHTML = '';
  if (path.length <= 1) {
    chain.innerHTML = '<li class="qd-solo">你停在了 <b>' + (names[0] || '起点') + '</b></li>';
  } else {
    for (let i = 1; i < path.length; i++) {
      const li = document.createElement('li');
      li.innerHTML =
        '<span class="qd-from">' + names[i - 1] + '</span><span class="qd-arrow">→</span><span class="qd-to">' + names[i] + '</span>';
      chain.appendChild(li);
    }
  }

  // E. 收束感：把"你为这条弧连了几段因果光桥"具象化（走过 N 站 = N-1 段连接），呼应 M4 光桥 + "认知弧闭合"
  const bridges = ov.querySelector('.qd-bridges') as HTMLElement | null;
  if (bridges) {
    const segs = Math.max(0, path.length - 1);
    bridges.innerHTML =
      '你为这条弧连了 <b>' + segs + '</b> 段因果光桥 · 认知弧就此闭合，星座因你而成形 <span class="qd-star">⭐</span>';
  }

  const input = ov.querySelector('.qd-input') as HTMLInputElement;
  input.value = quest.title;
  const body = ov.querySelector('.qd-summary') as HTMLElement;
  const meta = ov.querySelector('.qd-meta') as HTMLElement;
  body.innerHTML = '<div class="ai-skeleton"><i></i><i></i><i></i></div>';
  meta.textContent = '正在由 AI 凝练你这趟的收获…';
  ov.classList.add('open');
  ov.setAttribute('aria-hidden', 'false');

  // 认知回音壁（Article 0 闭环）：回扣出发疑问 + 凝练真实收获 + 自评"变聪明了吗"
  renderEchoWall(ov, quest, path, gap, checkpoints, onReflect);

  // AI 凝练收获：基于真实走过的节点名，生成 2-3 句"此刻比出发时多懂了什么"
  const question =
    '我刚走完「' + quest.title + '」这条探索线，依次经过：' + names.join('、') +
    '。请用 2-3 句话告诉我，一个刚走完这条线的人，此刻比起出发时，多懂了哪些关于这段历史的认知？像老朋友一样总结收获，不要罗列清单。';
  api
    .explain(question, path.slice(0, 12), path.slice(0, 40))
    .then((res) => {
      if (!res || !res.answer || !res.answer.trim()) {
        body.innerHTML = '<p class="ai-fallback">这趟的收获由你亲自总结更准——你已经走完了一条完整的文明线索。</p>';
        meta.textContent = '';
        return;
      }
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      body.innerHTML = '';
      if (reduce) {
        const p = document.createElement('p');
        p.className = 'ai-answer';
        p.textContent = res.answer.trim();
        body.appendChild(p);
      } else {
        const sents = res.answer.split(/(?<=[。！？!?])\s*/).map((s) => s.trim()).filter(Boolean);
        sents.forEach((s, i) => {
          const sp = document.createElement('span');
          sp.className = 'ai-sent';
          sp.textContent = s;
          sp.style.animationDelay = (i * 0.12) + 's';
          body.appendChild(sp);
        });
        if (!sents.length) {
          const p = document.createElement('p');
          p.className = 'ai-answer';
          p.textContent = res.answer.trim();
          body.appendChild(p);
        }
      }
      meta.textContent = '基于你走过的 ' + path.length + ' 个真实节点生成';
    })
    .catch(() => {
      body.innerHTML = '<p class="ai-fallback">这趟的收获由你亲自总结更准——你已经走完了一条完整的文明线索。</p>';
      meta.textContent = '';
    });

  const close = () => {
    ov.classList.remove('open');
    ov.setAttribute('aria-hidden', 'true');
  };
  const btn = ov.querySelector('.qd-name-btn') as HTMLButtonElement;
  if (btn) {
    btn.onclick = () => {
      const nm = (input.value || quest.title).trim().slice(0, 24) || quest.title;
      onName(nm);
      close();
    };
  }
  const x = ov.querySelector('.qd-close') as HTMLElement;
  if (x) x.onclick = close;
  ov.onclick = (e) => {
    if (e.target === ov) close();
  };
}

// 闯关"读因果"环节：把"我为什么会从上一站来到这一站"讲成一段人话。
// 有上一站 → 问跨站因果；没有（直接从星图点进来）→ 问该节点自身的历史位置。
async function renderAIExplain(
  gid: string,
  name: string,
  prevGid: string | null,
  prevName: string,
  visited: string[],
  onNext: (gid: string, score?: number) => void,
  nameOf: (gid: string) => string,
  onBridge?: (from: string, to: string, conf: string) => void,
) {
  const title = document.getElementById('evAITitle');
  const body = document.getElementById('evAIBody');
  const meta = document.getElementById('evAIMeta');
  const cites = document.getElementById('evAICites');
  if (!title || !body || !meta || !cites) return;

  const linked = !!prevGid && prevGid !== gid;
  title.textContent = linked ? `为什么从「${prevName}」会走到「${name}」` : `「${name}」为什么值得你停下来`;
  body.innerHTML = '<div class="ai-skeleton"><i></i><i></i><i></i></div>';
  meta.textContent = '正在从知识图谱生成因果解说…';
  meta.className = 'ai-meta';
  cites.innerHTML = '';

  const question = linked
    ? `为什么从「${prevName}」会走到「${name}」？请说明两者之间的历史因果、传承或影响关系。`
    : `「${name}」在历史中为什么重要？它连接着哪些更大的脉络？`;
  const ctx = linked && prevGid ? [prevGid, gid] : [gid];

  const res = await api.explain(question, ctx, visited.slice(0, 40));

  if (!res || !res.answer || !res.answer.trim()) {
    // 诚实降级：不编造，只说明状态，并把用户指回确定性数据
    body.innerHTML =
      '<p class="ai-fallback">当前没有取到可用的因果解说（后端解说通道未开启或暂时不可达）。' +
      '下面的关系网络与时间线仍是知识图谱里的确定性数据，可以照常继续探索。</p>';
    meta.textContent = '';
    return;
  }

  const conf = (res.confidence || '').toLowerCase();
  const confZh = CONF_ZH[conf];
  meta.className = 'ai-meta' + (conf ? ' conf-' + conf : '');
  meta.textContent = confZh
    ? `解说依据置信度：${confZh} · 基于 ${(res.evidence || []).length} 条图谱证据生成`
    : `基于 ${(res.evidence || []).length} 条图谱证据生成`;

  // M4：把因果叙事逐句展开，像在眼前一句句铺开（reduced-motion 下整段直出）
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  body.innerHTML = '';
  if (reduce) {
    const p = document.createElement('p');
    p.className = 'ai-answer';
    p.textContent = res.answer.trim();
    body.appendChild(p);
  } else {
    const sents = res.answer
      .split(/(?<=[。！？!?])\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    sents.forEach((s, i) => {
      const sp = document.createElement('span');
      sp.className = 'ai-sent';
      sp.textContent = s;
      sp.style.animationDelay = i * 0.16 + 's';
      body.appendChild(sp);
    });
    if (!sents.length) {
      const p = document.createElement('p');
      p.className = 'ai-answer';
      p.textContent = res.answer.trim();
      body.appendChild(p);
    }
  }

  // M4：AI 拿到置信度后，在 prev→cur 之间连一条发光因果光桥（高亮=暖金 / 中=冷蓝 / 低=暗蓝）
  if (linked && onBridge) onBridge(prevGid as string, gid, conf);

  // 引用可点击（实体类引用即可跳站，形成"顺着证据继续探索"的闭环）
  const list: Citation[] = (res.citations || []).filter((c) => c && c.global_id);
  const seen = new Set<string>();
  const uniq = list.filter((c) => (seen.has(c.global_id) ? false : (seen.add(c.global_id), true))).slice(0, 6);
  for (const c of uniq) {
    const jumpable = c.kind === 'entity' && nameOf(c.global_id) !== c.global_id && c.global_id !== gid;
    const el = document.createElement(jumpable ? 'button' : 'span');
    el.className = 'cite' + (jumpable ? ' jump' : '');
    el.textContent = (jumpable ? '↗ ' : '') + (c.label || nameOf(c.global_id));
    el.title = c.global_id + ' · ' + c.kind;
    if (jumpable) el.addEventListener('click', () => onNext(c.global_id));
    cites.appendChild(el);
  }
}

function truthFromEvidence(ins: any): Truth | null {
  const ev = ins && Array.isArray(ins.evidence) ? ins.evidence : [];
  if (!ev.length) return null;
  const ss = new Set(ev.map((c: any) => (c.status || '').toLowerCase()));
  if (ss.has('disputed') || ss.has('debated')) return 'debated';
  if (ss.has('pending') || ss.has('unverified') || ss.has('unconfirmed') || ss.has('weak')) return 'pending';
  return 'verified';
}
