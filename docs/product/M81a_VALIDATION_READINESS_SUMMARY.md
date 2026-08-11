# M81a Validation Readiness Summary

**Milestone**: M81a Prototype Validation
**Carrier**: Option A — Existing Frontend Demo State（PO 已决策采用）
**Date**: 2026-08-03
**Type**: Execution Readiness Check（非 Gate 文档，不引入新审批环节）
**Verdict**: **READY**（v2，2026-08-03。原 HOLD 因 Scenario A 数据缺失；PO 已决策取消该场景并替换为 A′，HOLD 条件已解除）

---

## 0. 本次执行范围声明

本文档是 M81a 进入真实用户验证前的**最后一次准备检查**，不是新增 Gate。

执行动作仅限：
- 启动既有 dev server（frontend + backend），未修改任何一行代码
- 只读核验探索链与场景数据存在性
- 内部 Dry Run（AI 执行，非用户测试）

未发生：改码 / 修 bug / 加组件 / 加数据 / 动 KG / 动 Ontology / 动 ENTITY=8 / 动 RELATIONSHIP=18 / Trail 持久化 / AI Runtime / 进入 M83。

**Dry Run 方法限制（如实声明）**：本次 Dry Run 由 AI 以「运行态 API 链路遍历 + 组件接线静态推演」方式完成，可判定*阻断类*问题（页面打不开、数据为空、链路断裂），**不能替代真人点击的主观理解体验**。主观维度须由真实 Explorer 在正式 Session 中产出。

---

## 1. 当前状态

### A. Carrier 检查

| 检查项 | 结果 | 证据 |
|---|---|---|
| Existing Frontend Demo State 是否可启动 | **PASS** | `npm run dev` 启动成功，`http://localhost:5173/` HTTP=200 |
| 首页入口是否可达 | **PASS** | 无 react-router，`App.tsx:971-986` 默认渲染 `DiscoverPage`，天然可达 |
| 最低探索链是否存在 | **PASS** | 见下表四环全通 |

**最低探索链逐环核验（运行态实测）**：

| 环节 | 组件 / 接口 | 实测结果 |
|---|---|---|
| ① 打开入口 | `DiscoverPage` → `GET /topics` | PASS，返回 8 个主题，含精选 `silk_road` |
| ② 理解主题 | `GET /explore/silk_road` | PASS，entities=12 / relationships=19 / timeline=2 |
| ③ 查看关联 | `GET /entity/{id}` → `ConnectionsExplainedPanel` | PASS，`silk_road:han_dynasty` 返回 `connections_explained` = **16 条**，每条含 path / steps / relationship / direction / score / explanation |
| ④ 继续探索方向 | `ContinueExploringPanel` | PASS，消费 `connections_explained` 前 5 条，三级降级（直连 → 跨主题 → 主题 chip） |
| ⑤ 返回 / 继续 | `App.tsx` `navigateTo` 状态机 | PASS，单一导航入口，`ExplorationTrail` 记录会话内足迹（非持久化，符合边界） |

### B. 关键运行前提（新发现，必须纳入 Session SOP）

**前端强依赖后端 `localhost:8000`。** `App.tsx:75` 等 7 处硬编码 `VITE_API_BASE || 'http://localhost:8000'`。

- 首次探测时**后端未运行**，此状态下 Explorer 打开首页只会看到加载失败/空状态。
- 已启动 `uvicorn app.main:app --port 8000` 后全链路恢复正常。
- **结论**：正式 Session 前必须先起后端、再起前端，两者缺一即整场验证作废。此项写入 Moderator 开场 SOP。

---

## 2. Scenario 准备情况

### Scenario A：秦统一 → 汉承秦制 → 跨文明关联

| 确认项 | 结果 |
|---|---|
| 是否存在入口 | **FAIL** |
| 是否存在时间变化 | PARTIAL（汉有 timeline，秦无） |
| 是否存在关系解释 | **FAIL**（秦↔汉关系不存在） |
| 是否存在至少一个跨文明探索方向 | PASS（汉↔罗马/波斯/印度经丝路） |

**缺失记录（只记录，不修复）**：

1. **秦朝实体在系统中完全不存在。** 运行态实测 `GET /search?q=Qin` 仅返回 1 条 `tp-qing`（清朝，1636–1912），为字符串近似导致的假阳性。
2. `china_civilization_v1` 数据集定位为**唐→清**（41 实体 / 45 关系），标题即「唐至清的文化、制度与技术演化」，设计上不覆盖秦汉。
3. 汉朝实体（`silk_road:han_dynasty`）存在，但归属 `silk_road` 数据集，定位是**贸易/传播节点**，关系全为 `invented` / `traded_with` / `spread`，**不含任何制度承袭语义**。
4. 制度承袭语义（`inherited`）确实存在但用于唐→宋→明（`idea-keju → idea-wenguan → idea-neige`），与秦汉无桥接。

