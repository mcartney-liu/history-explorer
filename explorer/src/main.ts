// 设计签名字体：@fontsource 包经 Vite 打包为同源资源，Safari/Firefox 的 Tracking Prevention 不再拦截。
// 只 import 用到的子集（拉丁 / 简体中文），避免把日/韩/西里尔等 woff2 全打进 dist。
// 拉丁文走 Fraunces(展示衬线)/Inter(正文)；中文走 Noto Serif SC(衬线标题)/Noto Sans SC(正文)。
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/noto-serif-sc/chinese-simplified-400.css';
import '@fontsource/noto-serif-sc/chinese-simplified-600.css';
import '@fontsource/noto-sans-sc/chinese-simplified-400.css';
import '@fontsource/noto-sans-sc/chinese-simplified-600.css';
import './style.css';
import { api } from './api';
import { GalaxyView } from './galaxy';
import {
  CURATED_QUESTS,
  freeRoamQuest,
  loadProgress,
  recordVisit,
  recordQuestVisit,
  setQuestName,
  saveProgress,
  questUnderstanding,
  isQuestDone,
  evaluateAchievements,
  TYPE_ZH,
} from './quest';
import {
  toast,
  setGalaxyBadge,
  updateHud,
  rankOf,
  setQuestLabel,
  renderQuestHall,
  openEntityView,
  openQuestDone,
  renderAchievements,
  renderConstellation,
  disposeEntityEmblem,
  setHudSub,
  setHudNext,
  setOnboardTip,
  pulseFirstQuest,
} from './ui';
import { Sound } from './sound';
import type { EntityNode, Quest, StageInfo } from './types';

let nodes: EntityNode[] = [];
let galaxy: GalaxyView | null = null;
let progress = loadProgress();
let activeQuest: Quest = CURATED_QUESTS[0]; // 默认进入第一条主线（孔雀王朝），消灭"没闯关感"；自由漫游改由卡片切换
let frontier: string[] = []; // 当前推荐 frontier（星图高亮）
let nodeMap = new Map<string, EntityNode>();
let lastGid: string | null = null; // 上一站（用于生成"为什么从 A 到 B"的因果解说）
function nameOf(g: string): string {
  return nodeMap.get(g)?.n || g;
}

// HUD 大数字：闯关途中显示"当前主线的完成度"（每站明显跳动，成长感可见）；
// 自由漫游则显示全局理解度。段位(rank)始终按全局认知广度计算，与主线进度解耦。
function hudPct(): number {
  return activeQuest.id === 'free' ? progress.understanding : questUnderstanding(progress, activeQuest);
}

// §9.2 常驻「下一步建议」：把当前状态翻成一句可行动出口，让"离变聪明还差什么"始终可见。
function computeNextHint(): string {
  if (activeQuest.id === 'free') {
    const visN = Object.keys(progress.visited).length;
    if (frontier.length) return '下一步：沿星图高亮的「' + nameOf(frontier[0]) + '」继续探索';
    if (visN) return '下一步：随手点亮任意星辰，或开始一条主线更省心（见下方大厅）';
    return '下一步：点任意发光的星辰，开启你的第一站';
  }
  if (isQuestDone(progress, activeQuest)) {
    const next = CURATED_QUESTS.find((q) => q.id !== activeQuest.id && !isQuestDone(progress, q));
    return next
      ? '这条线已通关 ✅ 换条线继续？试试「' + next.title + '」'
      : '全部主线已通关 🏆 去「认知星座」给每趟命名留痕';
  }
  // 主线未通关：先指向下一个未点亮的命名节拍（含目标类型），再退到"还差几站"
  const path = progress.quests[activeQuest.id]?.path || [];
  const nextCp = activeQuest.checkpoints?.find((cp) => {
    const done = cp.requireGid
      ? path.includes(cp.requireGid)
      : cp.requireType
        ? path.some((g) => nodeMap.get(g)?.type === cp.requireType)
        : false;
    return !done;
  });
  if (nextCp) {
    if (nextCp.requireType)
      return '下一步：去点亮一个「' + (TYPE_ZH[nextCp.requireType] || nextCp.requireType) + '」类节点，完成「' + nextCp.name + '」节拍';
    if (nextCp.requireGid)
      return '下一步：回到「' + nameOf(nextCp.requireGid) + '」节点，点亮「' + nextCp.name + '」节拍';
    return '下一步：继续探索，点亮「' + nextCp.name + '」节拍';
  }
  const remain = Math.max(0, activeQuest.requiredVisits - path.length);
  return '节拍都已点亮 🎉 离通关还差 ' + remain + ' 站，沿星图高亮路线继续走';
}

