# History Explorer 技术路线整体评估

> 评估对象：History Explorer Platform（HEP），React+TS+Vite 前端 + FastAPI 后端，冻结基线 M1–M8.6 / Runtime 0.13.0 / ENTITY=8 / REL=18
> 评估视角：技术路线（战略对齐 + 工程健康），非功能验收
> 评估日期：2026-07-29

---

## 0. 一句话结论

**工程地基健康、治理纪律难得地好；但战略层存在根本性张力** —— 产品 DNA（宪法 §2.4「AI 是向导」、四维模型含 AI、Roadmap 把 AI 列为未来核心）把 AI 卖成核心第四维度，而架构冻结基线让 AI **默认永不可运行**。机械层面（依赖、构建、类型、测试、发布纪律）过关，真正的风险在 **产品定位与架构对齐**，不在工程腐化。

---

## 1. 评分卡

| 维度 | 评级 | 关键依据 |
|---|---|---|
| 依赖与构建健康 | ✅ 优秀 | 前端仅 react/react-dom + 构建工具；`tsc && vite build`；Vite 5 / TS 5 strict |
| 类型安全与测试基底 | ✅ 良好 | TS strict + noUnused*；前端 100 测试文件、后端 22 测试文件 |
| 后端清晰度 / 冻结合规 | ✅ 良好 | 模块边界清晰、ADR 驱动；M24 provenance 确定性哈希优雅；无违规 |
| 治理纪律（标签/一致性/冻结门） | ✅ 优秀 | annotated vM tag、consistency 7/7、ff-only、scope allowlist |
| 前端架构（路由/状态/抽象） | ⚠️ 脆弱 | 无 router/state/UI/HTTP 库，全手写；App.tsx 869 行上帝组件 |
| AI 落地可行性 | ❌ 断裂 | 默认部署 AI 网关关闭 + 后端冻结，18 个 AI 里程碑全 mock |
| 死代码 / 僵尸逻辑治理 | ⚠️ 偏弱 | ~2500 行 ProductIntelligence 管线零消费，被 allowlist 合法化 |
| 代码质量门禁（lint 等） | ⚠️ 缺失 | 无 ESLint/Prettier，无 lint 门禁 |

---

## 2. 关键问题（按严重度）

### 2.1 AI 承诺 vs 架构冻结的断裂（最致命）
- 宪法 §2.4、产品 DNA 四维、Roadmap §4 都把 AI 定为**核心体验维度**。
- 但默认部署下 AI 网关关闭：`AI_GATEWAY_ENABLED` 未设 → provider = None → `grounded_answer()` 走英文 fallback「The AI interpretation layer is currently unavailable」。
- 前端本身还有**第二套互斥 AI**：`AISidebar.tsx` 走 `AIOrchestrator.generateMockResponse()` 返回**写死的中文 canned 文本**，完全绕过 `aiClient` 与后端。同一产品呈现两种矛盾的「AI」行为（中文假热情 vs 英文真不可用）。
- 团队自己已在 `EntityHero.tsx:13` 标注：`M59-016: AI Companion entry — hidden in M60 (mock AI is a liability)`。
- **核心冲突**：真要 ship 可用 AI = 必须解冻后端 + 注入 OpenAI key，与「后端改动基本禁止」的冻结基线直接矛盾。

### 2.2 没有 mock→real 的干净接缝
- 数据获取是散落的即兴 `fetch()`：`App.tsx`（/topics、/explore、/entity、/search）、`EntityPickerPanel`、`RecommendationPanel`、`provenanceApi` —— **无中央 API client / repository 抽象**。
- AI 层：`aiClient` 是较合理的薄抽象，但 `AISidebar` 完全绕过它、用文件内 mock，且**无可切换接口**（注释写着「wire aiClient here in production」，但需重写组件，非配置翻转）。

### 2.3 ~2500 行僵尸「Product Intelligence」分析管线
- M42–M57 约 16 个模块（`ProductIntelligence*`、`ProductUsageAnalysis`、`UIAudit`、`UserJourney` 等）**零 UI 消费**（grep 仅在其自身 `.test.ts` 出现），只读写 localStorage 遥测、无人读。
- 被 `scripts/freeze-check.mjs` 的 `SCOPE_ALLOWLIST` 明确放行 → 不经 Freeze Revision Gate 无法移除，**随包发布的僵尸逻辑**。

### 2.4 前端零基建 + 上帝组件
- 受冻结约束（仅 React+ReactDOM），无 router / 状态管理 / UI 库 / HTTP 客户端，全部手写。
- `App.tsx` 869 行，22 处 useState，手动视图切换 + props 透传；`RelationshipInsightPanel.tsx` 848 行；`relationshipUtils.ts` 759 行。
- 随功能增长将触及可维护性悬崖；且受冻结约束**无法**通过加库解决。

