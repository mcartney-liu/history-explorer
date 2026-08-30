import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { EntityNode } from './types';
import { Sound } from './sound';

export const TYPE_COLOR: Record<string, string> = {
  Civilization: '#e8b04b',
  Person: '#ff6b4a',
  Location: '#5fd38a',
  Religion: '#b98cff',
  Event: '#6fa8dc',
  Idea: '#f2c14e',
  'Time Period': '#cfe0ff',
  Technology: '#4fd1e5',
};

// 真值层 → 点火色（M3）。verified=暖金、debated=琥珀微颤、pending=冷蓝。
// 动效本身成了真值语言：争议节点用琥珀而非炫光粉饰，守住 Article 0 不伪装定论。
export const TRUTH_COLOR: Record<string, string> = {
  verified: '#ffe08a',
  debated: '#e8b04b',
  pending: '#6fa8dc',
};
// M7：hover 任一带出"研究状态"微说明（文字，守无障碍：不靠颜色单编码）
const TRUTH_STATUS: Record<string, string> = {
  verified: '研究状态 · 已确证（高可信）',
  debated: '研究状态 · 有争议（主流观点并存）',
  pending: '研究状态 · 待核实（线索尚弱）',
};

export interface GalaxyOpts {
  onSelect: (gid: string) => void;
  onHover?: (gid: string | null) => void;
  // 点中"未开放星云 / 背景星辰 / 行星"等无实体空域：飞过去后由 UI 弹"用户开发"提示
  onPickVoid?: (info: { kind: 'cluster' | 'star' | 'planet' | 'moon' | 'blackhole' | 'darkmatter' | 'debris'; label: string }) => void;
}

export class GalaxyView {
  private canvas: HTMLCanvasElement;
  private nodes: EntityNode[];
  private opts: GalaxyOpts;
  private questGids = new Set<string>();
  private visitedGids = new Set<string>();
  private targetGids = new Set<string>(); // §9.1-C 防迷路锚：下一站具体目标节点（持续脉冲，区别于普通主线站）

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: any;
  private composer!: any;
  private group!: THREE.Group;
  private starField!: THREE.Group; // 远景星空容器（缓慢反向自转，制造宇宙纵深感）
  private mesh!: THREE.InstancedMesh;
  private haloMesh!: THREE.InstancedMesh;
  private hitMesh!: THREE.InstancedMesh; // 隐形命中球：放大实体星辰可点区，避免「差一点就点到暗物质」
  private nebulae: any[] = [];
  private lockedClusters: any[] = []; // 未开放星云：未来宇宙区域预告占位（文学/数学/经济/科技/艺术）
  private lockedPick: { obj: THREE.Object3D; name: string }[] = []; // 未开放星云可点核心+标签 → 名称
  private extraPick: { obj: THREE.Object3D; kind: 'moon' | 'blackhole' | 'darkmatter' | 'debris'; label: string }[] = []; // 文明映射天体可点体 → 类型语义
  private starPoints: THREE.Points[] = []; // 背景星辰（可点飞向，白色=可探索空域）
  private planets: { mesh: THREE.Mesh; label: THREE.Sprite; name: string; grp: THREE.Group; baseY: number }[] = []; // 可点行星：带程序化表面纹路
  private mainCurve!: THREE.CatmullRomCurve3;
  private flows: THREE.Mesh[] = [];
  private dummy = new THREE.Object3D();
  private pts: THREE.Vector3[] = [];
  private baseColor: THREE.Color[] = [];
  private baseScale: number[] = [];
  private hovered = -1;
  private reduce = false;
  private disposed = false;
  private flying = false; // 运镜中：暂停自转 + 让 flyTo 接管相机
  private flashIndex = -1; // M3 点火闪光：正在提亮的实例下标
  private flashUntil = 0;
  private ignitions: { pts: THREE.Points; vel: THREE.Vector3[]; born: number }[] = [];
  private rings: { ring: THREE.Mesh; born: number }[] = [];
  private gidToIndex = new Map<string, number>();
  private positions = new Map<string, THREE.Vector3>(); // gid → 组内局部坐标（供光桥/星座连线取点）
  private constGroup!: THREE.Group; // 认知星座：所有因果光桥片段的容器
  private constSegs: { mesh: THREE.Mesh; target: number; born: number; curve?: THREE.QuadraticBezierCurve3; flow?: THREE.Mesh; flowTail?: THREE.Mesh }[] = [];
  private drawnPairs = new Set<string>(); // 去重：同一对节点只画一次
  private celebrateUntil = 0; // M6 通关脉冲窗口
  private celebrateName = ''; // M6 通关浮出的星座名（玩家命名或主线名）
  private nameSprite: THREE.Sprite | null = null;
  private nameSpriteBorn = 0;
  private truthOf: string[] = []; // 每节点真值层（M7）
  private truthPhase: number[] = []; // 每节点真值动效相位（M7）
  private haloBase: number[] = []; // 每节点 halo 基准缩放（M7）
  private pathPulses: { idx: number; at: number; until: number }[] = []; // M1 起航级联脉冲窗口

  // ---- 视觉增强（A/B/C/D 四组）字段 ----
  private focusIdx = -1; // A组：选中聚焦态的节点下标（-1=无）
  private focusRing!: THREE.Mesh; // A组：选中节点的脉冲聚焦环
  private starDim = 1; // A组：背景星点压暗系数（聚光感），1=正常，聚焦时→0.32
  private starDimTarget = 1;
  private bloomPass!: any; // C组：曲速时临时提亮辉光
  private warpK = 0; // C组：flyInto 进度，驱动星场拉伸（虫洞感）
  private milkyWay!: THREE.Group; // D组：银河带
  private backdrop!: THREE.Group; // 宇宙纵深·远景星系群
  private backdropGalaxies: { disk: THREE.Points; core: THREE.Sprite; baseOp: number }[] = [];
  private dust!: THREE.Points; // D组：相机视差漂浮尘埃

  // ---- 文明映射·新增天体（§3/§9 本体论对照）字段 ----
  private moons: { pivot: THREE.Group; speed: number; tilt: number }[] = []; // 卫星：绕行星转，对应文明的子面/子证据/侧面
  private blackHoles: { disk: THREE.Mesh; photon: THREE.Mesh; label: THREE.Sprite }[] = []; // 黑洞：失考/争议/未定论区
  private darkMatter: { halo: THREE.Points; bridge: THREE.LineSegments; label: THREE.Sprite }[] = []; // 暗物质：包裹全星图的晕 + 连接远景星系的宇宙网纤维
  private debris: { mesh: THREE.Mesh; vel: THREE.Vector3; spin: THREE.Vector3 }[] = []; // 碎片/彗星：草稿/待整理

  constructor(canvas: HTMLCanvasElement, nodes: EntityNode[], opts: GalaxyOpts) {
    this.canvas = canvas;
    this.nodes = nodes;
    this.opts = opts;
    this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.init();
  }