// §9.1-C 防迷路锚：把"下一步建议"翻成具体目标 gid，交给星图做持续脉冲锚。
// 自由漫游→最优先推荐 frontier[0]；主线未通关→下一未点亮节拍的 requireGid 或该类型未点亮节点(前5)；已通关→无锚。
function computeTargets(): string[] {
  if (activeQuest.id === 'free') {
    return frontier.length ? [frontier[0]] : [];
  }
  if (isQuestDone(progress, activeQuest)) return [];
  const path = progress.quests[activeQuest.id]?.path || [];
  const nextCp = activeQuest.checkpoints?.find((cp) => {
    const done = cp.requireGid
      ? path.includes(cp.requireGid)
      : cp.requireType
        ? path.some((g) => nodeMap.get(g)?.type === cp.requireType)
        : false;
    return !done;
  });
  if (!nextCp) return [];
  if (nextCp.requireGid) return [nextCp.requireGid];
  if (nextCp.requireType) {
    return nodes
      .filter((n) => n.type === nextCp.requireType && !progress.visited[n.gid])
      .slice(0, 5)
      .map((n) => n.gid);
  }
  return [];
}

// §9.2 理解度具象化：HUD 副行显示"已点亮 N / M 颗星"，把百分比译成可感知的覆盖度
function renderHudStatus() {
  const visN = Object.keys(progress.visited).length;
  setHudSub('已点亮 <b>' + visN + '</b> / ' + nodes.length + ' 颗星');
  const hint = computeNextHint();
  const targets = computeTargets(); // §9.1-C 防迷路锚：把文字出口锚到星图具体位置
  galaxy?.setTarget(targets);
  setHudNext(targets.length ? '⚓ ' + hint : hint);
}

// §9.1-B 首屏引导：首次进入（无标记且未点亮任何节点）高亮首卡 + 气泡；点线或关闭后不再弹
const ONBOARD_KEY = 'he-onboard-v2';
function maybeShowOnboard() {
  try {
    if (localStorage.getItem(ONBOARD_KEY)) return;
  } catch {
    /* ignore */
  }
  if (Object.keys(progress.visited).length === 0) {
    setOnboardTip('第一次来？先点左下「玩法」按钮，再点第一条线「孔雀王朝的兴衰」，跟着高亮的星走就好。');
    pulseFirstQuest(true);
  } else {
    try {
      localStorage.setItem(ONBOARD_KEY, '1');
    } catch {
      /* ignore */
    }
  }
}
function dismissOnboard() {
  try {
    localStorage.setItem(ONBOARD_KEY, '1');
  } catch {
    /* ignore */
  }
  setOnboardTip(null);
  pulseFirstQuest(false);
}

