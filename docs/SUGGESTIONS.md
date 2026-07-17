# History Explorer — AI 建议汇总（Backlog）

> 整理日期：2026-07-14（Sprint 5 收尾补充）
> 用途：汇总 AI 在各任务验收后主动提出的后续建议，供统一规划（统筹）参考。
> 来源：本次会话记录 + 项目工作记忆（`.workbuddy/memory`）。
> 说明：对话检索索引当前未覆盖本会话，故以可检索记录为准；若你记得我曾提过其他建议，告诉我即可并入本表。

## 状态图例

- ✅ 已采纳 · 待实施：用户已同意，可排期落地
- 🔵 已实现 / 已关闭：建议已落地或问题已解决
- ⚪ 待定：用户尚未决策

---

## A. 前端体验与交互

### A1. 关联实体可点击探索

- **提出时机**：S3-009 / S3-010 验收后
- **内容**：让探索结果中的 `related_entities`（及相关实体）支持点击，点击后以其 id/名称触发一次新的 `/explore/{topic}` 请求，形成"探索 → 连接发现 → 再探索"的可导航闭环。
- **价值**：把产品核心的"连接发现"从静态展示升级为可交互探索，是 `Product_DNA.md` 中"Everything Connected / AI As Guide"主张的直接落地。
- **成本 / 风险**：中等。当前 `App` 仅持有单个 `result` 与 `topic`，需新增一个"探索栈/历史"；在不引入路由或全局状态库的前提下，可用组件内栈数组实现。需兼顾返回/重置交互。
- **状态**：🔵 已实现 / 已关闭（已由 M-H1 落地：关联实体可点击，触发新探索）

---

## B. 测试与质量保障

### B1. 最小 pytest 锁 API 契约

- **提出时机**：S3-009 / S3-010 验收后（本轮用户已回复"可以"）
- **内容**：新增一个最小 pytest，用 FastAPI `TestClient` 对 `GET /explore/{topic}` 做结构断言——校验 8 个顶层字段（`topic/title/summary/timeline/entities/relationships/connections/exploration`）齐全，且 `exploration.main_entity` 与 `related_entities[].relationship` 结构合法；覆盖已知 topic 与未知 topic（fallback）两种情况。
- **价值**：以接近零的成本防止后续改动无意破坏前后端契约（前端目前依赖 `connections` 兼容字段与 `exploration` 结构）。
- **成本 / 风险**：低。新增 `pytest` + `httpx` 依赖与一个测试文件；不触碰业务代码。
- **状态**：🔵 已实现 / 已关闭（已由 M-H2 落地：backend/tests/test_explore.py + 前端 vitest 冒烟测试）

---

## C. 文档与可维护性

### C1. 补全 docs/INDEX.md 文档索引

- **提出时机**：S3-010 验收后
- **内容**：`docs/INDEX.md` 仍是 S0-001 留下的 0 字节占位文件。补全为文档导航索引，链接：API 文档（`docs/api/exploration_api.md`）、各架构/产品文档、数据扩展指南（`data/README.md`）、开发环境文档等。
- **价值**：提升 12+ 份文档的可发现性，降低新人/协作者上手成本。
- **成本 / 风险**：低。纯文档，无代码改动。
- **状态**：⚪ 待定

---

## D. 历史已解决（供参考，非待办）

### D1. 清理剩余空占位文件（CHANGELOG.md / CONTRIBUTING.md）

- **提出时机**：S1-007 验收后
- **内容**：S1-007 清理了空的 `ROADMAP.md`，建议另立任务清理同样为空的 `CHANGELOG.md` / `CONTRIBUTING.md`。
- **状态**：🔵 已在 S1-008 实施并推送（`505cc6f`），仓库根目录占位已清零。

---

## E. Sprint 5 体验整合（收尾）

### E1. 合并"关系树"与"关联实体列表"的重复展示

- **提出时机**：S5-003 验收后首次提出，并在 S5-004 / S5-005 / S5-006 每轮结尾重复提醒
- **内容**：`RelationshipView`（S5-003 新增的纯 CSS 关系树）与 `RelatedEntityList`（S5-001 起的 "Related Exploration" 扁平列表）展示的是**同一批数据**——都是围绕主实体的 `related_entities`，两处并存造成信息重复。
- **价值**：符合 Sprint 4《Visualization_Principles / Discovery_Model》反复强调的"避免信息过载（Avoid Overload）"。合并后页面更聚焦，也减少未来维护两份近似 UI 的成本。
- **可选合并方式**：
  - 方案 a（推荐）：保留关系树，退役扁平 `RelatedEntityList`，把 "Connected via {relationship}" 关系标注并入树节点；
  - 方案 b：保留扁平列表，把关系树降级为列表内的可折叠"关系视图"；
  - 方案 c：两者并存但明确分工（树=结构关系，列表=可操作入口）——需与 A1 联动才划算。