  private init() {
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070d, 0.02);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 1, 3500);
    this.camera = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = !this.reduce;
    controls.autoRotateSpeed = 0.45;
    controls.minPolarAngle = Math.PI * 0.28;
    controls.maxPolarAngle = Math.PI * 0.72;
    controls.target.set(0, 0, 0);
    controls.enabled = false;
    this.controls = controls;

    // 移动端：落星图区的触摸本会被 OrbitControls 吃掉 → 页面滚不动。
    // coarse pointer(触屏) 下关掉旋转/缩放，并把 canvas 交还给浏览器纵向滚动(pan-y)，
    // 让星图在手机上退为装饰背景、拖拽让位翻页。桌面(mouse)不受影响。
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (coarse) {
      controls.enableRotate = false;
      controls.enableZoom = false;
      controls.enablePan = false;
      this.canvas.style.touchAction = 'pan-y';
    }

    const group = new THREE.Group();
    scene.add(group);
    this.group = group;

    // 认知星座容器：随星图一起自转，光桥用组内局部坐标绘制
    this.constGroup = new THREE.Group();
    this.group.add(this.constGroup);

    // 体积星云（加色混合 sprite）
    const makeNebula = (rgba: string, size: number, pos: THREE.Vector3, op: number) => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      const g = cv.getContext('2d')!;
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, rgba);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(cv),
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
          opacity: op,
        }),
      );
      sp.scale.set(size, size, 1);
      sp.position.copy(pos);
      sp.userData.baseOp = op;
      return sp;
    };
    this.nebulae = [
      makeNebula('rgba(255,107,74,0.44)', 52, new THREE.Vector3(-16, 7, 5), 0.44),
      makeNebula('rgba(79,209,229,0.40)', 44, new THREE.Vector3(17, -9, -7), 0.4),
      makeNebula('rgba(232,176,75,0.34)', 38, new THREE.Vector3(3, 13, -15), 0.34),
      makeNebula('rgba(150,90,220,0.32)', 42, new THREE.Vector3(-7, -13, 11), 0.32),
    ];
    this.nebulae.forEach((n) => scene.add(n));

    this.buildNodes();

    // 远景星空：两层 —— 底层密布微星(暗) + 稀疏亮星(带色、更大)；整体缓慢反向自转制造宇宙纵深感，
    // 让"宇宙感"更足（原 1800 颗单色微星太弱，不仔细看以为空）。
    const starGroup = new THREE.Group();
    const makeStars = (count: number, rMin: number, rMax: number, size: number, color: number, op: number) => {
      const sg = new THREE.BufferGeometry();
      const sp = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const r = rMin + Math.random() * (rMax - rMin);
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        sp[i * 3] = r * Math.sin(ph) * Math.cos(th);
        sp[i * 3 + 1] = r * Math.cos(ph);
        sp[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      }
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      const pm = new THREE.PointsMaterial({ color, size, sizeAttenuation: true, transparent: true, opacity: op, depthWrite: false });
      (pm as any).userData = { baseOp: op }; // A组·聚光压暗用：记录基准不透明度
      return new THREE.Points(sg, pm);
    };
    // 背景星辰统一冷白（0xeef2ff）：白色 = 可点飞向、但无实体的"用户开发空域"
    const pushStars = (pts: THREE.Points) => {
      starGroup.add(pts);
      this.starPoints.push(pts);
      return pts;
    };
    // 背景星整体向外推：最内层也明显落在未开放星云(r=36)之外，宇宙更辽阔、留白更多
    pushStars(makeStars(6000, 58, 140, 0.2, 0xeef2ff, 0.95)); // 底噪微星（加密提亮，宇宙漫游感）
    pushStars(makeStars(360, 62, 132, 0.52, 0xeef2ff, 0.92)); // 亮星
    pushStars(makeStars(300, 62, 132, 0.44, 0xeef2ff, 0.85)); // 亮星
    // 中景星（fog:false 保证清晰）：拖动时擦肩而过，强化"宇宙漫游"纵深感（内边界远离星云）
    const midA = makeStars(480, 52, 96, 0.7, 0xeef2ff, 0.9);
    (midA.material as THREE.PointsMaterial).fog = false;
    pushStars(midA);
    const midB = makeStars(400, 52, 96, 0.6, 0xeef2ff, 0.85);
    (midB.material as THREE.PointsMaterial).fog = false;
    pushStars(midB);
    scene.add(starGroup);
    this.starField = starGroup;

    // 未开放星云（未来宇宙区域预告占位）：低饱和灰冷发光核 + 稀疏暗星 + "未开放·XX" 发光标签。
    // 纯视觉占位、不参与交互；fog:false 保证远处清晰，色调刻意压暗以区别于当前亮暖色历史星云。
    const lockedDefs = [
      { label: '未开放 · 文学', color: 'rgba(150,170,210,0.30)', star: 0x9fb4d8 },
      { label: '未开放 · 数学', color: 'rgba(140,200,210,0.28)', star: 0x8fd0ff },
      { label: '未开放 · 经济', color: 'rgba(210,180,140,0.28)', star: 0xffe7b0 },
      { label: '未开放 · 科技', color: 'rgba(170,150,220,0.28)', star: 0xb6a6ff },
      { label: '未开放 · 艺术', color: 'rgba(220,160,190,0.28)', star: 0xffb0d0 },
    ];
    const LR = 36;
    this.lockedClusters = [];
    lockedDefs.forEach((d, i) => {
      const a = (i / lockedDefs.length) * Math.PI * 2 + 0.5;
      const baseY = Math.sin(i * 1.7) * 12;
      const pos = new THREE.Vector3(Math.cos(a) * LR, baseY, Math.sin(a) * LR);
      const grp = new THREE.Group();
      grp.position.copy(pos);
      const core = makeNebula(d.color, 26, new THREE.Vector3(0, 0, 0), 0.5);
      (core.material as THREE.SpriteMaterial).fog = false;
      grp.add(core);
      const cs = makeStars(150, 3, 9, 0.34, d.star, 0.5);
      (cs.material as THREE.PointsMaterial).fog = false;
      grp.add(cs);
      const lab = this.makeLockedLabel(d.label);
      lab.position.set(0, 7.5, 0);
      grp.add(lab);
      scene.add(grp);
      this.lockedClusters.push({ grp, core, stars: cs, lab, ph: i * 1.3, baseY });
      // 发光核 + 标签均可点：点中飞向该星云并提示"用户开发"
      this.lockedPick.push({ obj: core, name: d.label });
      this.lockedPick.push({ obj: lab, name: d.label });
    });

    // 行星：散布在认知星座(半径17)与未开放星云(半径36)之间的中型天体，表面带程序化纹路
    // （气态条带 / 冰蓝漩涡 / 岩石坑洞 / 类地大陆），缓慢自转让纹路转起来。可点飞向但无实体内容
    // （用户开发的空域），飞近能看清表面纹路，强化"宇宙感"。
    // 行星用 Standard 材质，需要光照才能显出球面立体感；这里只加定向光+环境光，不影响 Basic 材质的历史节点。
    scene.add(new THREE.AmbientLight(0x44506a, 1.15));
    const planetKey = new THREE.DirectionalLight(0xfff2e0, 1.5);
    planetKey.position.set(6, 4, 8);
    scene.add(planetKey);
    const planetRim = new THREE.DirectionalLight(0x7fa8ff, 0.55);
    planetRim.position.set(-7, -3, -8);
    scene.add(planetRim);
    // 行星散布在半径 ~50 的稀疏球壳上（明显在未开放星云 r=36 之外，宇宙更辽阔、彼此间距更大）
    const planetDefs = [
      { name: '待开发行星 · 苍炎', style: 'gas', radius: 3.4, c1: '#b98a52', c2: '#e9d2a4', pos: new THREE.Vector3(40, 12, 28), ring: true },
      { name: '待开发行星 · 寒渊', style: 'ice', radius: 2.8, c1: '#426aa8', c2: '#bcd6f4', pos: new THREE.Vector3(-36, -10, 32) },
      { name: '待开发行星 · 赤砾', style: 'rock', radius: 2.4, c1: '#a85736', c2: '#dca078', pos: new THREE.Vector3(30, -18, -40) },
      { name: '待开发行星 · 碧渊', style: 'terra', radius: 3.0, c1: '#2f6f9c', c2: '#5fae7c', pos: new THREE.Vector3(-32, 20, -36) },
      { name: '待开发行星 · 流金', style: 'gas', radius: 2.6, c1: '#bd9a36', c2: '#f0d98a', pos: new THREE.Vector3(8, -24, 48), ring: true },
    ];
    this.planets = [];
    planetDefs.forEach((d, i) => {
      const tex = this.makePlanetTexture(d.style, d.c1, d.c2);
      const geo = new THREE.SphereGeometry(d.radius, 48, 32);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: d.style === 'gas' ? 0.62 : 0.95,
        metalness: 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const grp = new THREE.Group();
      grp.position.copy(d.pos);
      grp.add(mesh);
      // B组·行星大气 fresnel 辉光（岩石行星不加，避免灰扑扑）：边缘临边增亮，真实大气感
      if (d.style !== 'rock') {
        grp.add(this.makeAtmosphere(d.radius * 1.18, d.c2));
      }
      // 土星式行星环：挂在 grp 上保持倾角，不随球体自转（真实感）
      if (d.ring) {
        const ring = this.makePlanetRing(d.radius, d.c1, d.c2);
        grp.add(ring);
      }
      const label = this.makeLockedLabel(d.name);
      label.position.set(0, d.radius + 1.8, 0);
      grp.add(label);
      scene.add(grp);
      this.planets.push({ mesh, label, name: d.name, grp, baseY: d.pos.y });
    });

    // 文明映射·新增天体（§3/§9，纯前端、零依赖）：卫星/黑洞/暗物质/碎片
    this.makeMoons();
    this.makeBlackHoles();
    this.makeDarkMatter();
    this.makeDebris();

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.9, 0.7, 0.2));
    this.composer = composer;
    this.bloomPass = (composer as any).passes[1]; // C组：曲速时临时提亮辉光

    // A组·选中聚焦环：脉冲圆环，定位到选中节点的世界坐标、每帧 lookAt 相机
    const ringGeo = new THREE.RingGeometry(1.5, 1.85, 56);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.focusRing = new THREE.Mesh(ringGeo, ringMat);
    this.focusRing.visible = false;
    scene.add(this.focusRing);

    // D组·银河带：扁平星盘（边缘看呈带状），缓慢自转，给宇宙一条横贯天幕的暗带（半径推到外圈，不挤中心）
    const mwGroup = new THREE.Group();
    const mwN = 2600;
    const mwPos = new Float32Array(mwN * 3);
    for (let i = 0; i < mwN; i++) {
      const r = 90 + Math.random() * 82;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() * 2 - 1) * (3 + 7 * (1 - (r - 90) / 82));
      mwPos[i * 3] = Math.cos(a) * r;
      mwPos[i * 3 + 1] = y;
      mwPos[i * 3 + 2] = Math.sin(a) * r;
    }
    const mwGeo = new THREE.BufferGeometry();
    mwGeo.setAttribute('position', new THREE.Float32BufferAttribute(mwPos, 3));
    const mw = new THREE.Points(mwGeo, new THREE.PointsMaterial({ color: 0xbcd0ff, size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0.5, depthWrite: false }));
    (mw.material as THREE.PointsMaterial).fog = false;
    mwGroup.add(mw);
    mwGroup.rotation.x = 0.5;
    mwGroup.rotation.z = 0.25;
    scene.add(mwGroup);
    this.milkyWay = mwGroup;

    // D组·漂浮尘埃：世界空间大范围稀疏远尘（不锁相机）。缩放/旋转时随场景真实掠过，无面罩感。
    const dustN = 900;
    const dustPos = new Float32Array(dustN * 3);
    for (let i = 0; i < dustN; i++) {
      // 球壳内随机分布（半径 22~72），覆盖相机可达范围又不挤中心；y 稍压扁更像尘埃盘
      const r = 22 + Math.random() * 50;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 2 - 1);
      dustPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      dustPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.55;
      dustPos[i * 3 + 2] = r * Math.cos(ph);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3));
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xdbe4ff, size: 0.11, sizeAttenuation: true, transparent: true, opacity: 0.32, depthWrite: false }));
    (this.dust.material as THREE.PointsMaterial).fog = false;
    scene.add(this.dust);

    this.makeBackdropGalaxies();

    this.bindInteraction();
    this.animate();
  }

  // 宇宙纵深·远景星系群：缩到最远时，黑色虚空里散布大量其他星系，营造真实宇宙的深邃感。
  // 纯装饰层（不交互、不宣称科学模型）。每个星系 = 带旋臂感的扁盘星点 + 核球光晕 sprite；远景、很淡，缩近随距离淡出。
  private makeBackdropGalaxies() {
    const g = new THREE.Group();
    const palettes = [0xbcd0ff, 0xffe6b0, 0xffc8e0, 0xb0f0e0, 0xd8c0ff, 0xe8eefc];
    const COUNT = 60;
    for (let k = 0; k < COUNT; k++) {
      const col = new THREE.Color(palettes[(Math.random() * palettes.length) | 0]);
      // 远处球壳分布 半径 300~1050，避开本星图(中心球~50、银河带~170)
      const r = 900 + Math.random() * 1700;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 2 - 1);
      const center = new THREE.Vector3(
        r * Math.sin(ph) * Math.cos(th),
        r * Math.sin(ph) * Math.sin(th) * 0.6,
        r * Math.cos(ph),
      );
      const maxR = 14 + Math.random() * 16;
      const arms = 2 + ((Math.random() * 3) | 0);
      const N = 90 + ((Math.random() * 80) | 0);
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const rr = Math.sqrt(Math.random()) * maxR;
        const ang = (i / N) * Math.PI * 2 * arms + rr * 0.5 + Math.random() * 0.4;
        pos[i * 3] = Math.cos(ang) * rr;
        pos[i * 3 + 1] = (Math.random() * 2 - 1) * 0.22 * maxR;
        pos[i * 3 + 2] = Math.sin(ang) * rr;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const baseOp = 0.38 + Math.random() * 0.26;
      const mat = new THREE.PointsMaterial({ color: col, size: 0.95, sizeAttenuation: true, transparent: true, opacity: baseOp, depthWrite: false });
      (mat as any).fog = false;
      const disk = new THREE.Points(geo, mat);
      disk.position.copy(center);
      disk.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      // 核球光晕
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const cx = cv.getContext('2d')!;
      const grd = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,0.9)');
      grd.addColorStop(0.4, `rgba(${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0},0.5)`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = grd;
      cx.fillRect(0, 0, 64, 64);
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: baseOp * 1.4 }));
      const cs = maxR * 0.95;
      core.scale.set(cs, cs, 1);
      core.position.copy(center);
      (core.material as any).fog = false;
      g.add(disk);
      g.add(core);
      this.backdropGalaxies.push({ disk, core, baseOp });
    }
    this.scene.add(g);
    this.backdrop = g;
  }

  // ===== 文明映射·新增天体（§3/§9 本体论对照，纯前端、零依赖） =====

  // 卫星 Moon：绕行星转的小球，对应文明的「子面 / 子证据 / 侧面」（文档 P2）。
  // 嵌在行星 grp 内跟随浮动；尺寸小、依附主体，不独立成 Truth。
  private makeMoons() {
    const moonDefs = [
      { planet: 0, count: 2, r: 5.4, size: 0.52 },
      { planet: 1, count: 1, r: 4.8, size: 0.44 },
      { planet: 3, count: 2, r: 5.2, size: 0.48 },
      { planet: 4, count: 1, r: 4.4, size: 0.4 },
    ];
    for (const md of moonDefs) {
      const planet = this.planets[md.planet];
      if (!planet) continue;
      for (let j = 0; j < md.count; j++) {
        const a = (j / md.count) * Math.PI * 2;
        const pivot = new THREE.Group();
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(md.size, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0x9aa3b2, roughness: 0.9, metalness: 0 }),
        );
        mesh.position.set(Math.cos(a) * md.r, Math.sin(a) * md.r * 0.28, Math.sin(a) * md.r);
        pivot.add(mesh);
        pivot.rotation.x = (Math.random() - 0.5) * 0.5;
        pivot.rotation.z = (Math.random() - 0.5) * 0.5;
        planet.grp.add(pivot);
        this.moons.push({ pivot, speed: 0.004 + Math.random() * 0.004, tilt: 0 });
        this.extraPick.push({ obj: mesh, kind: 'moon', label: '卫星' });
      }
    }
  }

  // 黑洞：失考 / 争议 / 尚无定论的「认知黑洞区」（文档 P4）。
  // ⚠️ 红线：仅表「未知 / 未定论」，绝不暗示「错误 / 失败」。暗球 + 极淡吸积盘微光 + 标签说明。
  private makeBlackHoles() {
    const defs = [
      new THREE.Vector3(115, 35, -60),
      new THREE.Vector3(-100, -42, 78),
      new THREE.Vector3(48, -62, 118),
    ];
    for (const pos of defs) {
      const grp = new THREE.Group();
      grp.position.copy(pos);

      // 事件视界：纯黑 Void（无光、无大气，区别于星球）
      const hole = new THREE.Mesh(
        new THREE.SphereGeometry(3, 48, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000 }),
      );
      grp.add(hole);

      // 吸积盘：明亮、有厚度，近侧视椭圆盘；depthTest=false 让盘背侧透镜弧"绕到"黑球顶上（Interstellar 漏斗轮廓）
      const diskTex = this.makeAccretionTexture();
      const disk = new THREE.Mesh(
        new THREE.RingGeometry(3.4, 7.6, 96, 1),
        new THREE.MeshBasicMaterial({ map: diskTex, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }),
      );
      disk.rotation.x = Math.PI / 2 - 0.34; // 近侧视，露出椭圆盘 + 顶部透镜弧
      disk.renderOrder = 4;
      grp.add(disk);

      // 光子环：贴着 Void 边缘的亮环（billboard 面向相机 → 呈圆形亮轮廓，是"黑洞"识别关键）
      const photon = new THREE.Mesh(
        new THREE.RingGeometry(3.04, 3.34, 72),
        new THREE.MeshBasicMaterial({ color: 0xfff1d6, transparent: true, opacity: 0.92, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      photon.renderOrder = 5;
      grp.add(photon);

      const label = this.makeLockedLabel('认知黑洞 · 待考据');
      label.position.set(0, 9.5, 0);
      grp.add(label);
      this.scene.add(grp);
      this.blackHoles.push({ disk, photon, label });
      this.extraPick.push({ obj: hole, kind: 'blackhole', label: '认知黑洞' });
      this.extraPick.push({ obj: disk, kind: 'blackhole', label: '认知黑洞' });
    }
  }

  // 吸积盘径向渐变贴图：内缘炽白 → 橙 → 外缘暗红消散（RingGeometry UV 为径向映射）
  private makeAccretionTexture(): THREE.CanvasTexture {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d')!;
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0.0, 'rgba(255,200,140,0)');
    grd.addColorStop(0.42, 'rgba(255,246,222,0.95)'); // 内缘炽白
    grd.addColorStop(0.56, 'rgba(255,168,86,0.82)'); // 橙
    grd.addColorStop(0.8, 'rgba(196,78,38,0.34)'); // 暗红
    grd.addColorStop(1.0, 'rgba(120,30,20,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(cv);
  }

  // 暗物质：默会知识 / 潜规则 / 社会信任（文档 §9.2 #2）。
  // 不可直见，但宇宙学里它以「宇宙网（cosmic web）」纤维结构托着一切——视觉上给一个具体可辨的发光纤维网格，
  // 而非无形雾。纤维 = 看不见却真实存在的结构；中心极淡晕 = 暗物质晕。
  // 暗物质：默会知识 / 潜规则 / 社会信任（文档 §9.2 #2）。
  // 物理上暗物质以「包裹星系的巨大晕 + 连接星系的宇宙网纤维」托着一切——星系本就长在暗物质骨架上。
  // 视觉上：① 半透明紫色点壳罩住整个星图（半径~185，包住银河带 90~170）；② 几缕向外辐射的纤维，连向远景星系方向。
  // 从「3 个内部小团」改为「包裹整图的隐形骨架」，既物理正确、又把拥挤的内部让出来。
  private makeDarkMatter() {
    const grp = new THREE.Group();

    // (a) 包裹晕：半透明紫色点壳，略扁呼应盘结构
    const haloN = 560; // 降密度：稀疏星雾包裹，不抢戏
    const haloPos = new Float32Array(haloN * 3);
    for (let i = 0; i < haloN; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const rr = 175 + (Math.random() * 2 - 1) * 24; // 略外扩、变薄壳，包裹更松
      const s = Math.sqrt(1 - u * u);
      haloPos[i * 3] = rr * s * Math.cos(th);
      haloPos[i * 3 + 1] = rr * u * 0.82;
      haloPos[i * 3 + 2] = rr * s * Math.sin(th);
    }
    const haloGeo = new THREE.BufferGeometry();
    haloGeo.setAttribute('position', new THREE.Float32BufferAttribute(haloPos, 3));
    const halo = new THREE.Points(
      haloGeo,
      new THREE.PointsMaterial({ color: 0x9a78ff, size: 2.1, sizeAttenuation: true, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    (halo.material as THREE.PointsMaterial).fog = false;
    grp.add(halo);

    // (b) 桥接纤维：从星图边缘向外辐射、连向远景星系方向的宇宙网丝缕
    const bridgeVerts: number[] = [];
    const spokes = 7;
    for (let k = 0; k < spokes; k++) {
      const base = new THREE.Vector3(
        Math.cos((k / spokes) * Math.PI * 2) * 150,
        (Math.random() * 2 - 1) * 30,
        Math.sin((k / spokes) * Math.PI * 2) * 150,
      );
      const far = base.clone().multiplyScalar(2.15); // 拉到 ~320 远处，指向深空星系
      const mid = base.clone().lerp(far, 0.5).add(new THREE.Vector3((Math.random() * 2 - 1) * 30, (Math.random() * 2 - 1) * 30, (Math.random() * 2 - 1) * 30));
      bridgeVerts.push(base.x, base.y, base.z, mid.x, mid.y, mid.z);
      bridgeVerts.push(mid.x, mid.y, mid.z, far.x, far.y, far.z);
    }
    const bridgeGeo = new THREE.BufferGeometry();
    bridgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(bridgeVerts, 3));
    const bridge = new THREE.LineSegments(
      bridgeGeo,
      new THREE.LineBasicMaterial({ color: 0x6a4cc0, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    (bridge.material as THREE.LineBasicMaterial).fog = false;
    grp.add(bridge);

    // 拾取代理：透明大球，点中晕区任意处即弹"暗物质·默会共识"说明
    // 注意：必须 DoubleSide——相机平时在球内(视距<196)，FrontSide 会剔除背面导致从内打不中、点不动
    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(200, 16, 12), // 包住暗物质晕主体(175±24≈199)，缩到 200 不再侵占星辰之间的空隙，降低误触
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    );
    grp.add(pick);

    const label = this.makeLockedLabel('暗物质 · 默会共识');
    label.position.set(0, 150, 0); // 置于星图外壳上方、正常视角可见处（原 208 会出画面上沿）
    (label.material as THREE.SpriteMaterial).depthTest = false; // 不被壳/星点遮挡，常显可读
    label.scale.multiplyScalar(1.9); // 远处放大，便于辨识
    grp.add(label);
    this.scene.add(grp);
    this.darkMatter.push({ halo, bridge, label });
    this.extraPick.push({ obj: pick, kind: 'darkmatter', label: '暗物质' });
    this.extraPick.push({ obj: label, kind: 'darkmatter', label: '暗物质' });
  }

  // 碎片 / 彗星 / 矮行星：草稿、待整理笔记、零散碎片（文档 P3）。
  // 小、不规则、低速游移；给「未完成」一个诚实位置，呼应「进来好奇」。
  private makeDebris() {
    const N = 26;
    for (let i = 0; i < N; i++) {
      const r = 26 + Math.random() * 56;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 2 - 1);
      const pos = new THREE.Vector3(
        r * Math.sin(ph) * Math.cos(th),
        r * Math.sin(ph) * Math.sin(th) * 0.7,
        r * Math.cos(ph),
      );
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.35 + Math.random() * 0.5, 0),
        new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.07 + Math.random() * 0.05, 0.25, 0.42 + Math.random() * 0.15), roughness: 1, metalness: 0, flatShading: true }),
      );
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.debris.push({
        mesh,
        vel: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.004),
        spin: new THREE.Vector3(Math.random() * 0.01, Math.random() * 0.01, Math.random() * 0.01),
      });
      this.extraPick.push({ obj: mesh, kind: 'debris', label: '草稿带' });
    }
    const lab = this.makeLockedLabel('草稿带 · 待整理');
    lab.position.set(0, -58, 0);
    this.scene.add(lab);
  }

  private buildNodes() {
    if (this.mesh) {
      this.group.remove(this.mesh);
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }
    if (this.haloMesh) {
      this.group.remove(this.haloMesh);
      this.haloMesh.geometry.dispose();
      (this.haloMesh.material as THREE.Material).dispose();
    }
    if (this.hitMesh) {
      this.group.remove(this.hitMesh);
      this.hitMesh.geometry.dispose();
      (this.hitMesh.material as THREE.Material).dispose();
    }
    this.pts = [];
    this.baseColor = [];
    this.baseScale = [];
    this.gidToIndex = new Map(this.nodes.map((n, i) => [n.gid, i]));
    this.truthOf = this.nodes.map((n) => (n.truth as string) || 'verified');
    this.truthPhase = this.nodes.map(() => Math.random() * Math.PI * 2);
    const N = this.nodes.length;
    const arms = 4;
    const radius = 17;
    const spread = 2.4;
    for (let i = 0; i < N; i++) {
      const arm = i % arms;
      const t = i / N;
      const ang = arm * (Math.PI * 2 / arms) + t * Math.PI * 5;
      const r = t * radius + (Math.random() - 0.5) * spread;
      this.pts.push(new THREE.Vector3(Math.cos(ang) * r, (Math.random() - 0.5) * spread * 0.5, Math.sin(ang) * r));
      this.positions.set(this.nodes[i].gid, this.pts[i].clone());
    }
    const geo = new THREE.SphereGeometry(0.22, 12, 12);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
    for (let i = 0; i < N; i++) this.mesh.setMatrixAt(i, new THREE.Matrix4());
    this.group.add(this.mesh);

    const haloGeo = new THREE.SphereGeometry(0.42, 12, 12);
    this.haloMesh = new THREE.InstancedMesh(
      haloGeo,
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }),
      N,
    );
    this.group.add(this.haloMesh);

    // 隐形命中球：每颗实体星辰包一个完全透明的放大球（半径 1.8，可见核心球仅 0.22），
    // 让「点星辰附近」即可命中；位置/缩放在 applyState 与 mesh 同步。raycaster 命中此球拿 instanceId。
    const HIT_R = 1.8;
    this.hitMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(HIT_R, 8, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      N,
    );
    for (let i = 0; i < N; i++) this.hitMesh.setMatrixAt(i, new THREE.Matrix4());
    this.group.add(this.hitMesh);

    // 主线高亮 + 能量流光
    const idxs = [0, Math.floor(N * 0.25), Math.floor(N * 0.5), Math.floor(N * 0.75), N - 1].filter((i) => this.pts[i]);
    this.mainCurve = new THREE.CatmullRomCurve3(idxs.map((i) => this.pts[i]));
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(this.mainCurve, 80, 0.05, 6, false),
      new THREE.MeshBasicMaterial({ color: 0xff6b4a, transparent: true, opacity: 0.85 }),
    );
    this.group.add(tube);
    this.flows.forEach((f) => this.group.remove(f));
    this.flows = [];
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), new THREE.MeshBasicMaterial({ color: 0x9ff0ff }));
      this.group.add(m);
      this.flows.push(m);
    }

    this.applyState();
  }

  // 依据 任务路径 / 已访问 重新着色与缩放
  private applyState() {
    const N = this.nodes.length;
    for (let i = 0; i < N; i++) {
      const node = this.nodes[i];
      const gid = node.gid;
      const inQuest = this.questGids.has(gid);
      const visited = this.visitedGids.has(gid);
      const isTarget = this.targetGids.has(gid);
      const base = new THREE.Color(TYPE_COLOR[node.type] || '#9fb4d8');
      let scale = 0.7 + Math.random() * 0.5;
      let col = base.clone();
      if (visited) {
        scale = 1.25;
        col = base.clone().lerp(new THREE.Color(0xffe08a), 0.5); // 点亮成暖金
      } else if (isTarget) {
        // §9.1-C 防迷路锚：下一站目标 = 全场最亮最金、scale 最大，一眼可辨
        scale = 2.0;
        col = new THREE.Color(0xffe08a).lerp(base, 0.28);
      } else if (inQuest) {
        scale = 1.4;
        col = base.clone().lerp(new THREE.Color(0xffffff), 0.35);
      } else {
        col = base.clone().multiplyScalar(0.52); // 非主线变暗（整体压暗一档，让星图更透气）
      }
      this.baseScale[i] = scale;
      this.baseColor[i] = col;
      this.haloBase[i] = scale * 1.4; // halo 比核心大一圈（M7 真值动效基准），1.9→1.4 收一档让星图更透气
      this.dummy.position.copy(this.pts[i]);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, col);
      this.haloMesh.setMatrixAt(i, this.dummy.matrix);
      this.hitMesh.setMatrixAt(i, this.dummy.matrix); // 命中球与可见球同位置/同缩放，固定放大半径
      // M7：halo 色 = 真值层（verified=金辉 / pending=冷蓝 / debated=琥珀），让"动效即真值语言"始终可见
      this.haloMesh.setColorAt(i, new THREE.Color(TRUTH_COLOR[(this.nodes[i].truth as string)] || '#4fd1e5'));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.hitMesh.instanceMatrix.needsUpdate = true;
    this.haloMesh.instanceMatrix.needsUpdate = true;
    if (this.haloMesh.instanceColor) this.haloMesh.instanceColor.needsUpdate = true;
  }

  setQuest(gids: string[]) {
    this.questGids = new Set(gids);
    this.applyState();
  }

  // §9.1-C 防迷路锚：把"下一步建议"算出的具体目标节点交给星图，做持续脉冲标记，
  // 让 HUD 的文字出口与星图里的具体位置闭合（target 叠加在 quest/visited 之上，互不覆盖）。
  setTarget(gids: string[]) {
    this.targetGids = new Set(gids);
    this.applyState();
  }

  setVisited(gids: string[]) {
    this.visitedGids = new Set(gids);
    this.applyState();
  }

  private bindInteraction() {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const hoverCard = document.getElementById('hoverCard');
    const hcThumb = document.getElementById('hcThumb');
    const hcName = document.getElementById('hcName');
    const hcCat = document.getElementById('hcCat');

    const pick = (ev: PointerEvent): number => {
      const r = this.renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(pointer, this.camera);
      const hit = raycaster.intersectObject(this.hitMesh);
      return hit.length ? (hit[0].instanceId as number) : -1;
    };

    // 未开放星云：射线命中可点核心/标签 → 返回其世界坐标与名称
    const pickLocked = (ev: PointerEvent): { name: string; pos: THREE.Vector3 } | null => {
      const r = this.renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(pointer, this.camera);
      const objs = this.lockedPick.map((p) => p.obj);
      const hits = raycaster.intersectObjects(objs, false);
      if (!hits.length) return null;
      const hit = hits[0];
      const name = this.lockedPick.find((p) => p.obj === hit.object)?.name || '';
      const pos = new THREE.Vector3();
      hit.object.getWorldPosition(pos);
      return { name, pos };
    };

    // 背景星辰：射线命中任意微星 → 返回其世界坐标（白色空域，可飞向但不能进入）
    const pickStar = (ev: PointerEvent): THREE.Vector3 | null => {
      const r = this.renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(pointer, this.camera);
      if (raycaster.params.Points) raycaster.params.Points.threshold = 1.6; // 放宽命中半径，便于点中细小星点
      let best: { d: number; p: THREE.Vector3 } | null = null;
      for (const pts of this.starPoints) {
        const hits = raycaster.intersectObject(pts, false);
        if (hits.length) {
          const d = hits[0].distance;
          if (!best || d < best.d) best = { d, p: (hits[0].point as THREE.Vector3).clone() };
        }
      }
      return best ? best.p : null;
    };

    // 行星：射线命中任意行星球体或其标签 → 返回其世界坐标与名称（可飞向但不能进入，用户开发空域）
    const pickPlanet = (ev: PointerEvent): { name: string; pos: THREE.Vector3 } | null => {
      const r = this.renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(pointer, this.camera);
      const objs: THREE.Object3D[] = [];
      this.planets.forEach((p) => {
        objs.push(p.mesh);
        objs.push(p.label);
      });
      const hits = raycaster.intersectObjects(objs, false);
      if (!hits.length) return null;
      const hit = hits[0];
      const entry = this.planets.find((p) => p.mesh === hit.object || p.label === hit.object);
      if (!entry) return null;
      const pos = new THREE.Vector3();
      entry.mesh.getWorldPosition(pos);
      return { name: entry.name, pos };
    };

    // 卫星/黑洞/暗物质/碎片：射线命中任一可点体 → 返回类型与世界坐标（文明映射语义，点中弹说明）
    const pickExtra = (ev: PointerEvent): { kind: 'moon' | 'blackhole' | 'darkmatter' | 'debris'; label: string; pos: THREE.Vector3 } | null => {
      const r = this.renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(pointer, this.camera);
      const objs = this.extraPick.filter((p) => p.kind !== 'darkmatter').map((p) => p.obj);
      const hits = raycaster.intersectObjects(objs, false);
      if (!hits.length) return null;
      const hit = hits[0];
      const entry = this.extraPick.find((p) => p.obj === hit.object);
      if (!entry) return null;
      const pos = new THREE.Vector3();
      hit.object.getWorldPosition(pos);
      return { kind: entry.kind, label: entry.label, pos };
    };

    // 暗物质：包裹全星系的底层共识层，拾取优先级最低——仅在点中星图真实空域/间隙、前方无任何实体星与背景星时才触发，
    // 避免抢实体星点击；且点击只弹说明卡、不飞向中心（proxy 球心在原点=星云中心，飞过去会"跳到中心"）
    const pickDarkMatter = (ev: PointerEvent): { kind: 'darkmatter'; label: string } | null => {
      const r = this.renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(pointer, this.camera);
      const objs = this.extraPick.filter((p) => p.kind === 'darkmatter').map((p) => p.obj);
      const hits = raycaster.intersectObjects(objs, false);
      if (!hits.length) return null;
      return { kind: 'darkmatter', label: '暗物质' };
    };

    const setHover = (id: number) => {
      if (id === this.hovered) return;
      if (this.hovered >= 0) {
        this.dummy.position.copy(this.pts[this.hovered]);
        this.dummy.scale.setScalar(this.baseScale[this.hovered]);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(this.hovered, this.dummy.matrix);
        this.mesh.setColorAt(this.hovered, this.baseColor[this.hovered]);
      }
      this.hovered = id;
      if (this.hovered >= 0) {
        this.dummy.position.copy(this.pts[this.hovered]);
        this.dummy.scale.setScalar(this.baseScale[this.hovered] * 2.3);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(this.hovered, this.dummy.matrix);
        this.mesh.setColorAt(this.hovered, this.baseColor[this.hovered].clone().lerp(new THREE.Color(0xffffff), 0.55));
        this.controls.autoRotate = false;
        const node = this.nodes[this.hovered];
        if (hcThumb) hcThumb.textContent = this.emojiFor(node.type);
        if (hcName) hcName.textContent = node.n;
        if (hcCat) hcCat.textContent = node.zhType || node.type;
        const hcTruth = document.getElementById('hcTruth');
        if (hcTruth) {
          hcTruth.textContent = TRUTH_STATUS[(node.truth as string)] || '';
          hcTruth.className = 'hc-truth ' + ((node.truth as string) || 'verified');
        }
        if (hoverCard) hoverCard.classList.add('show');
        this.opts.onHover?.(node.gid);
      } else {
        this.controls.autoRotate = !this.reduce;
        const hcTruth = document.getElementById('hcTruth');
        if (hcTruth) {
          hcTruth.textContent = '';
          hcTruth.className = 'hc-truth';
        }
        if (hoverCard) hoverCard.classList.remove('show');
        this.opts.onHover?.(null);
      }
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    };

    this.renderer.domElement.addEventListener('pointermove', (e) => {
      setHover(pick(e));
      // 未悬停实体时：悬停行星 / 未开放星云则显示手型光标
      if (this.hovered < 0) {
        const locked = pickLocked(e);
        const planet = locked ? null : pickPlanet(e);
        const extra = locked || planet ? null : (pickExtra(e) || pickDarkMatter(e));
        this.canvas.style.cursor = locked || planet || extra ? 'pointer' : 'grab';
      } else this.canvas.style.cursor = 'pointer';
    });
    this.renderer.domElement.addEventListener('pointerleave', () => setHover(-1));

    let downX = 0;
    let downY = 0;
    let downT = 0;
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
      downT = Date.now();
    });
    this.renderer.domElement.addEventListener('pointerup', (e) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6 && Date.now() - downT < 500) {
        const id = pick(e);
        if (id >= 0) {
          this.rippleAt(this.nodes[id].gid); // C组：点击引力涟漪
          this.opts.onSelect(this.nodes[id].gid);
          return;
        }
        // 行星：飞过去 + 提示（用户开发的空域，表面纹路待构建）
        const pl = pickPlanet(e);
        if (pl) {
          this.flyNear(pl.pos).then(() => this.opts.onPickVoid?.({ kind: 'planet', label: pl.name }));
          return;
        }
        // 未开放星云：飞过去 + 提示（用户开发的未来星团）
        const lc = pickLocked(e);
        if (lc) {
          this.flyNear(lc.pos).then(() => this.opts.onPickVoid?.({ kind: 'cluster', label: lc.name }));
          return;
        }
        // 卫星/黑洞/碎片：文明映射天体，飞过去 + 弹说明（暗物质优先级最低，放最后单独处理）
        const ex = pickExtra(e);
        if (ex) {
          this.flyNear(ex.pos).then(() => this.opts.onPickVoid?.({ kind: ex.kind, label: ex.label }));
          return;
        }
        // 背景星辰：飞过去 + 提示（用户开发的空域）
        const sp = pickStar(e);
        if (sp) {
          this.flyNear(sp).then(() => this.opts.onPickVoid?.({ kind: 'star', label: '星辰' }));
          return;
        }
        // 暗物质：仅在点中星图真实空域/间隙、前方无任何实体星与背景星时触发；且只弹说明卡、不飞向中心
        // （proxy 球心在原点=星云中心，飞过去会变成"跳到星云中心"，与用户预期不符）
        const dm = pickDarkMatter(e);
        if (dm) {
          this.opts.onPickVoid?.({ kind: 'darkmatter', label: '暗物质' });
          return;
        }
      }
    });

    // 滚轮 / 两指捏合缩放星图（不缩放浏览器）：
    // - 普通鼠标滚轮、触控板双指捏合(ctrl+wheel)、触控板双指上下滚 一律改缩放星图；
    // - 触屏：双指 touchmove 缩放星图，单指仍交给 OrbitControls 旋转 / pan-y 翻页。
    // enableZoom=false，缩放交给自定义 dollyBy；面板自身滚动容器在覆盖层内、不经过 canvas 监听，故普通滚轮不会误拦页面。
    const canvas = this.renderer.domElement;
    canvas.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        // 普通滚轮与 ctrl+滚轮(触控板捏合)统一缩放星图；面板自身滚动在其覆盖层内，不经过 canvas 监听，互不影响
        e.preventDefault(); // 抑制浏览器"页面缩放"
        if (this.flying) return;
        this.dollyBy(Math.exp(e.deltaY * 0.0015));
      },
      { passive: false },
    );
    let pinchDist = 0;
    canvas.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        if (e.touches.length === 2) pinchDist = touchDist(e);
      },
      { passive: true },
    );
    canvas.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        if (e.touches.length === 2) {
          e.preventDefault(); // 双指：缩放星图而非页面
          if (this.flying) return;
          const d = touchDist(e);
          if (pinchDist > 0) this.dollyBy(pinchDist / d);
          pinchDist = d;
        }
      },
      { passive: false },
    );
  }

  // 捏合缩放：沿视线方向拉近/推远相机，clamp 在 [7,190]；运镜中(flying)不响应，避免与 flyTo 抢相机。
  private dollyBy(f: number) {
    const dir = this.camera.position.clone().sub(this.controls.target);
    let d = dir.length() * f;
    d = Math.max(7, Math.min(480, d));
    dir.setLength(d);
    this.camera.position.copy(this.controls.target).add(dir);
    this.controls.update();
  }

  private emojiFor(type: string): string {
    const m: Record<string, string> = {
      Civilization: '🏛️',
      Person: '🧭',
      Location: '📍',
      Religion: '🛐',
      Event: '📜',
      Idea: '💡',
      'Time Period': '⏳',
      Technology: '⚙️',
    };
    return m[type] || '✦';
  }

  private animate() {
    if (this.disposed) return;
    requestAnimationFrame(() => this.animate());
    const el = performance.now() / 1000;
    this.nebulae.forEach((n, i) => {
      n.material.rotation += 0.0006;
      const base = n.userData.baseOp || 0.45;
      n.material.opacity = base * (0.75 + 0.25 * Math.sin(el * 0.5 + i));
    });
    this.lockedClusters.forEach((c) => {
      c.core.material.rotation += 0.0004;
      const pulse = 0.7 + 0.3 * Math.sin(el * 0.4 + c.ph);
      (c.core.material as THREE.SpriteMaterial).opacity = 0.5 * pulse;
      (c.stars.material as THREE.PointsMaterial).opacity = 0.5 * (0.55 + 0.45 * Math.sin(el * 0.4 + c.ph));
      c.grp.position.y = c.baseY + Math.sin(el * 0.2 + c.ph) * 1.2;
      c.grp.rotation.y += 0.0004;
    });
    this.planets.forEach((p, i) => {
      p.mesh.rotation.y += 0.0016; // 自转让表面纹路转动
      p.grp.position.y = p.baseY + Math.sin(el * 0.15 + i) * 0.5; // 轻微上下浮，融入宇宙
    });
    this.flows.forEach((m, i) => {
      const t = (el * 0.09 + i / this.flows.length) % 1;
      this.mainCurve.getPoint(t, m.position);
    });
    if (this.flying) {
      // 运镜中：自转与 controls 都让位给 flyTo 的逐帧插值（见 flyTo）
    } else {
      this.group.rotation.y += 0.0006;
      if (this.starField) this.starField.rotation.y -= 0.00018; // 远景星空缓慢反向自转，制造宇宙纵深感
      if (!this.controls.enabled && !this.reduce) {
        // 入场运镜
        const camStart = new THREE.Vector3(0, 46, 135);
        const camEnd = new THREE.Vector3(0, 4, 26);
        const k = Math.min(1, (el % 100) / 2.8);
        const e = 1 - Math.pow(1 - k, 3);
        this.camera.position.lerpVectors(camStart, camEnd, e);
        this.camera.lookAt(0, 0, 0);
        if (k >= 1) {
          this.controls.enabled = true;
          this.controls.autoRotate = !this.reduce;
        }
      } else {
        this.controls.update();
      }
    }

    this.updateEffects();
    if (this.hovered >= 0) {
      const tmp = this.pts[this.hovered].clone().project(this.camera);
      const hc = document.getElementById('hoverCard');
      if (hc) {
        hc.style.left = (tmp.x * 0.5 + 0.5) * innerWidth + 'px';
        hc.style.top = (-tmp.y * 0.5 + 0.5) * innerHeight + 'px';
      }
    }
    this.composer.render();
  }

  // M4/M6：在 prev→cur 之间画一条发光因果光桥；这些片段持续累积，即自然形成「认知星座」(M6)。
  // 强度/颜色按 AI 解说置信度：high=暖金强、medium=冷蓝、low=暗蓝。尊重真值层纪律，不粉饰弱因果。
  connectSegment(fromGid: string, toGid: string, conf: string) {
    const a = this.positions.get(fromGid);
    const b = this.positions.get(toGid);
    if (!a || !b) return;
    const key = [fromGid, toGid].sort().join('|');
    if (this.drawnPairs.has(key)) return; // 同对只画一次
    this.drawnPairs.add(key);
    const confK = (conf || 'medium').toLowerCase();
    const colorHex = confK === 'high' ? '#ffe08a' : confK === 'low' ? '#5a78a8' : '#6fa8dc';
    const radius = confK === 'high' ? 0.06 : confK === 'low' ? 0.03 : 0.045;
    const target = confK === 'high' ? 0.95 : confK === 'low' ? 0.4 : 0.62;
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 1.5 + a.distanceTo(b) * 0.12, 0));
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const geo = new THREE.TubeGeometry(curve, 24, radius, 6, false);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    this.constGroup.add(mesh);
    // 流光球：沿曲线跑的发光粒子，让因果桥有"能量流动"方向感（星座流光连线）
    const flowGeo = new THREE.SphereGeometry(radius * 1.7, 10, 10);
    const flowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flow = new THREE.Mesh(flowGeo, flowMat);
    this.constGroup.add(flow);
    // A组增强：彗星拖尾（半尺寸、相位滞后），让"能量流动"更有方向感
    const tailMat = flowMat.clone();
    (tailMat as THREE.MeshBasicMaterial).opacity = 0;
    const flowTail = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.1, 8, 8), tailMat);
    this.constGroup.add(flowTail);
    this.constSegs.push({ mesh, target, born: performance.now(), curve, flow, flowTail });
    Sound.play(confK === 'high' ? 'bridge-high' : confK === 'low' ? 'bridge-low' : 'bridge-mid');
  }

  // M6：主线通关瞬间，让整片星座线脉冲绽放一下，确认「你连出了一张图」。
  celebrateConstellation(name?: string) {
    this.celebrateName = name || '';
    this.celebrateUntil = performance.now() + 1800;
    Sound.play('celebrate');
  }

  // M6：通关后让星座名浮出（玩家命名或主线名），作为"你连出了一张图"的署名
  showConstellationName(name: string) {
    this.celebrateName = name;
    this.celebrateUntil = performance.now() + 2600;
  }

  // M1 起航（选主线）：整条路径的站点级联脉冲 —— 像信号沿电话线传过，
  // 每个站点依次轻弹亮一下（130ms 间隔），把"这条线被激活了"可视化。reduced-motion 下不脉冲。
  pulsePath(gids: string[]) {
    if (this.reduce) return;
    const now = performance.now();
    gids.forEach((g, i) => {
      const idx = this.gidToIndex.get(g);
      if (idx == null) return;
      this.pathPulses.push({ idx, at: now + i * 130, until: now + i * 130 + 520 });
    });
  }

  // A组：设定/清除选中聚焦态。打开实体面板时调用 setFocus(gid) → 脉冲环 + 背景星点压暗（聚光感）；
  // 关闭/返回总览时 setFocus(null) 复位。reduced-motion 下环为静态、不压暗。
  setFocus(gid: string | null) {
    if (gid == null) {
      this.focusIdx = -1;
      this.focusRing.visible = false;
      this.starDimTarget = 1;
      return;
    }
    const i = this.gidToIndex.get(gid);
    if (i == null) return;
    this.focusIdx = i;
    this.focusRing.visible = true;
    this.starDimTarget = this.reduce ? 1 : 0.32;
  }

  // C组：在节点处激起一圈冲击波涟漪（点击反馈），复用既有 rings 扩张/淡出机制
  private rippleAt(gid: string) {
    if (this.reduce) return;
    const i = this.gidToIndex.get(gid);
    if (i == null) return;
    const geo = new THREE.RingGeometry(1.1, 1.4, 40);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.copy(this.pts[i]);
    ring.lookAt(this.camera.position);
    this.group.add(ring);
    this.rings.push({ ring, born: performance.now() });
  }


  dispose() {
    this.disposed = true;
  }

  // ---- 动态效果：M2 航行 + M3 点火 ----------------------------------------

  // M2：镜头沿二次贝塞尔弧，从当前位置滑向目标节点并框住它（约 1.1s）。
  // 运镜期间暂停自转，避免节点世界坐标漂移导致目标失准。
  flyTo(gid: string): Promise<void> {
    const i = this.gidToIndex.get(gid);
    if (i == null || this.reduce) return Promise.resolve();
    this.flying = true;
    this.controls.enabled = false;
    this.controls.autoRotate = false;

    const nodeWorld = this.pts[i]
      .clone()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endTarget = nodeWorld.clone();
    const outward = nodeWorld.clone().normalize();
    const endPos = nodeWorld.clone().add(outward.multiplyScalar(12)).add(new THREE.Vector3(0, 3, 0));
    const mid = startPos.clone().lerp(endPos, 0.5).add(new THREE.Vector3(0, 10, 0)); // 弧顶抬高
    const dur = 1100;
    const t0 = performance.now();

    return new Promise((resolve) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / dur);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // easeInOutCubic
        const p = quadBezier(startPos, mid, endPos, e);
        this.camera.position.copy(p);
        this.controls.target.lerpVectors(startTarget, endTarget, e);
        this.camera.lookAt(this.controls.target);
        if (k < 1) requestAnimationFrame(step);
        else {
          this.flying = false;
          if (!this.reduce) {
            this.controls.enabled = true;
            this.controls.autoRotate = true;
          }
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  // C：曲速俯冲进节点 —— 点星后相机沿加速弧线冲向目标星辰，FOV 随速度张开制造"曲速"感，
  // onProgress(k) 驱动 DOM 曲速遮罩（白色辉光 + 放射拖尾）强度。抵达瞬间满屏辉光，随后实体面板浮起覆盖。
  // 与既有 2D 面板 / 3D 展厅不冲突：它只是"进入实体"之前的过渡动画。reduced-motion 下降级为快速淡闪。
  flyInto(gid: string, onProgress?: (k: number) => void): Promise<void> {
    const i = this.gidToIndex.get(gid);
    if (i == null) return Promise.resolve();
    if (this.reduce) {
      // 降级：不运镜，仅 ~420ms 一次辉光脉冲，避免动态眩晕
      const t0 = performance.now();
      const dur = 420;
      return new Promise((resolve) => {
        const step = () => {
          const k = Math.min(1, (performance.now() - t0) / dur);
          onProgress?.(Math.sin(k * Math.PI)); // 0→1→0
          if (k < 1) requestAnimationFrame(step);
          else {
            onProgress?.(0);
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    }
    this.flying = true;
    this.controls.enabled = false;
    this.controls.autoRotate = false;
    this.setFocus(gid); // A组：进入实体即聚焦该节点（脉冲环 + 聚光压暗）

    const nodeWorld = this.pts[i]
      .clone()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endTarget = nodeWorld.clone();
    // 终点：贴近节点正前方一点（"飞进"而非"框住"）
    const toNode = nodeWorld.clone().sub(startPos);
    const dir = toNode.clone().normalize();
    const endPos = nodeWorld.clone().add(dir.multiplyScalar(-1.6)).add(new THREE.Vector3(0, 0.6, 0));
    // 弧线中点：抬高 + 略外扩，形成俯冲弧
    const mid = startPos
      .clone()
      .lerp(endPos, 0.5)
      .add(new THREE.Vector3(0, 9, 0))
      .add(dir.clone().multiplyScalar(2));
    const baseFov = this.camera.fov;
    const maxFov = 96;
    const dur = 1500;
    const t0 = performance.now();

    return new Promise((resolve) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / dur);
        const e = k * k * k; // easeInCubic：越接近越快（曲速感）
        const p = quadBezier(startPos, mid, endPos, e);
        this.camera.position.copy(p);
        this.controls.target.lerpVectors(startTarget, endTarget, e);
        this.camera.lookAt(this.controls.target);
        this.camera.fov = baseFov + (maxFov - baseFov) * e;
        this.camera.updateProjectionMatrix();
        this.warpK = e; // C组·虫洞星流：驱动背景星场拉伸
        if (!this.reduce) this.bloomPass.strength = 0.9 + e * 0.7; // C组·曲速时提亮辉光
        onProgress?.(e);
        if (k < 1) requestAnimationFrame(step);
        else {
          this.camera.fov = baseFov;
          this.camera.updateProjectionMatrix();
          this.warpK = 0;
          this.bloomPass.strength = 0.9;
          this.flying = false;
          this.controls.enabled = true; // 保留 enabled，避免 animate 把入场运镜重放
          this.controls.autoRotate = false;
          onProgress?.(1);
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  // C：从俯冲终点拉回总览，返回星图后可继续自由探索 / 自转。
  flyOut(): Promise<void> {
    this.setFocus(null); // A组：返回总览清除聚焦态
    if (this.reduce) {
      this.controls.enabled = true;
      this.controls.autoRotate = !this.reduce;
      return Promise.resolve();
    }
    this.flying = true;
    this.controls.enabled = false;
    this.controls.autoRotate = false;
    this.warpK = 0;
    this.bloomPass.strength = 0.9;
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endPos = new THREE.Vector3(0, 4, 26);
    const endTarget = new THREE.Vector3(0, 0, 0);
    const dur = 950;
    const t0 = performance.now();
    return new Promise((resolve) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / dur);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // easeInOutCubic
        this.camera.position.lerpVectors(startPos, endPos, e);
        this.controls.target.lerpVectors(startTarget, endTarget, e);
        this.camera.lookAt(this.controls.target);
        if (k < 1) requestAnimationFrame(step);
        else {
          this.flying = false;
          this.controls.enabled = true;
          this.controls.autoRotate = !this.reduce;
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  // 飞向任意世界坐标（未开放星云 / 背景星辰等无实体空域）：相机停在朝原点一侧、距目标 9 单位处正对目标。
  // 抵达后不自动旋转，便于看清这块"用户开发的空域"。reduced-motion 下降级为不运镜。
  flyNear(targetWorld: THREE.Vector3): Promise<void> {
    if (this.reduce) {
      this.controls.enabled = true;
      return Promise.resolve();
    }
    this.flying = true;
    this.controls.enabled = false;
    this.controls.autoRotate = false;
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endTarget = targetWorld.clone();
    const outward = targetWorld.clone().normalize();
    const endPos = targetWorld.clone().add(outward.multiplyScalar(-9)).add(new THREE.Vector3(0, 1.5, 0));
    const mid = startPos.clone().lerp(endPos, 0.5).add(new THREE.Vector3(0, 8, 0));
    const dur = 1100;
    const t0 = performance.now();
    return new Promise((resolve) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / dur);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // easeInOutCubic
        const p = quadBezier(startPos, mid, endPos, e);
        this.camera.position.copy(p);
        this.controls.target.lerpVectors(startTarget, endTarget, e);
        this.camera.lookAt(this.controls.target);
        if (k < 1) requestAnimationFrame(step);
        else {
          this.flying = false;
          this.controls.enabled = true;
          this.controls.autoRotate = false; // 抵达后保持静止，便于观察
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  // 方案A·空间邻居：返回以 gid 为中心、世界距离最近的 n 个其他节点（供 UI"附近的星"快捷跳转）。
  // 用与 flyInto 一致的世界坐标变换（本地 pts 绕 group.rotation.y 旋转）。
  nearestNeighbors(gid: string, n = 6): { gid: string; name: string; dist: number }[] {
    const i = this.gidToIndex.get(gid);
    if (i == null) return [];
    const Y = new THREE.Vector3(0, 1, 0);
    const w0 = this.pts[i].clone().applyAxisAngle(Y, this.group.rotation.y);
    const out: { gid: string; name: string; dist: number }[] = [];
    for (let j = 0; j < this.nodes.length; j++) {
      if (j === i) continue;
      const w = this.pts[j].clone().applyAxisAngle(Y, this.group.rotation.y);
      out.push({ gid: this.nodes[j].gid, name: this.nodes[j].n, dist: w0.distanceTo(w) });
    }
    out.sort((a, b) => a.dist - b.dist);
    return out.slice(0, n);
  }

  // M3：到达新节点瞬间，余烬粒子爆裂 + 冲击波环 + 实例闪光回落。
  spawnIgnition(gid: string) {
    if (this.reduce) return;
    const i = this.gidToIndex.get(gid);
    if (i == null) return;
    const local = this.pts[i].clone();
    const color = new THREE.Color(TRUTH_COLOR[(this.nodes[i].truth as string)] || '#ffe08a');

    // 余烬粒子
    const N = 64;
    const pos = new Float32Array(N * 3);
    const vel: THREE.Vector3[] = [];
    for (let k = 0; k < N; k++) {
      pos[k * 3] = local.x;
      pos[k * 3 + 1] = local.y;
      pos[k * 3 + 2] = local.z;
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      vel.push(dir.multiplyScalar(2.4 + Math.random() * 3.2));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({
      color,
      size: 0.2,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pts = new THREE.Points(g, m);
    this.group.add(pts);
    this.ignitions.push({ pts, vel, born: performance.now() });

    // 冲击波环
    const ringGeo = new THREE.RingGeometry(0.22, 0.34, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(local);
    this.group.add(ring);
    this.rings.push({ ring, born: performance.now() });

    // 实例闪光：短暂提亮，0.48s 内回落到基准色（在 updateEffects 里插值）
    this.flashIndex = i;
    this.flashUntil = performance.now() + 480;
    Sound.play('ignition');
  }

  // M6：把星座名渲染成发光字标（CanvasTexture Sprite），浮在星图中央署名。
  // 画布宽度按文字实测宽度动态计算，避免长名字被裁切。
  private makeLabelSprite(text: string): THREE.Sprite {
    const pad = 44;
    const fontSize = 64;
    const measure = document.createElement('canvas').getContext('2d')!;
    measure.font = '600 ' + fontSize + 'px "Noto Serif SC", "Songti SC", serif';
    const w = Math.ceil(measure.measureText(text).width) + pad * 2;
    const h = fontSize + pad * 2;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d')!;
    g.font = '600 ' + fontSize + 'px "Noto Serif SC", "Songti SC", serif';
    g.fillStyle = '#ffe08a';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(255,200,120,0.85)';
    g.shadowBlur = 24;
    g.fillText(text, w / 2, h / 2);
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }),
    );
    const aspect = w / h;
    const baseH = 3.2;
    sp.scale.set(baseH * aspect, baseH, 1);
    sp.position.set(0, 6, 0);
    return sp;
  }

  // 未开放星云标签：冷灰白发光字标，默认可见(fog:false)，区别于当前亮暖色历史星云。
  private makeLockedLabel(text: string): THREE.Sprite {
    const pad = 40;
    const fontSize = 52;
    const measure = document.createElement('canvas').getContext('2d')!;
    measure.font = '600 ' + fontSize + 'px "Noto Serif SC", "Songti SC", serif';
    const w = Math.ceil(measure.measureText(text).width) + pad * 2;
    const h = fontSize + pad * 2;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d')!;
    g.font = '600 ' + fontSize + 'px "Noto Serif SC", "Songti SC", serif';
    g.fillStyle = '#c9d4e8';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(150,170,210,0.8)';
    g.shadowBlur = 18;
    g.fillText(text, w / 2, h / 2);
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.92, fog: false }),
    );
    const aspect = w / h;
    const baseH = 2.6;
    sp.scale.set(baseH * aspect, baseH, 1);
    return sp;
  }

  // 程序化行星表面纹理（等距柱状投影 512x256）：4 种风格，零素材依赖、守 Article 0 不编造。
  // gas=气态条带+大红斑；ice=冰蓝纵向渐变+淡纹；rock=岩石底+随机坑洞+噪点；terra=海洋+大陆团块+极冠。
  // 土星式行星环：RingGeometry 重算 UV（U=径向、V=角度），贴上带条纹+卡西尼缝的环纹理，倾斜 ~26°。
  private makePlanetRing(radius: number, c1: string, c2: string): THREE.Mesh {
    const inner = radius * 1.4;
    const outer = radius * 2.4;
    const geo = new THREE.RingGeometry(inner, outer, 96, 1);
    const posAttr = geo.attributes.position;
    const uvAttr = geo.attributes.uv;
    const v = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      const r = (Math.hypot(v.x, v.y) - inner) / (outer - inner); // 0(内)→1(外)
      const ang = (Math.atan2(v.y, v.x) + Math.PI) / (2 * Math.PI);
      uvAttr.setXY(i, r, ang);
    }
    uvAttr.needsUpdate = true;
    const tex = this.makePlanetRingTexture(c1, c2);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2 - 0.46; // 倾斜 ~26°
    return ring;
  }

  // 行星环纹理：横向(径向)渐变 + 暗带(卡西尼缝)，让环有层次而非纯色扁片。
  private makePlanetRingTexture(c1: string, c2: string): THREE.CanvasTexture {
    const W = 256;
    const H = 16;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d')!;
    const rgba = (hex: string, a: number) => {
      const n = parseInt(hex.slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    };
    const grad = g.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0.0, rgba(c1, 0.04));
    grad.addColorStop(0.1, rgba(c2, 0.5));
    grad.addColorStop(0.38, rgba(c1, 0.82));
    grad.addColorStop(0.6, rgba(c2, 0.88));
    grad.addColorStop(0.76, rgba(c1, 0.16)); // 卡西尼缝
    grad.addColorStop(0.82, rgba(c2, 0.72));
    grad.addColorStop(1.0, rgba(c1, 0.04));
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  // B组：行星大气 fresnel 辉光壳。边缘(viewDir·normal)趋 0 处提亮，模拟真实大气临边增亮（limb brightening）。
  private makeAtmosphere(radius: number, hex: string): THREE.Mesh {
    const mat = new THREE.ShaderMaterial({
      uniforms: { c: { value: new THREE.Color(hex) } },
      vertexShader: `
        varying vec3 vN; varying vec3 vV;
        void main(){
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vN; varying vec3 vV; uniform vec3 c;
        void main(){
          float f = pow(1.0 - abs(dot(vN, vV)), 2.0);
          gl_FragColor = vec4(c, f * 1.5);
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), mat);
  }

  private makePlanetTexture(style: string, c1: string, c2: string): THREE.CanvasTexture {
    const W = 512;
    const H = 256;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d')!;
    const rgba = (hex: string, a: number) => {
      const n = parseInt(hex.slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    };
    if (style === 'gas') {
      g.fillStyle = c1;
      g.fillRect(0, 0, W, H);
      let y = 0;
      while (y < H) {
        const bh = 8 + Math.random() * 22;
        g.fillStyle = rgba(Math.random() > 0.5 ? c2 : c1, 0.55);
        g.fillRect(0, y, W, bh);
        y += bh;
      }
      g.fillStyle = 'rgba(190,70,50,0.7)';
      g.beginPath();
      g.ellipse(W * 0.62, H * 0.42, 34, 17, 0, 0, Math.PI * 2);
      g.fill();
    } else if (style === 'ice') {
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, c1);
      grad.addColorStop(0.5, c2);
      grad.addColorStop(1, c1);
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,0.10)';
      g.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const yy = 18 + Math.random() * (H - 36);
        g.beginPath();
        g.moveTo(0, yy);
        g.lineTo(W, yy + (Math.random() * 10 - 5));
        g.stroke();
      }
    } else if (style === 'rock') {
      g.fillStyle = c1;
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        const r = 4 + Math.random() * 16;
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, 'rgba(0,0,0,0.35)');
        rg.addColorStop(0.7, 'rgba(0,0,0,0.12)');
        rg.addColorStop(1, 'rgba(255,255,255,0.08)');
        g.fillStyle = rg;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      for (let i = 0; i < 420; i++) {
        g.fillStyle = rgba(Math.random() > 0.5 ? c2 : '#ffffff', 0.06);
        g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
      }
    } else {
      // terra：海洋 + 大陆团块 + 极冠
      g.fillStyle = c1;
      g.fillRect(0, 0, W, H);
      g.fillStyle = c2;
      for (let i = 0; i < 14; i++) {
        const x = Math.random() * W;
        const y = H * 0.25 + Math.random() * H * 0.5;
        const r = 18 + Math.random() * 46;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillRect(0, 0, W, H * 0.08);
      g.fillRect(0, H * 0.92, W, H * 0.08);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  // 每帧推进粒子 / 冲击波环 / 闪光，到期自动回收。
  private updateEffects() {
    const now = performance.now();

    for (let n = this.ignitions.length - 1; n >= 0; n--) {
      const ig = this.ignitions[n];
      const age = (now - ig.born) / 1000;
      if (age > 0.9) {
        this.group.remove(ig.pts);
        ig.pts.geometry.dispose();
        (ig.pts.material as THREE.Material).dispose();
        this.ignitions.splice(n, 1);
        continue;
      }
      const pa = ig.pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let k = 0; k < ig.vel.length; k++) {
        pa.setXYZ(k, pa.getX(k) + ig.vel[k].x * 0.016, pa.getY(k) + ig.vel[k].y * 0.016, pa.getZ(k) + ig.vel[k].z * 0.016);
        ig.vel[k].multiplyScalar(0.93);
      }
      pa.needsUpdate = true;
      (ig.pts.material as THREE.PointsMaterial).opacity = 1 - age / 0.9;
    }

    for (let n = this.rings.length - 1; n >= 0; n--) {
      const r = this.rings[n];
      const age = (now - r.born) / 1000;
      if (age > 0.8) {
        this.group.remove(r.ring);
        r.ring.geometry.dispose();
        (r.ring.material as THREE.Material).dispose();
        this.rings.splice(n, 1);
        continue;
      }
      const s = 1 + age * 15;
      r.ring.scale.set(s, s, s);
      r.ring.lookAt(this.camera.position);
      (r.ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - age / 0.8);
    }

    if (this.flashIndex >= 0) {
      const i = this.flashIndex;
      if (now < this.flashUntil) {
        const k = (this.flashUntil - now) / 480; // 1→0
        this.dummy.position.copy(this.pts[i]);
        this.dummy.scale.setScalar(this.baseScale[i] * (1 + k * 1.8));
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        this.mesh.setColorAt(i, new THREE.Color('#ffffff').lerp(this.baseColor[i], 1 - k));
        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
      } else {
        this.applyState(); // 回落到基准着色（已访问=暖金）
        this.flashIndex = -1;
      }
    }

    // 认知星座（M4/M6）：刚画的片段淡入；通关庆祝窗口内整体脉冲绽放；平时轻微呼吸
    for (const s of this.constSegs) {
      const age = (now - s.born) / 1000;
      const grow = Math.min(1, age / 0.5);
      let op = s.target * grow;
      if (this.celebrateUntil > now) {
        op = Math.min(1, op + 0.35 * (0.5 + 0.5 * Math.sin(now * 0.012)));
      } else {
        op *= 0.85 + 0.15 * Math.sin(now * 0.002 + s.born);
      }
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = op;
      // 星座流光：发光粒子沿因果桥曲线流动，方向 = 探索推进方向（prev→cur）；A组增强为彗星（头+拖尾）
      if (s.curve && s.flow) {
        const t = ((now * 0.00035 + s.born * 0.0002) % 1 + 1) % 1;
        const tt = (t - 0.05 + 1) % 1; // 拖尾相位滞后
        s.flow.position.copy(s.curve.getPoint(t));
        (s.flow.material as THREE.MeshBasicMaterial).opacity = op * (0.95 + 0.25 * Math.sin(now * 0.006));
        if (s.flowTail) {
          s.flowTail.position.copy(s.curve.getPoint(tt));
          (s.flowTail.material as THREE.MeshBasicMaterial).opacity = op * 0.5;
        }
      }
    }


    // M6 命名星座浮标：通关窗口内，把星座名以发光字标浮在星图中央，随后淡出
    if (this.celebrateUntil > now && this.celebrateName && !this.nameSprite) {
      this.nameSprite = this.makeLabelSprite(this.celebrateName);
      this.scene.add(this.nameSprite);
      this.nameSpriteBorn = now;
    }
    if (this.nameSprite) {
      const age = (now - this.nameSpriteBorn) / 1000;
      if (age > 3.4) {
        this.scene.remove(this.nameSprite);
        const m = this.nameSprite.material as THREE.SpriteMaterial;
        m.map?.dispose();
        m.dispose();
        this.nameSprite = null;
        this.celebrateName = '';
      } else {
        const op = age < 0.5 ? age / 0.5 : age > 2.6 ? Math.max(0, (3.4 - age) / 0.8) : 1;
        const m = this.nameSprite.material as THREE.SpriteMaterial;
        m.opacity = op * 0.95;
        this.nameSprite.position.y = 6 + Math.sin(now * 0.001) * 0.3;
      }
    }

    // M1 起航级联脉冲：路径站点依次轻弹亮（信号沿电话线传过），到点回落基准
    for (let n = this.pathPulses.length - 1; n >= 0; n--) {
      const pu = this.pathPulses[n];
      if (now < pu.at) continue; // 还没轮到这一站
      if (now >= pu.until) {
        this.dummy.position.copy(this.pts[pu.idx]);
        this.dummy.scale.setScalar(this.baseScale[pu.idx]);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(pu.idx, this.dummy.matrix);
        this.mesh.setColorAt(pu.idx, this.baseColor[pu.idx]);
        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
        this.pathPulses.splice(n, 1);
        continue;
      }
      const k = (now - pu.at) / (pu.until - pu.at); // 0→1
      const pop = Math.sin(k * Math.PI); // 0→1→0
      this.dummy.position.copy(this.pts[pu.idx]);
      this.dummy.scale.setScalar(this.baseScale[pu.idx] * (1 + pop * 0.9));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(pu.idx, this.dummy.matrix);
      this.mesh.setColorAt(pu.idx, this.baseColor[pu.idx].clone().lerp(new THREE.Color(0xffe08a), 0.6 * pop));
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }

    // M7 真值动态（贯穿）：halo 按真值层每帧动效 —— 动效本身就是真值语言，
    // 配合 hoverCard 的"研究状态"文字，守"不靠颜色单编码"的无障碍纪律。
    const t = now / 1000;
    for (let i = 0; i < this.nodes.length; i++) {
      const tr = this.truthOf[i] || 'verified';
      const phase = this.truthPhase[i];
      let mul = 1;
      if (tr === 'pending') {
        mul = 1 + 0.14 * Math.sin(t * 0.6 + phase); // 暗淡呼吸
      } else if (tr === 'debated') {
        mul = 1 + 0.06 * Math.sin(t * 6 + phase); // 琥珀色微颤
        const sp = (t + phase) % 2.6; // 偶发火花：每 ~2.6s 来一次短促爆点
        if (sp < 0.28) mul += 0.6 * (1 - sp / 0.28);
      } else {
        // B组·恒星级（verified）：极缓呼吸，读作"锚点/定律"的稳态辉光而非闪烁
        mul = 1 + (this.reduce ? 0 : 0.11 * Math.sin(t * 0.9 + phase));
      }
      if (i === this.hovered) mul = 2.3; // hover 放大强调
      this.dummy.position.copy(this.pts[i]);
      this.dummy.scale.setScalar(this.haloBase[i] * mul);
      this.dummy.updateMatrix();
      this.haloMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.haloMesh.instanceMatrix.needsUpdate = true;

    // §9.1-C 防迷路锚：下一站目标节点持续金色呼吸脉冲，把 HUD「下一步建议」锚定到星图具体位置。
    // 只作用于未访问的 target；reduced-motion 下不脉冲（applyState 已给静态更强金辉，降级仍可见）。
    if (!this.reduce) {
      const tg = now / 1000;
      for (const gid of this.targetGids) {
        const i = this.gidToIndex.get(gid);
        if (i == null || this.visitedGids.has(gid)) continue;
        const pulse = 1 + 0.22 * Math.sin(tg * 3.2);
        this.dummy.position.copy(this.pts[i]);
        this.dummy.scale.setScalar(this.baseScale[i] * pulse);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        this.mesh.setColorAt(i, this.baseColor[i].clone().lerp(new THREE.Color(0xffffff), 0.2 + 0.2 * (pulse - 1) / 0.22));
        this.haloMesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
      this.haloMesh.instanceMatrix.needsUpdate = true;
    }

    // A组·选中聚焦态：脉冲环定位到选中节点世界坐标、每帧 lookAt 相机
    if (this.focusIdx >= 0) {
      const wp = this.pts[this.focusIdx].clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
      this.focusRing.position.copy(wp);
      this.focusRing.lookAt(this.camera.position);
      const pr = this.reduce ? 1 : 1 + 0.12 * Math.sin(now * 0.004);
      this.focusRing.scale.setScalar(this.baseScale[this.focusIdx] * 2.4 * pr);
      (this.focusRing.material as THREE.MeshBasicMaterial).opacity = this.reduce ? 0.5 : 0.5 + 0.3 * Math.sin(now * 0.004);
    }

    // A组·聚光压暗：starDim 缓动并应用到背景星场/星云/未开放星云（仅在聚焦时生效，平时交还给 animate 的呼吸动画）
    this.starDim += (this.starDimTarget - this.starDim) * 0.08;
    if (this.starDim < 0.985) {
      for (const sp of this.starPoints) {
        const m = sp.material as THREE.PointsMaterial;
        m.opacity = ((m as any).userData?.baseOp ?? 0.9) * this.starDim;
      }
      for (const n of this.nebulae) {
        (n.material as THREE.SpriteMaterial).opacity = (n.userData.baseOp || 0.45) * this.starDim;
      }
      for (const c of this.lockedClusters) {
        (c.stars.material as THREE.PointsMaterial).opacity = 0.5 * (0.55 + 0.45 * Math.sin(now * 0.0004 + c.ph)) * this.starDim;
      }
    }

    // D组·银河带缓慢自转 + 视差尘埃飘动（reduced-motion 下静止）
    if (!this.reduce) {
      this.milkyWay.rotation.y += 0.00012;
      this.dust.rotation.y += 0.00025;
      this.dust.position.y = Math.sin(now * 0.0004) * 2.5; // 极缓整体上下漂，世界空间内自然无锁屏
    }

    // 宇宙纵深·远景星系群：缩到最远时淡入、缩近时淡出（避免近景杂乱）；极缓自转增加真实感
    {
      const d = this.camera.position.distanceTo(this.controls.target);
      const show = THREE.MathUtils.clamp((d - 170) / 220, 0, 1); // d<170 全隐，d>390 全显
      for (const bg of this.backdropGalaxies) {
        (bg.disk.material as THREE.PointsMaterial).opacity = bg.baseOp * show;
        (bg.core.material as THREE.SpriteMaterial).opacity = bg.baseOp * 1.4 * show;
        if (!this.reduce) bg.disk.rotation.y += 0.00009;
      }
    }

    // 文明映射·新增天体动画（reduced-motion 下静止）
    if (!this.reduce) {
      for (const m of this.moons) m.pivot.rotation.y += m.speed; // 卫星：绕行星公转
      for (const b of this.blackHoles) {
        b.disk.rotation.z += 0.003; // 吸积盘缓转
        b.photon.quaternion.copy(this.camera.quaternion); // 光子环 billboard → 恒呈圆形亮轮廓
      }
      for (const dm of this.darkMatter) {
        dm.halo.rotation.y += 0.0004; // 包裹晕极缓自转
        dm.bridge.rotation.y += 0.0002; // 桥接纤维同频微转
      }
      for (const dbr of this.debris) { // 碎片：低速游移 + 自转，软边界回收
        dbr.mesh.position.add(dbr.vel);
        dbr.mesh.rotation.x += dbr.spin.x;
        dbr.mesh.rotation.y += dbr.spin.y;
        if (dbr.mesh.position.length() > 90) dbr.mesh.position.multiplyScalar(0.6);
      }
    }

    // C组·虫洞星流：flyInto 进度拉伸背景星场，星点呼啸而过（复位时收回）
    if (this.warpK > 0.001) {
      this.starField.scale.setScalar(1 + this.warpK * 1.8);
    } else if (this.starField.scale.x !== 1) {
      this.starField.scale.setScalar(1);
    }
  }
}

// 双指间距（缩放手势用，纯函数）
function touchDist(e: TouchEvent): number {
  const a = e.touches[0];
  const b = e.touches[1];
  if (!a || !b) return 0;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

// 二次贝塞尔插值（运镜弧线用，纯函数）
function quadBezier(a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  const u = 1 - t;
  return new THREE.Vector3(
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z,
  );
}