async function boot() {
  const data = await api.entities();
  if (!data || !data.nodes.length) {
    const scene = document.getElementById('scene');
    const fb = document.getElementById('scene-fallback');
    if (scene) scene.style.display = 'none';
    if (fb) fb.style.display = 'block';
    setGalaxyBadge('○ 后端未连接', false);
    toast('无法连接后端：请确认后端已在 8001（或 8002）运行');
    return;
  }
  nodes = data.nodes;
  nodeMap = new Map(nodes.map((n) => [n.gid, n]));
  setGalaxyBadge('● 实时后端 · ' + nodes.length + ' 个真实节点', true);

  galaxy = new GalaxyView(document.getElementById('scene') as HTMLCanvasElement, nodes, {
    onSelect: (gid) => selectEntity(gid),
    onPickVoid: (info) => {
      const hint = document.getElementById('voidHint');
      if (!hint) return;
      const title = hint.querySelector('.vh-title') as HTMLElement | null;
      const body = hint.querySelector('.vh-body') as HTMLElement | null;
      if (title) {
        const T: Record<string, string> = {
          cluster: info.label,
          planet: info.label,
          star: '一颗由你开发的星辰',
          moon: '卫星 · 文明的侧面',
          blackhole: '认知黑洞 · 待考据',
          darkmatter: '暗物质 · 默会共识',
          debris: '草稿带 · 待整理',
        };
        title.textContent = T[info.kind] || '一颗由你开发的星辰';
      }
      if (body) {
        const B: Record<string, string> = {
          cluster: '这是用户开发的星域。完成构建后，它会汇聚成独立的星团。',
          planet: '这是一颗由用户开发的行星。完成构建后，它将承载一个完整的文明星域——你看到的表面纹路，正是待你雕琢的世界。',
          star: '这是一颗由你开发的星辰。完成构建后，它会成为新云团的一部分。',
          moon: '卫星绕行星运行，象征一个文明的子面、子证据或侧面视角——它依附于主体文明（行星）运转，却又自成一体，是主角之外的另一重切面。',
          blackhole: '黑洞表「失考 / 争议 / 尚无定论」的认知领域。它只表示「此处尚待考据」，绝不代表错误或失败——真相未明，正待你亲自探究。',
          darkmatter: '暗物质对应默会知识、潜规则与社会信任：看不见，却像引力一样托着整个文明结构。它不喧哗，却是让一切得以成立的底层。',
          debris: '碎片与草稿，是探索中零散、尚未归类的笔记与猜想。它们尚未成形，却诚实地标记着「还在路上」——进来好奇，本就该容纳未完成。',
        };
        body.textContent = B[info.kind] || '这是一颗由你开发的星辰。完成构建后，它会成为新云团的一部分。';
      }
      hint.classList.add('show');
    },
  });
  galaxy.setVisited(Object.keys(progress.visited));
  updateHud(hudPct(), rankOf(progress.understanding));
  renderHall();
  renderConstAndAch();
  wireSound();
  wireHudScroll();
  wireBack();
  wireVoidHint();
  wireCards();
  updateHudQuest(); // 默认主线已激活，HUD 立刻显示"主线·第 X/N 站"，强化闯关感
  renderHudStatus();
  maybeShowOnboard();
  const obX = document.getElementById('obX');
  if (obX) obX.addEventListener('click', dismissOnboard);
  wireCategoryDock(); // §26→A 首页分类说明：左下 5 按钮 → 全屏内容层「字儿渐进式」淡入对应面板（含分类浮标题已移除）
  wireHeroDismiss(); // §首页 slogan 上滑隐入星海：初始化展示，上滑/滚轮上/↑ 隐藏，下/滚轮下/↓ 恢复
  wireHudToggle();   // §A HUD 抽屉折叠（logo 常驻左上，状态条可收起）
}

// HUD 抽屉：右侧独立面板，只控制「理解度/已点亮/主线/下一步/音量」；左上 logo 完全独立不参与折叠；偏好记 localStorage
const HUD_COLLAPSE_KEY = 'he-hud-collapsed';
function wireHudToggle() {
  const panel = document.getElementById('hudPanel');
  const btn = document.getElementById('hudToggle');
  if (!panel || !btn) return;
  const apply = (expanded: boolean) => {
    panel.classList.toggle('expanded', expanded);
    panel.setAttribute('aria-hidden', expanded ? 'false' : 'true');
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };
  // 默认收起（界面干净）；仅当显式存过 '1'（曾展开）才默认展开
  let initial = false;
  try { initial = localStorage.getItem(HUD_COLLAPSE_KEY) === '1'; } catch { /* 默认收起 */ }
  apply(initial);
  btn.addEventListener('click', () => {
    const next = !panel.classList.contains('expanded');
    apply(next);
    try { localStorage.setItem(HUD_COLLAPSE_KEY, next ? '1' : '0'); } catch { /* 忽略 */ }
  });
}