- **成本 / 风险**：低-中。纯前端，不碰后端；主要是组件取舍与样式微调。
- **状态**：⚪ 待定（已多次提醒，建议本次统筹定夺）

## F. 已落地的接口预留（供参考，非待办）

- S5-004 `TimelinePanel` 已预留可选 `onEventClick(item, index)` 回调：未来接入可点击事件时无需重构组件。
- S5-006 `AIGuidePanel` 已建立 props 驱动的纯展示占位：未来接入 AI 引导只需传入真实内容，无需改动 App 架构。

---

## G. M1-001 产品评审建议（已批准追加·待统筹）

> 来源：M1-001 Product Review（PASS WITH NOTES）。用户已于 2026-07-14 批准追加进本 backlog。

### G1. 刷新过期状态字段（S1）
- **内容**：更新 PROJECT_CONTEXT.md 的 "Current Project Stage"（现仍写 "Sprint 0"）与 PROJECT_ROADMAP.md 的阶段状态，使其反映 Sprint 5 / M1.0 实际进度；并把 Product_Architecture.md §6 中标注为 "future documents" 的 Information_Architecture / User_Journey 改为"已存在"。
- **价值**：避免新协作者误判进度，消除文档与实现的时间错位。
- **成本 / 风险**：低，纯文档。
- **状态**：⚪ 待定（已批准追加，待统筹排期）

### G2. MVP 范围补"延后"标注（S2）
- **内容**：在 MVP_Scope.md 中把 AI Guide（5.4）与地理/地图上下文（5.5）明确标记为 **deferred / 后续阶段**，与路线图的阶段化交付对齐。
- **价值**：消除"MVP 已包含但实际为占位/未做"的承诺错觉。
- **成本 / 风险**：低，纯文档。
- **状态**：⚪ 待定（已批准追加，待统筹排期）

### G3. 建单一事实源 + 补全索引（S3）
- **内容**：为核心探索闭环与原则建立单一事实源（供其他文档引用，减少在 ~7 份文档中重复抄写）；补全 `docs/INDEX.md` 作为总索引，纳入 Sprint 4 的 6 份探索体验文档。
- **价值**：降低重复内容维护成本，提升大文档集可发现性（与 C1 同源，可合并）。
- **成本 / 风险**：低，纯文档。
- **状态**：⚪ 待定（已批准追加，待统筹排期）

### G4. 增设有序互联示例主题（S4）
- **内容**：把"补充几个互相连接的示例主题（不止罗马帝国）"作为产品就绪目标，以在 MVP 广度上验证"互联探索"价值主张。
- **价值**：当前仅 1 个示例主题，无法演示多主题连接探索。
- **成本 / 风险**：低-中，需补数据文件。
- **状态**：🔵 已实现 / 已关闭（M3-003 已落地：新增 `hellenistic_world` + `silk_road` 两主题，4 主题互联、26 实体、29 关系、6 条跨主题边；详见 `docs/M3-003_Interconnected_Data.md`）

---

## 统筹优先级参考（建议，非决定）

| 优先级 | 建议 | 理由 |
|--------|------|------|
| P0 | M-H1 关联实体可点击闭环（A1/B1/K2/L1） | 决定 M1 核心旅程完整性，复用 §F 已预留回调，成本中 |
| P0 | M-H3 净化 topic 输入（J3/B3/L3） | 便宜、消除潜在路径遍历，进 M2 前必修 |
| P0 | M-H2 最小测试层（B1-pytest/B2/L2） | 质量闸门，进 M2 前必修 |
| P0 | M-H4 文档收口（C1/G1/G3/L5） | 成本低、消除文档与实现错位，M1 签收前必做 |
| P0 | B1 pytest 契约测试 | 已采纳、成本低、防回归价值高 |
| P0 | C1 docs/INDEX.md 索引 | 成本低、文档可维护性强 |
| P1 | M-H5 导航壳（K1） | UI 空间感，纯前端低风险，进 M2 前必修 |
| P1 | M-H6 CI/Docker/可观测（B4/L4） | 从本地到可部署，接受为债或 M2 早期 |
| P1 | E1 合并关系树与关联列表 | 已多次提醒、符合"避免信息过载"、纯前端低风险 |
| P1 | A1 可点击实体探索 | 产品价值高，已并入 M-H1 统筹 |
| P2 | M-H7 API 版本前缀/统一信封（J1/J2） | 延后 M2 |
| P2 | M-H8 知识模型 v2（I1–I4） | 延后 M2/M3 语义层 |
| P2 | G1/G2/G3/G4 M1-001 产品评审建议 | 已批准追加，纯文档/数据、低风险，建议统筹时一并处理 |
| P2 | M-H9 版本管理+技术债文档（L6/L7） | M1 签收前可顺带做 |