**判定**：Scenario A 缺口不是「部分数据不足」，而是**链条第一环整体不存在**，第二环因此必然不存在。该场景在当前载体下**不可执行**，非 UI 问题，属数据覆盖范围问题。

### Scenario B：思想/技术跨文明传播

| 确认项 | 结果 |
|---|---|
| 是否存在入口 | **PASS** |
| 是否存在传播路径 | **PASS** |
| 是否存在比较方向 | **PASS** |

证据：

- 入口：`silk_road` 为 `DiscoverPage` 默认精选主题（`DiscoverPage.tsx:33`），首页一击可达。
- 传播路径：关系类型为 `spread`（非 `SPREAD_TO`/`DIFFUSED`），实测存在链路——
  - 造纸术：`han_dynasty --invented--> tech-paper --spread--> roman_empire:civ-roman`（二跳，运行态返回 score=0.8075，带完整 explanation）
  - 丝织术：`tech-silk --spread--> roman_empire:civ-roman`
  - 佛教东传：`ancient_india:religion-buddhism --spread--> silk_road / han_dynasty`
  - 玻璃制造：`tech-glass --spread--> silk_road`
- 比较方向：`TemporalComparisonPanel`（`App.tsx:848`）、`TopicComparisonPanel`（`App.tsx:891`）、`MultiEntityTimeline` 均已接线。
- 跨文明广度：从汉朝一跳/二跳可达罗马、波斯、印度、托勒密埃及，共 16 条 explained connections。

**判定**：Scenario B **完全就绪**，且是当前数据的强项。

### Scenario A 替代建议（不修复数据，改选场景）

在**零开发**前提下，可用以下已就绪链路替换 Scenario A，保持「制度/时序承袭 + 跨文明」的原始验证意图：

- **A′：唐 → 宋 → 明 制度演化**（科举 → 文官体系 → 内阁）
  - 数据完整：`before` 时序链 + `inherited` 承袭链 + `caused`/`influenced`，均带 evidence 引用
  - 跨文明出口：佛教本土化（`rel-fojiao → civ-zhonghua`）→ 印度包
  - 与 Scenario A 的认知任务同构：时间变化 + 制度承袭 + 跨文明关联

此为**建议**，采纳与否由 PO 决定，本文档不代为拍板。

---

## 3. Dry Run 结果

模拟路径：打开入口 → 理解主题 → 查看关联 → 继续探索方向 → 返回/继续

| 观测维度 | 结果 | 说明 |
|---|---|---|
| 是否出现页面阻断 | **否**（前提：后端已启动） | 前端 200，各接口 200。后端未启动时会整体阻断，已列为前置条件 |
| 是否出现明显空状态 | **否**（Scenario B 路径） | 各环节均有实数据。Scenario A 路径下秦朝入口即空，但该场景已判定不执行 |
| 是否出现探索链断裂 | **否** | 五环全通，`ContinueExploringPanel` 三级降级机制保证「下一步」永不为空 |
| 是否出现 Object Model 误读风险 | **是，3 项**，见下 |

**Object Model 误读风险清单（仅记录，不修复）**：

| # | 风险 | 描述 | 对 M81a 的影响 |
|---|---|---|---|
| R1 | Trail 语义混淆 | 界面存在 `ExplorationTrail` 组件，但它是**会话内导航足迹**，非 M80.5 定义的可回溯 Trail（未持久化，刷新即失）。Explorer 可能误以为记录会保留 | 中。须在 Explorer Briefing 明示「本次不验证记录保存」，否则会污染 Trail 相关反馈 |
| R2 | 关系解释文本工程化 | `explanation` 输出形如 `Civilization 'Han Dynasty' →[invented outgoing]→ Technology 'Papermaking'`，暴露 `outgoing`/`incoming` 等内部方向术语 | 中。可能被 Explorer 读作「系统在讲技术细节而非历史」，直接命中 M80.5 第 3.2 节 Presentation Semantics。**这是有效验证信号，应如实采集，不得提前解释掉** |
| R3 | 语言混排 | `silk_road` 等数据集为英文，`china_civilization_v1` 为中文，跨主题跳转时语言突变 | 低-中。会影响中文 Explorer 的连续理解，须作为观察项记录 |

**明确不评价**：UI 美观、布局、配色、动效、性能。本轮不提任何产品优化建议。

---

## 4. Remaining Risks