// 首页分类说明（§26→A 全屏化）：左下 5 个分类按钮 → 透明全屏 overlay 上「字儿渐进式」错落淡入对应分类块；
// 沿用「最初 UI」原始多栏布局铺满全屏、超屏可上下滚；不暗化星图、不加框、去掉分类浮标题；
// 点 ×/空白处/再点同钮收起。内容取自原始落地页，未动数据/真值层。
let infoPanelOpen = false;
function panelCurrentPane(): string {
  const panel = document.getElementById('infoPanel');
  if (!panel) return '';
  const cur = panel.querySelector<HTMLElement>('.cat-pane:not([hidden])');
  return cur ? cur.getAttribute('data-pane') || '' : '';
}
function openCat(cat: string) {
  const panel = document.getElementById('infoPanel');
  if (!panel) return;
  panel.querySelectorAll<HTMLElement>('.cat-pane').forEach((p) => {
    const on = p.getAttribute('data-pane') === cat;
    p.hidden = !on;
    p.classList.remove('is-in');
    if (on) { void p.offsetWidth; p.classList.add('is-in'); } // 重新触发错落淡入
  });
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cat-open'); // 隐藏氛围标题，避免叠字
  infoPanelOpen = true;
  const dock = document.getElementById('catDock');
  if (dock) dock.querySelectorAll<HTMLElement>('.cat-btn').forEach((b) => {
    b.setAttribute('aria-pressed', b.getAttribute('data-cat') === cat ? 'true' : 'false');
  });
}
function closeInfoPanel() {
  const panel = document.getElementById('infoPanel');
  if (!panel) return;
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  panel.querySelectorAll<HTMLElement>('.cat-pane').forEach((p) => p.classList.remove('is-in'));
  document.body.classList.remove('cat-open');
  infoPanelOpen = false;
  const dock = document.getElementById('catDock');
  if (dock) dock.querySelectorAll<HTMLElement>('.cat-btn').forEach((b) => b.setAttribute('aria-pressed', 'false'));
}
function wireCategoryDock() {
  const dock = document.getElementById('catDock');
  const fab = document.getElementById('catFab');
  // 悬浮球菜单：展开 / 收起 5 个玻璃胶囊（iPhone 辅助触控同款——常驻小圆球，点开才浮出）
  const setMenu = (open: boolean) => {
    if (!dock || !fab) return;
    dock.classList.toggle('open', open);
    fab.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  if (fab) fab.addEventListener('click', (e) => {
    e.stopPropagation();
    setMenu(dock ? !dock.classList.contains('open') : true);
  });
  if (dock) {
    dock.querySelectorAll<HTMLElement>('.cat-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cat = btn.getAttribute('data-cat') || '';
        if (infoPanelOpen && panelCurrentPane() === cat) closeInfoPanel();
        else openCat(cat);
        setMenu(false); // 选完分类即收起菜单，浮球常驻
      });
    });
  }
  // 点菜单外任意处 → 收起浮球菜单（不影响已开的分类面板）
  document.addEventListener('click', (e: Event) => {
    const t = e.target as Node;
    if (dock && !dock.contains(t)) setMenu(false);
  });
  const panel = document.getElementById('infoPanel');
  if (panel) {
    const close = document.getElementById('ipClose');
    if (close) close.addEventListener('click', closeInfoPanel);
    // 点遮罩空白处（暗化星图区）即收起回全屏星图
    panel.addEventListener('click', (e: Event) => { if (e.target === panel) closeInfoPanel(); });
    // 面板内 data-open-cat 的 CTA 打开对应分类
    panel.querySelectorAll<HTMLElement>('[data-open-cat]').forEach((cta) => {
      cta.addEventListener('click', () => openCat(cta.getAttribute('data-open-cat') || ''));
    });
  }
}

// §首页 slogan 上滑隐入星海：初始化展示「进来好奇，离开更聪明」；
//   触发隐藏：滚轮向上（鼠标滚轮 / 笔记本触摸板双指上滑，滚轮 deltaY 200ms 内累加判定）/ 触摸上滑 / ↑ 键；
//   恢复：滚轮向下 / 触摸下滑 / ↓ 键。过渡柔和（淡出+上移+模糊），不抢星系拖拽。
function wireHeroDismiss() {
  const hero = document.querySelector<HTMLElement>('.landing-hero');
  if (!hero) return;
  let hidden = false;
  const set = (h: boolean) => {
    if (hidden === h) return;
    hidden = h;
    hero.classList.toggle('is-hidden', h);
  };
  // 滚轮：向上收起、向下恢复（与星系缩放并行，互不冲突）。
  // 兼容两类输入：鼠标滚轮单帧 deltaY 很大（直接触发）；笔记本触摸板双指上滑是多帧极小 deltaY，
  // 单帧常跨不过阈值，故按 200ms 窗口累加后判定，二者皆可触发"隐入星海"。
  let wAcc = 0, wTimer = 0;
  window.addEventListener('wheel', (e) => {
    wAcc += e.deltaY;
    clearTimeout(wTimer);
    wTimer = window.setTimeout(() => { wAcc = 0; }, 200);
    if (wAcc < -36) set(true);
    else if (wAcc > 60) set(false);
  }, { passive: true });
  // 触摸：上滑收起、下滑恢复
  let ty = 0;
  window.addEventListener('touchstart', (e) => { ty = e.touches[0]?.clientY ?? 0; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    const dy = ty - (e.changedTouches[0]?.clientY ?? ty);
    if (dy > 55) set(true);
    else if (dy < -55) set(false);
  }, { passive: true });
  // 键盘：↑ 收起 / ↓ 恢复（无障碍）
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') set(true);
    else if (e.key === 'ArrowDown') set(false);
  });
}