> 说明：以上优先级仅为 AI 视角建议，最终排期由你统筹决定。详见下方 §H–§M 与 §M 加固清单。

---

## H. M1-002 架构评审建议（待统筹）

> 来源：M1-002 Architecture Review（PASS WITH NOTES · 架构已冻结 YES WITH NOTES）。原 R1–R5 风险（文件系统耦合 / 单主题 / 硬编码配置 / AI 占位 / 文件制数据层）已随"冻结"决定被接受为已知约束，以下为建议项 N1–N3。

### H1. API Spec 显式化（N1）
- **内容**：把 `GET /explore/{topic}` 的请求/响应结构写成显式、可机器读取的契约（OpenAPI 已自带，但需补全字段语义说明与示例），并明确定义"未知 topic 走兜底"的契约。
- **价值**：降低前后端误解，为后续版本化（见 J1）与测试（B1）铺路。
- **成本 / 风险**：低，纯文档/注解。
- **状态**：⚪ 待定

### H2. 数据边界文档（N2）
- **内容**：明确"文件即数据层"的边界：哪些 topic 有数据、命名约定、缺失时的兜底行为、未来若换数据库/ORM 的切入点。
- **价值**：把"文件制数据层"这一冻结约束显式记录，避免后续误改。
- **成本 / 风险**：低，纯文档。
- **状态**：⚪ 待定

### H3. AI 设计（N3）
- **内容**：记录 AI Guide 的接入边界与未来设计方向（provider 无关、props 驱动占位已就位，见 §F），明确 M1 阶段不接入真实 AI。
- **价值**：冻结当前 AI 占位决策，为 M2+ 的 AI Historian 留清晰接口。
- **成本 / 风险**：低，纯文档。
- **状态**：⚪ 待定

---

## I. M1-003 知识模型评审建议（待统筹）

> 来源：M1-003 Knowledge Model Review（REVISE REQUIRED）。强项：实体泛型化、关系三元组、零重可扩展设计。缺口建议如下，**整体建议延后到 M2/M3 的语义层**。

### I1. 实体富属性（H1）
- **内容**：在 `entity` 上补结构化属性（别名、日期范围、角色、图像/引用等），而非仅 `description` 长文本。
- **状态**：⚪ 待定（延后 M2+）

### I2. 关系元数据（H2）
- **内容**：关系三元组之外补 `confidence / source / directionality / temporal_scope` 等元数据。
- **状态**：⚪ 待定（延后 M2+）

### I3. 时间线结构化（H3）
- **内容**：将扁平 `timeline[]` 升级为带 `start/end/type` 的结构化事件，支撑未来 GIS/时间轴联动。
- **状态**：⚪ 待定（延后 M2+）

### I4. 地理 / 多语 / 来源 / AI 安全（M1–M4, L1–L2）
- **内容**：引入地理抽象（坐标/区域）、多语言标签、数据来源标注；并明确 AI 生成内容的安全与溯源约束。
- **状态**：⚪ 待定（延后 M2+，作为语义层规格）

---

## J. M1-004 API 评审建议（待统筹）

> 来源：M1-004 API Review（REVISE REQUIRED）。含一个真实安全缺口（topic 未净化进文件名）。

### J1. API 版本前缀 /api/v1（H2）
- **内容**：将端点迁移到 `/api/v1/explore/{topic}`，前端同步调整 `API_BASE`；预留未来 `/api/v2`。
- **价值**：避免后续破坏性变更无版本保护。
- **成本 / 风险**：低-中，前后端各一处改动。
- **状态**：⚪ 待定（建议 M2 起步做）

### J2. 统一响应信封 + 错误体（H1）
- **内容**：引入统一 `envelope{ data, error, meta }` 与结构化错误体（code/message），替换当前裸返回 + 偶发 500。
- **成本 / 风险**：低-中。
- **状态**：⚪ 待定