| # | 风险 | 等级 | 处置（本阶段不修复） |
|---|---|---|---|
| ~~K1~~ | ~~Scenario A 数据不存在，原场景不可执行~~ | — | **已关闭**（v2）：PO 决策取消该场景，替换为 A′，零开发 |
| K2 | 后端未启动 → 全站空状态 | **高** | 写入 Moderator 开场 SOP，Session 前 5 分钟双服务自检 |
| K3 | Trail 非持久化被误读 | 中 | Explorer Briefing 显式声明范围 |
| K4 | 关系解释文本含工程术语 | 中 | 不修复，作为验证信号采集 |
| K5 | 中英混排 | 中 | 若选 A′（纯中文包）+ Scenario B（英文包），须提醒 Explorer 语言差异属已知状态 |
| K6 | 无真人主观数据 | — | 本轮固有限制，正是 Explorer Validation 要解决的 |

---

## 5. 是否 Ready for Explorer Validation

### **READY**

**v1 判 HOLD 的原因（已解除）**：Scenario A（秦→汉）在当前载体下不可执行。载体、探索链、Scenario B、材料包当时即已全部就绪。

**PO 决策（2026-08-03）**：
1. Scenario A（秦→汉）**取消** —— 当前 KG 不支持秦汉制度承袭链，本阶段禁止补数据
2. Scenario B（跨文明传播）**保留**
3. 替换场景：**Scenario A′ — 制度承袭演化**（科举 → 文官体系 → 内阁，跨文明出口走佛教本土化）

替换后开发量为 0，未动任何代码与数据，HOLD 条件解除。

### 最终验证场景（v2）

| | Scenario A′：制度承袭演化 | Scenario B：思想/技术跨文明传播 |
|---|---|---|
| 用户任务 | "一项制度是怎样一代代传下来、又慢慢变样的？" | "某个思想或技术是如何在不同文明之间流动的？" |
| 入口 | 中华文明主题（中文数据集） | 丝绸之路（首页精选，一击可达） |
| 时间变化 | 唐→宋→元→明→清，`before` 时序链完整 | 汉代 → 罗马时期，timeline 存在 |
| 核心关系 | `inherited`（科举→文官体系→内阁），带 evidence 引用 | `spread`（造纸/丝织/佛教/玻璃），带 explanation |
| 跨文明方向 | 佛教本土化 → 印度起源 | 罗马 / 波斯 / 印度 / 托勒密埃及，16 条 explained connections |
| 数据状态 | 完整，零开发 | 完整，零开发 |

两场景认知任务互补：A′ 验证**纵向时间承袭**理解，B 验证**横向跨文明关联**理解，共同覆盖 M80.5 North Star 三信号。

### Session 前置清单（3 条，非 Gate，已写入各材料）

1. **双服务自检**：先启后端 `uvicorn app.main:app --port 8000`，再启前端 `npm run dev`，首页主题列表有内容后方可开场 → 已写入 Moderator Script 会话前置自检
2. **已知状态声明**：不保存记录 / 中英混排 / 文案生硬 → 已写入 Explorer Briefing 与 Moderator 开场照读段
3. **R1/R2/R3 观察点**：已预置为 Observer Worksheet 第六节，并在 Evidence Template 增设 C2 转录表

---

## 5.1 材料同步状态（v2 变更记录）

| 文件 | 变更 | 状态 |
|---|---|---|
| `M81a_EXPLORER_BRIEFING.md` | 任务 A 改为制度承袭；新增「已知情况」段 | ✅ |
| `M81a_MODERATOR_SCRIPT.md` | 新增会话前置自检；新增已知情况照读段；任务 A 口径替换；扩充禁止话术；新增已知问题应答口径表 | ✅ |
| `M81a_OBSERVER_WORKSHEET.md` | 场景标签替换；新增第六节 R1/R2/R3 观察点；新增前置自检确认位 | ✅ |
| `M81a_EVIDENCE_TEMPLATE.md` | 场景标签替换；新增 C2 已知状态反应转录表；新增自检作废判定 | ✅ |
| `M81a_EXPLORATION_PROTOTYPE_PLAN.md` | 场景 A 定义与任务 A 口径同步替换 | ✅ |
| `M81a_EXPLORATION_PROTOTYPE_EXECUTION_GUIDE.md` | 第3节场景 A 脚本同步替换 | ✅ |
| `M81a_INTERVIEW_GUIDE.md` | 无场景耦合内容，无需变更 | — |

全库已核验无遗留旧场景任务口径（仅保留 2 处替换历史说明）。

---

## 6. 边界确认

| 冻结项 | 状态 |
|---|---|
| ENTITY = 8 | 未触碰 |
| RELATIONSHIP = 18 | 未触碰 |
| Runtime 0.13.0 | 未触碰 |
| AI Trust Boundary | 未触碰 |
| Ontology / Schema | 未触碰 |
| M80.5 产品定义 | 未修改 |
| frontend / backend 代码 | 未修改（仅启动既有服务） |
| 数据 / KG | 未修改 |
| M83 / M83.5 | 未进入 |

本文档为 M81a 准备阶段**唯一新增文件**。未重复生成 Carrier Gate / Runtime Gate / Decision Gate / Material Gate。