// 方案A·导航历史栈：[''=总览, gid...]，navPos 指向当前锚点。后退/前进在栈上移动。
let navStack: string[] = [''];
let navPos = 0;

function selectEntity(gid: string, chosenScore?: number, fromHistory = false) {
  const node = nodes.find((n) => n.gid === gid);
  if (!node) return;
  // 方案A：新导航入栈（截断前进分支）；历史回退由 fromHistory 标记跳过，避免重复入栈
  if (!fromHistory && navStack[navPos] !== gid) {
    navStack = navStack.slice(0, navPos + 1);
    navStack.push(gid);
    navPos = navStack.length - 1;
  }
  updateNavUI();
  const prev = lastGid && lastGid !== gid ? lastGid : null;
  const isNew = !progress.visited[gid];

  if (isNew) {
    recordVisit(progress, gid, node.truth, nodes.length);
    galaxy?.setVisited(Object.keys(progress.visited));
    updateHud(hudPct(), rankOf(progress.understanding));
  }
  if (activeQuest.id !== 'free') {
    const before = isQuestDone(progress, activeQuest);
    recordQuestVisit(progress, activeQuest.id, gid);
    if (!before && isQuestDone(progress, activeQuest)) {
      progress.quests[activeQuest.id].done = true;
      saveProgress(progress);
      toast('🏆 主线「' + activeQuest.title + '」通关！理解度已达标');
      galaxy?.celebrateConstellation(activeQuest.title); // M6：星座连线脉冲绽放 + 浮出主线名
      // 结算面板：回顾因果链 + AI 凝练收获 + 命名这趟星座
      openQuestDone(
        activeQuest,
        progress.quests[activeQuest.id].path,
        nameOf,
        (nm) => {
          setQuestName(progress, activeQuest.id, nm);
          galaxy?.showConstellationName(nm);
          toast('⭐ 你把这趟命名为「' + nm + '」，已留痕于认知星座墙');
          renderHall();
          renderConstAndAch();
        },
        progress.quests[activeQuest.id]?.gap,
        currentStageInfo()?.checkpoints,
        (smart) => {
          progress.quests[activeQuest.id] = progress.quests[activeQuest.id] || { path: [], done: false };
          progress.quests[activeQuest.id].smart = smart;
          saveProgress(progress);
        },
      );
    }
    renderHall();
    updateHud(hudPct(), rankOf(progress.understanding));
    updateHudQuest(); // 把"第 X/N 站"同步到 HUD 主线文案
    renderHudStatus(); // §9.2 主线通关/进度变化后，刷新"下一步建议"与"已点亮 N/M"
  }

  // 选择有后果（张力）：从推荐里选路时，按真实置信度给一句诚实反馈；
  // 弱关联(<0.5)记一次"边界拓荒者"，并提示"亲自去验证"——呼应 Article 0 逼近真相。
  // 直接点星图/引文跳转不传 chosenScore，走"自由探索"不弹此反馈，避免噪音。
  if (typeof chosenScore === 'number') {
    const pct = Math.round(chosenScore * 100);
    if (chosenScore < 0.5) {
      progress.weakPicks = (progress.weakPicks || 0) + 1;
      saveProgress(progress);
      toast('🧭 你选了一条较弱的关联（置信度 ' + pct + '%）· 这恰恰是探索的乐趣——亲自去验证它（Article 0：逼近真相）');
    }
  }

  // 成就结算（幂等；只在有新解锁时提示）
  const fresh = evaluateAchievements(progress);
  if (isNew || fresh.length) renderConstAndAch();
  for (const a of fresh) toast(a.icon + ' 解锁成就「' + a.name + '」· ' + a.desc);

  // E. 换站流畅：已开面板时不收起，原地刷新内容 + 淡入（运镜在背景星图持续进行）；
  // 仅首次打开走完整开启动画。避免 remove→add 的闪收顿挫（§9.1-E）。
  // 实际 swap 淡入检测在 ui.ts openEntityView 内（直接操作 entityView）。

  // C：点星"飞进"节点 —— 曲速俯冲 + 驱动 DOM 辉光遮罩；俯冲一结束立即收辉光（不等网络），
  // 避免后端慢时满屏白光挂住。实体面板在网络就绪后浮起覆盖。
  const fly = galaxy ? galaxy.flyInto(gid, setWarp) : Promise.resolve();
  fly.then(() => setWarp(0));
  const ready = api.related(gid);

  const neighbors = galaxy?.nearestNeighbors(gid, 6) || [];
  Promise.all([ready, fly]).then(([res]) => {
    const recs = (res?.recommendations || []).slice(0, 5);
    frontier = recs.map((r) => r.target_entity.global_id).filter(Boolean);
    galaxy?.setQuest(frontier);
    renderHudStatus(); // §9.2 frontier 刷新后，自由漫游的"下一步建议"同步更新
    if (isNew) galaxy?.spawnIgnition(gid); // M3：到达瞬间点火
    const stage = currentStageInfo();
    galaxy?.pause(); // 实体页打开：暂停后台 Three.js 渲染，避免与 cosmos 2D 争夺 GPU
    openEntityView(
      gid,
      node,
      recs,
      (next, sc) => selectEntity(next, sc),
      nameOf,
      prev,
      Object.keys(progress.visited),
      stage,
      progress.understanding, // Tier1-B：自由漫游时关卡条也要显示全局理解度
      // M4：AI 解说拿到置信度后，在 prev→cur 之间连一条发光因果光桥（累积成星座）
      (from, to, conf) => galaxy?.connectSegment(from, to, conf),
      (g) => nodeMap.get(g), // 供「3D 展厅」取相关节点的真实类型/真值层
      neighbors,
    );
  });

  lastGid = gid;
}