### J3. 输入安全 / topic 净化（H3）→ 同 M1-006 B3 / L3
- **内容**：在访问文件前用 `^[a-z0-9_-]+$` 校验 `topic`，拒绝非法字符，杜绝潜在路径遍历。
- **价值**：当前单段路由不可利用，但设计不安全；一旦路由改用 `:path` 即变高危；现在修极便宜。
- **成本 / 风险**：低。
- **状态**：🔵 已实现 / 已关闭（已由 M-H3 落地：topic 正则校验 `^[a-z0-9_-]+$`）

### J4. 结构化错误与文档补强（M1–M3, L1–L2）
- **内容**：补齐 4xx/5xx 处理、OpenAPI 示例、变更日志。
- **状态**：⚪ 待定

---

## K. M1-005 UI/UX 评审建议（待统筹）

> 来源：M1-005 UI/UX Review（REVISE REQUIRED）。核心问题：软死端（实体不可点击）+ 无导航壳。

### K1. 导航壳（H1）
- **内容**：加一个轻量导航/面包屑壳，呈现"当前主题 / 上一主题"，让探索有空间感（与 `ExplorationState` 组件呼应）。
- **成本 / 风险**：低-中，纯前端。
- **状态**：⚪ 待定（**建议进 M2 前必修**）

### K2. 可点击实体（H2）→ 同 A1 / M1-006 B1 / L1
- **内容**：将关联实体变为可点击，点击触发新探索，闭合"探索→连接→再探索"循环。
- **价值**：M1 核心旅程完整性；复用 §F 已预留的 `onEventClick` 与探索栈即可。
- **状态**：🔵 已实现 / 已关闭（已由 M-H1 落地，与 A1 同一条）

### K3–K6. 响应式 / 视觉一致性 / 组件复用 / 空态（M1–M4, L1–L3）
- **内容**：补响应式断点、统一空态/加载态、确认组件复用边界。
- **状态**：⚪ 待定（可随 K1/K2 一并做）

---

## L. M1-006 发布就绪评审建议（待统筹）

> 来源：M1-006 Release Readiness Review（REVISE REQUIRED · 软闸门）。结论：底座可进 M2，但 M1 签收前需处置以下项。

### L1. 修点击闭环（B1）→ 同 A1 / K2
### L2. 最小测试层（B2）→ 同 B1 pytest
### L3. 净化 topic 输入（B3）→ 同 J3
### L4. 可观测性 + CI/部署（B4）
- **内容**：补应用日志 + 健康检查端点（如 `/healthz`）；加 GitHub Actions（install→typecheck→build→test）+ Dockerfile；把 CORS 源 / API 地址外部化为环境变量。
- **价值**：从"本地能跑"提升到"可部署、可运维"。
- **成本 / 风险**：中。
- **状态**：⚪ 待定（接受为 M1 债，或 M2 早期快速跟进）

### L5. 文档收口（INDEX / README / 分类目录 / backlog 折入）
- **内容**：补全 `docs/INDEX.md`（链接根目录 20 份文档）；刷新 README "Project Status"（现仍写 Sprint 0，同 G1）；将 M1-002~M1-005 建议折入本 backlog（本次已执行）；`docs/0x_*` 空分类目录要么填充、要么在 INDEX 中说明。
- **价值**：消除文档与实现的时间错位，提升可发现性。
- **成本 / 风险**：低，纯文档。
- **状态**：🔵 已实现 / 已关闭（已由 M-H4 落地：README 状态更新 + INDEX 重建 + 0x 目录说明）

### L6. 版本管理（CHANGELOG + tag）（新增）
- **内容**：加 `CHANGELOG.md` 并打 `v0.1.0` tag，记录 M1 范围。
- **成本 / 风险**：低。
- **状态**：⚪ 待定

### L7. 技术债文档（新增）
- **内容**：建 `TECHNICAL_DEBT.md` 汇总临时方案（如 `_generic_exploration` 硬编码兜底），标明"接受为债"的项。
- **成本 / 风险**：低。
- **状态**：⚪ 待定

---

## M. M1 加固任务清单（M1 签收 / 进 M2 前）

> 从 L/B/A 提炼的精简清单，按"必修优先"排序。完成 P0/P1 项即可将 M1 从 REVISE REQUIRED 推进到可签收；P2 项可排进 M2。