### 2.5 生产代码卫生
- **生产 `console.log`** 进入构建：`ProductUsageAnalysis.ts`（10+ 处）、`EntityPage.tsx:191,194`。
- **硬编码 API base** `http://localhost:8000` 烤进生产代码（`App.tsx:73`、`aiClient.ts:10`）。
- `FEATURED_SLUGS`（4 个 topic）硬编码耦合后端 topic 注册表（`App.tsx:81-86`）；`DevCatalog.tsx` 硬编码 mock 数据脱离后端。

### 2.6 冻结门禁面过窄 → 虚假安全感
- `freeze-check.mjs` 只 FAIL「D 类」(scope/token/dep/enum)。**不拦**死代码、console.log、测试质量、文件体积、双 AI 不一致、上帝组件。
- 项目看起来「被守护」，但真实腐化（僵尸分析、双 AI、质量债）被 allowlist 放行/忽略。

### 2.7 缺 lint / format 门禁
- 仓库无任何 ESLint / Prettier 配置；`build` 仅 `tsc` 把关，无静态风格/质量强制。

---

## 3. 正面项（务必保留）

- 极小依赖面、现代构建链、`tsc && vite build` 先类型检查。
- 后端结构清晰、ADR 驱动；M24 provenance 确定性哈希（`sha256:` 前缀、顺序无关、机器无关）是优雅的「可复现指纹」，零新依赖。
- 测试基数大（前端 100+ / 后端 22）、CI 含 freeze-check 三作业门禁。
- 发布纪律严格：annotated tag、consistency 7/7、ff-only、working-tree 核验 —— 罕见且宝贵。
- 冻结基线本身是好东西：**冻结的是正确的东西**（schema、确定性内核、API 契约），为后续演进提供了稳定锚点。

---

## 4. 给翔哥的决策建议（PO 拍板项）

需要你定调的根本选择：

- **A（推荐）：明确「先做确定性探索器」定位**
  把 AI 降级为「已批准路线 / 未来能力」，现在就清理：统一 AI 行为（全走 `aiClient` + fallback，删掉 `AISidebar` 的中文 canned mock 分支）、下架僵尸分析管线、补 lint、外部化 API base。先交付一个**干净、可信的策展探索产品**，AI 作为路线图上的明确未来项。代价最小、风险最低。

- **B：正式承诺 ship AI**
  走 Freeze Revision Gate（ADR-0003 已原则批准），定义 env-gated 真实 AI 路径：全量接线 `aiClient`、杀掉 mock 分支、明确部署契约（key 注入方式 / provider / 成本上限 / 降级策略）。**代价：必须改动被冻结的后端**——与当前「后端基本禁止改动」基线冲突，需要你明确拍板放行。

- **C：维持现状**
  不推荐。长期累积双 AI 矛盾 + 僵尸代码 + 上帝组件，技术债复利，且每次新增 milestone 都在扩大清理成本。

> 无论选 A 或 B，以下高性价比清理都该先做（不依赖方向决策）：
> 1. 外部化 API base URL（去硬编码 localhost:8000）
> 2. 清生产 `console.log`
> 3. 加 ESLint + lint 门禁
> 4. 给 `ProductIntelligence*` 加 dev-only flag 或发起 Gate 移除
> 5. `App.tsx` 拆分（至少抽出轻量路由 + store 上下文）

---

## 5. 风险 / 未决项

- **M43–M49 收敛 pending**：5 个产品智能模块各自独立输出、未交叉校验真实事件流（已有 pending 记录，需下个里程碑做收敛+真实事件流验证）。
- **后端规模有限**：9 个示例 JSON 策展，9 topics。「Graph-first」在 9 个 topic 上成立；规模化需 Neo4j/PG/ES（需 Gate，路线图远期）。
- **tag 偏差长期观察**：`vM33.1` tag 实际指向 `d5ebeba`，master HEAD 在其后；feature 分支须基于 master HEAD 而非 tag。
- **隐性运行时依赖**：`openai` 被惰性导入但默认部署从未使用 —— 轻微技术债，可在 A/B 任一方向一并处理。

---

## 6. 总体判断

技术**地基与纪律是资产，不是负债**；问题集中在「产品把 AI 当卖点、架构却锁死了 AI」这一战略错配，以及由此放生的僵尸代码与双 AI 混乱。修复成本**可控**（基础健康），关键是尽快由 PO 在 A/B 间定调，停止在「假 AI 外壳」上继续累加。