// 当前主线进度 → 关卡上下文（供实体页 evStage + PathRail 渲染）
function currentStageInfo(): StageInfo | undefined {
  if (activeQuest.id === 'free') return undefined;
  const path = progress.quests[activeQuest.id]?.path || [];
  // Tier1-C：把主线里命名好的"叙事节拍"按真实走过的 path 判定点亮状态
  const checkpoints = activeQuest.checkpoints?.map((cp) => {
    const done = cp.requireGid
      ? path.includes(cp.requireGid)
      : cp.requireType
        ? path.some((g) => nodeMap.get(g)?.type === cp.requireType)
        : false;
    return { name: cp.name, hint: cp.hint, done };
  });
  return {
    title: activeQuest.title,
    walked: path.length,
    required: activeQuest.requiredVisits,
    path,
    frontier,
    checkpoints,
    gap: progress.quests[activeQuest.id]?.gap,
  };
}

// M1：把"主线 · 第 X/N 站"写到 HUD 主线文案行（起航/每站都更新）
function updateHudQuest() {
  if (activeQuest.id === 'free') {
    setQuestLabel('自由漫游 · 随性点亮任何星辰');
    return;
  }
  const path = progress.quests[activeQuest.id]?.path || [];
  const walked = path.length;
  const done = isQuestDone(progress, activeQuest);
  const station = done ? activeQuest.requiredVisits : Math.max(1, walked + 1);
  setQuestLabel('主线 · ' + activeQuest.title + ' · 第 ' + station + '/' + activeQuest.requiredVisits + ' 站' + (done ? ' ✓ 已通关' : ''));
}

function renderHall() {
  const c = document.getElementById('questList');
  if (!c) return;
  const quests = [...CURATED_QUESTS, freeRoamQuest()];
  renderQuestHall(
    c,
    quests,
    progress,
    (q) => (q.id === 'free' ? progress.understanding : questUnderstanding(progress, q)),
    (q) => isQuestDone(progress, q),
    (q) => pickQuest(q),
  );
}

function renderConstAndAch() {
  const viz = document.getElementById('constViz');
  if (viz) renderConstellation(viz as HTMLElement, nodes, progress, (g) => selectEntity(g));
  const ach = document.getElementById('achRow');
  if (ach) renderAchievements(ach as HTMLElement, progress.achievements);
}