| 编号 | 任务 | 关联合并项 | 处置 | 优先级 | 状态（2026-07-14） |
|------|------|-----------|------|--------|------------------|
| M-H1 | 关联实体可点击，闭合探索循环 | A1 / B1 / K2 / L1 | 进 M2 前必修 | P0 | 🔵 已完成（PASS） |
| M-H2 | 最小测试层（后端契约 + 前端冒烟） | B1-pytest / B2 / L2 | 进 M2 前必修 | P0 | 🔵 已完成（PASS） |
| M-H3 | 净化 topic 输入（正则校验） | J3 / B3 / L3 | 进 M2 前必修 | P0 | 🔵 已完成（PASS） |
| M-H4 | 文档收口（INDEX + README 状态 + backlog 折入） | C1 / G1 / G3 / L5 | M1 签收前必做 | P0 | 🔵 已完成（PASS，本任务） |
| M-H5 | 加导航壳 | K1 / L(UX) | 进 M2 前必修 | P1 | ⚪ 待定（M2） |
| M-H6 | CI + Dockerfile + 可观测性 + 外部化配置 | B4 / L4 | 接受为债或 M2 早期 | P1 | ⚪ 待定（M2 债） |
| M-H7 | API 版本前缀 /api/v1 + 统一信封 | J1 / J2 | 延后 M2 | P2 | ⚪ 待定（M2） |
| M-H8 | 知识模型 v2（富属性/时间/地理/来源/多语） | I1–I4 | 延后 M2/M3 | P2 | ⚪ 待定（M2/M3） |
| M-H9 | 版本管理（CHANGELOG+tag）+ 技术债文档 | L6 / L7 | M1 签收前可顺带做 | P2 | ⚪ 待定 |

---

## N. M2 数据质量与一致性建议（2026-07-15 追加）

> 来源：M2-005 启动校验（`GET /health` / `backend/app/validation.py`）+ M2-006 文档同步。
> 详细说明见 `M2_Planning.md`（as-executed v2.0）与 M2 Final Report。

### N1. 消除 `tp-27bc` 孤立实体（数据质量）
- **内容**：`roman_empire` 中 `tp-27bc`（Time Period "27 BC"）无任何关系，启动校验报 `ORPHAN_ENTITY` 警告。可二选一：① 给它补一条关系（如 `event-roman-empire-established — contemporary_with — tp-27bc`）；② 确认其为纯时间锚点、接受该警告并在 `validation.py` 中对 `Time Period` 类型降权（不报 orphan）。
- **价值**：消除健康报告噪音，让"0 warning"成为可达目标。
- **成本 / 风险**：低（改一个 JSON 或一行校验规则）。
- **状态**：⚪ 待定（当前为已知 warning，不影响运行）

### N2. 消解 `Kemet` 重复别名（数据质量）
- **内容**：`egypt_technology_religion` 中 `civ-egypt` 与 `loc-ancient-egypt` 都带别名 `Kemet`，启动校验报 `DUPLICATE_ALIAS` 警告。可二选一：① 去掉其一的 `Kemet` 别名（如 Location 改用 `Ancient Egypt` 为主名、保留 `Kemet` 仅给 Civilization）；② 若确为同一实体的两种视角，改为共享实体 + `part_of` 关系，而非两个实体重复别名。
- **价值**：避免搜索/消歧时把两个实体混为同一。
- **成本 / 风险**：低。
- **状态**：⚪ 待定（当前为已知 warning，不影响运行）

### N3. 前端 Hero 文案与"无 AI"实现不一致（一致性）
- **内容**：`frontend/src/App.tsx` 的 hero 原写 "An AI-powered global history exploration platform."，与 M2 无 AI 运行时（`AIGuidePanel` 为占位）不符。`README.md` 标题已改为 "Global History Exploration Platform" 并加 M2 说明。M2-006 已将该 hero 文案改为 "A data-driven global history exploration platform."，使 UI 文案与 README、实现三者一致（改一行静态文案，非功能/非重设计）。
- **价值**：文档/实现/UI 文案三者一致，避免评审误解。
- **成本 / 风险**：极低。
- **状态**：🔵 已实现 / 已关闭（M2-006 修正）

