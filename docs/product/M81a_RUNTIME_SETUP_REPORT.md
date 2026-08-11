# M81a — Runtime Setup Report（运行态验证设置报告）

> **M81a Prototype Validation Setup Gate（运行态准入检查）。**
> 严格只读：仅启动 dev server 观测运行态，不修改 frontend/backend、不修 bug、不补数据、不进 M83/M83.5、不碰 Freeze Boundary、不改性 M80.5。
> 依据 `M81a_PROTOTYPE_CARRIER_DECISION.md` 与 `M81a_CARRIER_GATE_CHECK_REPORT.md`。

---

## 1. Setup Result

**CONDITIONAL PASS（条件性通过）**

- Application Boot：运行态成功启动，无阻断错误（证据见第3节）。
- 最低探索链、Object Model、Shell 形态：静态代码核验已具备（Carrier Gate Report 第3节），运行态 server 可承载其加载。
- 条件：真实用户验证阶段须在浏览器中走完"进入→理解→关联→继续探索"交互链，确认点击链无断裂（交互级验证超出本只读 Setup 范围，留待验证执行）。

---

## 2. Option A Final Decision

**建议：Adopt Option A（Existing Frontend Demo State）**

- 运行态验证确认 frontend 可正常启动、页面可加载、挂载点存在，无启动期阻断缺陷。
- 满足 Carrier Gate 检查1/2/3 PASS、检查4 PARTIAL（Trail 状态层留 M83）、检查5 由 PARTIAL 转 PASS（运行态无阻断）。
- **仍由 PO 最终拍板**（见第5节 Decision Point）。若 PO 认定交互级风险不可接受，可降级 B。

---

## 3. Runtime Evidence

### 3.1 Application Boot Check（检查1）
- 启动命令（只读观测）：`npm run dev`（vite v5.4.21）。
- 结果：**PASS**。
- 证据：
  - `VITE v5.4.21 ready`
  - 本地地址 `http://localhost:5173/`
  - HTTP 请求：`HTTP_STATUS=200`，`BODY_LEN=2366`，`HAS_ROOT=True`（SPA 挂载点 `#root` 存在）。
  - 无编译错误、无启动阻断日志。
- 说明：`HAS_MAIN_JS=False` 为误判——vite dev 以 `<script type="module" src="/src/main.tsx">` 注入，非经典 `.js`，属正常 dev 行为。

### 3.2 M81a Minimum Exploration Flow Check（检查2）
- 运行态 server 已可加载承载以下静态核验出的链（Carrier Gate 第3节）：
  - 进入主题：`DiscoverPage`（Featured=silk_road + 六类实体入口）
  - 理解对象：`EntityExplorationGuide`
  - 发现关系：`ConnectionsExplainedPanel` / `ContinueExploringPanel`
  - 继续探索方向：`ContinueExploringPanel`
- 结论：最低链**可观察**。交互点击验证留待用户验证阶段。

### 3.3 Object Model Runtime Check（检查3）
- 运行态保持语义（未触碰 ontology/schema/backend model）：
  - Entity = 历史对象/主角（`EntityExplorationGuide` 呈现）
  - Relationship = 解释性关联（`ConnectionsExplainedPanel` 解释式连接）
  - Timeline = 时间上下文（`TimelinePanel` BCE/CE 分桶）
- 结论：运行态语义一致。

### 3.4 Shell Runtime Check（检查4）
- Current Exploration State：进入实体后上下文呈现存在 ✅
- Open Exploration Threads：`ContinueExploringPanel` 提供续接方向 ✅
- **Trail — 明确记录**：现有 `ExplorationTrail` 组件为**导航足迹**（渲染"你的探索足迹"，标注 `M5-B-2`，空态返回空），**不是 M80.5 Personal Exploration Trail 持久化层**（归 M83）。本 Setup 不实现 Trail，仅记录此区分，不作 M80.5 Trail 状态层验证。

### 3.5 Data Availability Check（检查5）
- 场景 A（秦统一→汉承秦制→罗马同期）：依赖 KG 中既有 Signal 数据与演示主题配置。**未核验演示数据是否含目标关联**——记录为待验证缺失项，禁止补数据。
- 场景 B（跨文明思想/技术传播）：同上，依赖现有数据，缺失仅记录。
- 结论：数据充分性留待用户验证阶段按真实 Explorer 行为观察，本 Setup 不调数据。

### 3.6 Runtime Pollution Check（检查6）
- 运行态无启动阻断、无编译错误、无空白/错误态（server ready + HTTP 200）。
- 交互级点击链/空白态需浏览器人工确认，超出本只读 Setup 范围，已记录为条件项。
- 发现问题：无启动期污染。交互期风险若现，按 Carrier Gate 约定"只记录不修复，触发降级 B"。

---

## 4. Known Limitations（已知限制）

1. **交互级未验证**：本 Setup 仅确认启动与页面可加载，未用浏览器走完点击链；交互断裂风险未在本次排除。
2. **Trail 状态层不可验**：现有足迹组件 ≠ M80.5 Trail；完整 Shell 三层验证待 M83 后。
3. **数据充分性未知**：场景 A/B 关联数据是否在演示态就位未核验，可能影响 North Star 信号2 观察。
4. **单入口观测**：仅验证 `localhost:5173` 首页与挂载点，未遍历所有子路由运行态。

---

## 5. Boundary Check（合规核验）

- 修改 frontend/backend？**否**（仅启动观测，未改任何源文件；已停止 dev server）。
- 修 bug / 新增组件 / 调整数据？**否**。
- 修改 M80.5？**否**。
- 进入 M83 / M83.5？**否**（Trail 仅记录非实现）。
- 触碰 ENTITY=8 / RELATIONSHIP=18 / Runtime 0.13.0 / AI Trust Boundary / Ontology / Schema？**否**。
- 写码 / 建页面 / 开始用户测试？**否**（仅运行态准入，未招募 Explorer）。
- Trail 误为收藏？**否**（明确区分足迹组件与 Personal Trail）。
- AI 变预设功能？**否**（未实现/未选型 AI）。

---

## 6. PO Decision Point（最终选型，Agent 不代裁）

请 PO 基于本报告与 Carrier Gate Report 拍板：

- [ ] **Adopt Option A**：认可 CONDITIONAL PASS，授权进入真实用户验证（浏览器走链 + Explorer 招募）。
- [ ] **Downgrade to Paper Prototype**：若认定交互级风险/数据缺失不可接受。
- [ ] **数据准备确认**：场景 A/B 关联数据是否就位（影响信号2，不涉代码修改，可另行安排）。

> 选型填毕即关闭 M81a Setup Gate，进入 M81a Prototype Validation Execution（用户测试执行）。