function pickQuest(q: Quest) {
  activeQuest = q;
  closeInfoPanel(); // 选线即收起说明面板，让星图全屏接管
  dismissOnboard(); // §9.1-B 一旦选线即关首屏引导，不再打扰
  // M1：被点中的任务卡轻弹起一下（视觉确认"这条线被激活"）
  const card = document.querySelector<HTMLElement>('.quest-card[data-qid="' + q.id + '"]');
  if (card) {
    card.classList.remove('picking');
    void card.offsetWidth; // 重启动画
    card.classList.add('picking');
    setTimeout(() => card.classList.remove('picking'), 650);
  }
  if (q.id === 'free') {
    frontier = [];
    galaxy?.setQuest([]);
    galaxy?.setVisited(Object.keys(progress.visited));
    toast('已切换为「自由漫游」：随手点亮任何星辰');
    updateHud(hudPct(), rankOf(progress.understanding));
    updateHudQuest();
    renderHudStatus();
    renderHall();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  // 主线：先让用户抛一个"这趟想搞清楚什么"的疑问（Gap 显式化，可选），再激活
  showGapPrompt(q);
}

// Gap 显式化：进主线前轻量收集一个疑问，让 Candidate 由用户生成而非仅后端给；
// 回扣到通关「认知回音壁」与探索中引导横幅。可跳过、可留空。
function showGapPrompt(q: Quest) {
  const ov = document.getElementById('gapPrompt');
  if (!ov) {
    activateQuest(q);
    return;
  }
  const input = ov.querySelector('.gap-input') as HTMLInputElement | null;
  if (input) input.value = progress.quests[q.id]?.gap || '';
  ov.classList.add('open');
  ov.setAttribute('aria-hidden', 'false');
  if (input) setTimeout(() => input.focus(), 60);
  const finish = (keep: boolean) => {
    ov.classList.remove('open');
    ov.setAttribute('aria-hidden', 'true');
    if (keep) {
      const txt = (input?.value || '').trim().slice(0, 60);
      if (txt) {
        progress.quests[q.id] = progress.quests[q.id] || { path: [], done: false };
        progress.quests[q.id].gap = txt;
        saveProgress(progress);
      }
    }
    activateQuest(q);
  };
  const go = ov.querySelector('.gap-go') as HTMLButtonElement | null;
  const skip = ov.querySelector('.gap-skip') as HTMLButtonElement | null;
  if (go) go.onclick = () => finish(true);
  if (skip) skip.onclick = () => finish(false);
  if (input) input.onkeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') finish(true);
  };
}