### N4. M2-004 原范围的部分能力延后（架构一致性）
- **内容**：原 M2-004（KG Ready）计划的交叉主题索引 + 统一 `findById/findByGlobalId/findByAlias/findByName` 查找服务 + relationship/timeline 索引（outgoing/incoming、year/century/period）**未实现**；其校验意图已并入 M2-005，但索引/查找服务部分**延后到 M3 图工作**。当前 `_ENTITY_INDEX`（M2-002.5）已覆盖全局 id 查找，单主题遍历足够，故 M2 无功能缺口；仅记录以备 M3 不重复造轮子。
- **价值**：明确"已做 / 延后"边界，避免 M3 误以为这些能力已存在。
- **成本 / 风险**：无（记录项）。
- **状态**：🔵 已记录（M2-004 标记 superseded，详见 `M2_Planning.md` §Appendix A/B）

### N5. 基础设施类 M2 债（CI/Docker/版本化）显式延后
- **内容**：原 `M2_Planning.md` v1.0 把 CI / Dockerfile / `/healthz` / `/api/v1` / 统一错误信封 / `CHANGELOG` / `TECHNICAL_DEBT` 放在 M2-006。实际执行的 M2-006 是 **Alpha Ready 清理**（明确禁止新增功能/依赖），故上述项**均未做**，记录为 M3+ 债。其中 `/health`（M2-005）已提供数据健康面，但非运维 `/healthz`（存活探针）。
- **价值**：诚实反映范围，避免"声称已部署就绪"的错觉。
- **成本 / 风险**：无（记录项）。
- **状态**：🔵 已记录（详见 `M2_Planning.md` Out of Scope / §Appendix B）

### N6. E1（关系树 + 关联列表合并）仍未处置
- **内容**：`App.tsx` 在 topic 视图同时渲染 `RelationshipView`（关系树）与 `RelatedEntityList`（扁平关联列表），二者展示同一批 `related_entities`（见 §E1）。M2-003 未合并。M2-006 按"禁止重新设计 UI"未动。
- **价值**：消除重复展示、聚焦页面（符合 Avoid Overload）。
- **成本 / 风险**：低-中，纯前端。
- **状态**：⚪ 待定（同 §E1，建议 M3 前统筹）

> 以上 N1–N6 为 M2 收尾的后续建议，全部不阻塞 M2 Alpha Ready；是否处置由你统筹决定。

---

## O. M3-001 Knowledge Core Foundation 后续（2026-07-16 追加）

> 来源：M3-001 架构升级完成（`backend/app/core/` 知识核心 + `KnowledgeService` Facade + 全局 Registry + Graph/Traversal + 可替换 `SearchProvider` + Validation 消费 `KnowledgeService`）。全部 60 后端测试通过，`/health` 与 M2-005 逐字节兼容。
> 原则：超出 M3-001 范围的需求（AI/Neo4j/GIS/Recommendation/Graph UI 等）只记录，不提前实现。本次改动未提交 git（"统筹考虑"约定延续）。

### O1. M3-002 API & Ops Hardening（架构已就绪）
- **内容**：`TopicRepository` + `KnowledgeService` 已就位，下一步可做 `/api/v1` 前缀 + 统一响应信封（J1/J2）、结构化错误、CI/Dockerfile/`/healthz`（L4）、`CHANGELOG`+tag（L6）。同时建议移除 `main.py` 的兼容 shim（`_ENTITY_INDEX`/`_get_entity_index`/`_load_topic_data`），把测试改为直接 import `core` / `knowledge_service`。
- **价值**：从"本地能跑"提升到"可部署、可运维 + 版本保护"。
- **成本 / 风险**：低-中。
- **状态**：🔵 已实现 / 已关闭（M3-002 已落地：见 §P 与 `docs/M3-002_Architecture.md`）。注：本次已做 `/api/v1` 路由体系（J1）+ `/healthz` 存活探针 + 配置外部化（`config.py`）+ `logging` 替换 `print`（L4 部分）；统一信封（J2）/ shim 移除 / `CHANGELOG`+tag 等显式延后，见 §P。

### O2. M3-003 Interconnected Data（架构已支持，数据待补）
- **内容**：当前数据 **0 条跨主题边**。架构已原生支持 `global_id` 跨主题解析与 `find_related`/`find_by_alias`；下一步补"互联主题"示例数据（G4）+ 跨主题关系（他主题实体用 `topic:id` 引用）+ 前端跨主题导航。届时 `validation._validate_cross_topic` 的跨主题校验会真正生效（当前无数据故 0 条）。
- **价值**：验证"互联探索"产品主张（当前仅 2 个孤立主题）。
- **成本 / 风险**：低-中，需补数据文件 + 前端。
- **状态**：🔵 已实现 / 已关闭（M3-003 已落地：4 主题互联、26 实体、29 关系、6 条跨主题边，`/health` 由 2 warning→0 warning；新增 `docs/M3-003_Interconnected_Data.md` + `backend/tests/test_interconnected.py`）。注：跨主题关系用 `namespace:id` 全局 id 表达，已由 `validation.py` 全局解析（避免误判 dangling）。