// 激活主线：以 seed 为起点向知识图谱请求确定性下一站（原 pickQuest 主线逻辑抽出）
function activateQuest(q: Quest) {
  frontier = q.seed ? [q.seed] : [];
  galaxy?.setQuest(frontier);
  galaxy?.setVisited(Object.keys(progress.visited));
  const g = progress.quests[q.id]?.gap;
  toast(g ? '带着你的疑问出发：「' + g + '」' : '主线「' + q.title + '」已激活 · 正在引出知识图谱路径…');
  updateHud(hudPct(), rankOf(progress.understanding));
  updateHudQuest();
  renderHudStatus();
  if (q.seed) {
    api.related(q.seed).then((res) => {
      const gids = (res?.recommendations || []).slice(0, 5).map((r) => r.target_entity.global_id).filter(Boolean);
      frontier = q.seed ? [q.seed, ...gids] : gids;
      galaxy?.setQuest(frontier);
      galaxy?.pulsePath(frontier); // M1：路径站点级联脉冲（信号沿电话线传过）
    });
    galaxy?.flyTo(q.seed); // M1：镜头从俯瞰缓缓推近首站
  }
  renderHall();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function wireSound() {
  const sb = document.getElementById('soundBtn');
  if (!sb) return;
  // 默认关闭（PO 2026-08-27）：不自动播放，仅用户主动点击开启；
  // 开关在用户手势内启用 AudioContext，满足浏览器自动播放策略。
  sb.textContent = '🔇';
  sb.title = '氛围音效（默认关，点此开启）';
  sb.addEventListener('click', () => {
    const on = !Sound.isEnabled();
    Sound.setEnabled(on);
    sb.textContent = on ? '🔊' : '🔇';
    sb.title = on ? '氛围音效（已开启，点此关闭）' : '氛围音效（默认关，点此开启）';
    toast(on ? '氛围音效已开启（实验）· 点火/光桥/通关会有声音' : '氛围音效已关闭');
  });
}

// 滚动后 HUD 加强毛玻璃 + 实底色 + 底边线，形成"锚点导航"感（Nav 滚动毛玻璃）。
// 首屏 hero 区 HUD 透明渐隐，向下滚过后变实，符合"滚动后毛玻璃"的视觉预期。
function wireHudScroll() {
  const brand = document.querySelector<HTMLElement>('.hud-brand');
  const panel = document.getElementById('hudPanel');
  if (!brand && !panel) return;
  const onScroll = () => {
    const scrolled = window.scrollY > 40;
    if (brand) brand.classList.toggle('scrolled', scrolled);
    if (panel) panel.classList.toggle('scrolled', scrolled);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// 方案A·导航历史：根据栈目标回退/前进（''=总览，关闭面板拉回；否则以历史模式重新进入该星）
function navigateHistory(target: string) {
  if (target === '') {
    const ev = document.getElementById('entityView');
    if (ev) {
      ev.classList.remove('open');
      ev.setAttribute('aria-hidden', 'true');
    }
    disposeEntityEmblem(); // 释放实体页 3D 徽标的 WebGL 上下文
    galaxy?.flyOut(); // C：从俯冲终点拉回星图总览，恢复可自由探索 / 自转
    galaxy?.resume(); // 回到星图：恢复后台渲染
  } else {
    selectEntity(target, undefined, true); // 历史回退：不重复入栈
  }
  updateNavUI();
}

// 方案A·导航按钮置灰：栈底(总览)时"后退"失效；栈顶时"前进"失效
function updateNavUI() {
  const bp = document.getElementById('evBack') as HTMLButtonElement | null;
  const fw = document.getElementById('evFwd') as HTMLButtonElement | null;
  if (bp) bp.disabled = navPos <= 0;
  if (fw) fw.disabled = navPos >= navStack.length - 1;
}

function wireBack() {
  const back = document.getElementById('evBack');
  if (back)
    back.addEventListener('click', () => {
      if (navPos > 0) {
        navPos -= 1;
        navigateHistory(navStack[navPos]);
      }
    });
  const fwd = document.getElementById('evFwd');
  if (fwd)
    fwd.addEventListener('click', () => {
      if (navPos < navStack.length - 1) {
        navPos += 1;
        navigateHistory(navStack[navPos]);
      }
    });
  updateNavUI();
}

// 空域提示条（未开放星云 / 用户开发的星辰）：关闭 + 返回总览
function wireVoidHint() {
  const hint = document.getElementById('voidHint');
  if (!hint) return;
  const hide = () => hint.classList.remove('show');
  hint.querySelector('.vh-close')?.addEventListener('click', hide);
  hint.querySelector('.vh-back')?.addEventListener('click', () => {
    hide();
    galaxy?.flyOut(); // 拉回星图总览，恢复自由探索
  });
}

// C：驱动曲速辉光遮罩（#warp）透明度，0=无、1=满屏辉光。
function setWarp(k: number) {
  const w = document.getElementById('warp');
  if (w) w.style.opacity = String(Math.max(0, Math.min(1, k)));
}

// 四类探索对象（主题展馆 / 实体图谱 / 探索包 / 因果对象）是真实入口，
// 各自接对应动作，不再只是"滚到主线大厅"的空壳。
function wireCards() {
  const actions: Record<string, () => void> = {
    // 主题展馆 → 激活第一条主线（孔雀王朝），并把视野拉回星图看高亮路径
    quest: () => {
      closeInfoPanel();
      pickQuest(CURATED_QUESTS[0]);
    },
    // 实体图谱 → 直接打开「当前激活主线」的种子节点，看到实体页 + 关系网络
    // §9.1-A：随 activeQuest.seed 走，探索卡不脱离当前线（自由漫游回落到首条线 seed）
    graph: () => {
      closeInfoPanel();
      const g = activeQuest.seed || CURATED_QUESTS[0].seed;
      if (g) selectEntity(g);
    },
    // 探索包 → 切到自由漫游，从星图随手点亮
    roam: () => {
      closeInfoPanel();
      pickQuest(freeRoamQuest());
    },
    // 因果对象 → 打开「当前激活主线」种子节点，实体页顶部 AI 区块正好答"为什么"
    // §9.1-A：同上，随 activeQuest.seed 走
    cause: () => {
      closeInfoPanel();
      const g = activeQuest.seed || CURATED_QUESTS[2].seed || CURATED_QUESTS[0].seed;
      if (g) selectEntity(g);
    },
  };
  document.querySelectorAll<HTMLElement>('[data-go]').forEach((card) => {
    const go = card.getAttribute('data-go') || '';
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const fn = actions[go];
      if (fn) fn();
      else {
        const q = document.getElementById('quest');
        if (q) q.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

boot();