### O7. 跨主题图遍历（Knowledge Layer 增强，M3-003 发现）
- **内容**：M3-003 验证发现——`KnowledgeService.find_related` / `get_graph` 是**单主题**图（M3-001 `graph.py` 的 per-topic 邻接），跨主题 `global_id` 边在构图时被跳过（dropped as dangling-by-design）。因此"点击罗马→直接看到埃及邻居"在**图层面**目前做不到；但**注册表层**（`find_by_global_id` / `resolve_entity` + 关系数据）已能完整解析跨主题网络（已用测试证明：Rome→(Hellenistic)→Egypt、Rome→Silk Road→Han China 均可达）。
- **价值**：明确"数据已互联、图遍历需补"的边界，避免误以为单主题 `neighbors()` 已跨主题。
- **成本 / 风险**：低-中。建议作为 **M3-004 或 M3-005 的 Knowledge Layer 增强**：在 `core/` 新增 `GlobalGraph`（基于现有 per-topic 图 + 全局 `resolve_entity` 合并跨主题边）与 `KnowledgeService.find_related_global(topic, id)`，保持 Additive、不改公共 API 形状、不动 Repository。
- **状态**：🔵 已实现 / 已关闭（M3.5-001 已落地：`core/global_graph.py` 统一跨主题图 + `KnowledgeService` 接线 `get_global_graph`/`find_global_path`/`global_neighbors`/`global_subgraph`；纯 Knowledge Layer 增强、未独立成 Service、未改公共 API/前端、零新依赖。跨主题 `neighbors()` 现已可用；排序/推荐在 M3.5-002/003）

### O3. M3-004 Search v2（Provider 已可替换）
- **内容**：`SearchProvider` 已与存储/Knowledge Core 解耦；下一步扩展 `TimelineIndex` 的 year/century/period 查询、模糊/语义检索、结果分页。
- **价值**：搜索从"字符串匹配"升级为结构化检索。
- **成本 / 风险**：低-中。
- **状态**：⚪ 待定（建议 M3-004）

### O4. M3-005 UI Depth（Graph 能力已在核心，UI 未做）
- **内容**：Graph / traversal 已在 Knowledge Layer（`find_related` / `get_graph`）；**Graph 可视化（Graph UI）属于此 Checkpoint，M3-001 未做**。
- **价值**：把"连接发现"从列表升级为可视化。
- **成本 / 风险**：中，纯前端。
- **状态**：⚪ 待定（建议 M3-005）

### O5. M3-006 Release & CI
- **内容**：补齐 CI/Docker、commit 当前 M2/M3 未提交改动（"统筹考虑"约定延续至今）。
- **价值**：消除长期未提交债。
- **成本 / 风险**：低。
- **状态**：⚪ 待定（建议 M3-006）

### O6. 明确不提前实现（M4+）
- **内容**：AI / LLM、Neo4j、GIS/地图、Recommendation、第三方图库——全 M4+。Repository 抽象即为未来切 Neo4j 的接缝：新增 `Neo4jTopicRepository` 并替换组合根一处即可，公共 API 与前端契约不变。
- **状态**：🔵 已记录（架构预留，不实现）

---

## P. M3-002 API & Ops Hardening 后续（2026-07-16 追加）

> 来源：M3-002 已完成（`/api/v1` 路由体系 + 冻结 legacy 兼容、`config.py` 环境配置、`logging` 替换 `print`、`/health`(readiness) 与 `/healthz`(liveness) 分离、响应硬化头 `X-API-Version`/`X-Content-Type-Options`）。全部 **68 后端测试 + 38 前端测试 + build 51 modules 0 error** 通过。未提交 git（"统筹考虑"约定延续）。

### P1. 前端切换到 /api/v1（可选）
- **内容**：前端当前仍走 legacy 路由（`/explore` 等），因 M3-002 保留了 legacy 兼容路由。可在前端把请求统一拼 `/api/v1` 前缀（如 `API_BASE + '/api/v1'`）以正式指向 canonical API；legacy 路由继续保留以防回退。
- **价值**：让前端明确消费版本化 API，体现版本保护意图。
- **成本 / 风险**：低（前端 fetch 路径前缀 + 回归测试）。
- **状态**：⚪ 待定（可选；M3-002 保留 legacy 故非必须）

### P2. 统一响应信封 + 结构化错误（J2）显式延后
- **内容**：M3-002 为保冻结契约**未引入**统一 envelope，仅加响应头硬化。若未来要统一 `{ data, error, meta }` 信封，需专用 API-evolution checkpoint，并支持双读（旧裸体 + 新信封）过渡期，避免破坏 M2/M3 已冻结端点。
- **价值**：版本演进可控。
- **成本 / 风险**：中（需兼容策略）。
- **状态**：⚪ 待定（M4+ 或专门 checkpoint）

### P3. 移除 main.py 兼容 shim（技术债）
- **内容**：M3-002 为不破坏既有测试**保留**了 `_ENTITY_INDEX`/`_get_entity_index`/`_load_topic_data`/`_exploration_from_data` shim；这些已冗余（v1 路由 + KnowledgeService 已覆盖）。建议下一个清理 checkpoint 把 `test_search_index.py`/`test_explore.py` 改为直接 import `core`/`knowledge_service`，再删除 shim。
- **价值**：消除组合根冗余。
- **成本 / 风险**：低。
- **状态**：⚪ 待定

### P4. 版本号 0.1.0 → 0.2.0-alpha（发布相关）
- **内容**：M3-002 把 `APP_VERSION` 外部化为环境变量，默认仍 `0.1.0`（M2 发布评审要求 bump 到 `0.2.0-alpha`）。该 bump 属发布动作，留到 M3-006 Release 随 `CHANGELOG`+tag 一起做。
- **价值**：版本与发布一致。
- **成本 / 风险**：低。
- **状态**：⚪ 待定（M3-006）

### P5. 结构化错误文档 + 变更日志（J4/L6）
- **内容**：`/healthz`、配置外部化已就位；仍缺 `CHANGELOG.md` + tag、显式 4xx/5xx 文档。属 M3-006 Release & CI。
- **成本 / 风险**：低。
- **状态**：⚪ 待定（M3-006）

> 以上 O1–O6 为 M3-001 收尾、P1–P5 为 M3-002 收尾的后续建议；全部不阻塞 M3-002 完成，推进顺序由你统筹决定。

---

## Q. M3.5 Exploration Engine 系列（2026-07-16 起）

### Q1. M3.5-002 Exploration Engine = 已实现
- **内容**：`core/exploration_engine.py`（确定性、可解释引擎）+ `KnowledgeService` additive 接线（`explore_connections`/`explore_from`）。评分=0.35·relationship_meaning+0.25·temporal_coherence+0.20·entity_importance+0.20·path_simplicity；不引入 AI/GIS/Neo4j/第三方图库，未改 schema 枚举与 global_id 规则，未新增 API/前端。
- **价值**：补全 M3.5-001 GlobalGraph 之上的"为何相关"解释能力，纯算法+单测驱动。
- **状态**：🔵 已实施（backend 94 / frontend 38 全通过；未提交 git）。

### Q2. M3.5-003 Exploration API（建议下一步）
- **内容**：把引擎暴露给客户端，**方案 A（推荐）**=additive 补全 `/entity`、`/explore` 响应（`other.global_id`+`other.topic` + `connections_explained` 块，由 `explore_connections` 构建），不动路由形状；**方案 B**=新增 `GET /api/v1/explore/{id}/path`（仅当 A 不满足 UI 时）。
- **价值**：在不破冻结契约下让前端拿到可解释连接。
- **成本 / 风险**：低（纯投影 + 契约决策）。
- **状态**：⚪ 待定（建议批准后由 Backend Agent 先行，锁定响应契约后再开 M3.5-004 前端）。

### Q3. M3.5-004 UI Prototype（依赖 Q2 契约）
- **内容**：前端消费 M3.5-003 连接数据，做探索路径可视化（非地图、非推荐）。
- **依赖**：必须等 Q2 响应契约锁定。
- **状态**：⚪ 待定（建议 M3.5-003 完成后）。

### Q4. M3.5-002 评分权重可调（未来）
- **内容**：评分权重（relationship/temporal/importance/simplicity 四项系数与 RELATIONSHIP_MEANING 映射）已集中在 `exploration_engine.py` 顶部常量，未来可按产品反馈微调，不影响算法结构。
- **状态**：🔵 已预留（常量集中，未调）。
