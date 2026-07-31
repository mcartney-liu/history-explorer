# History Explorer 全项目健康体检 —— 总监综合汇总

> 评估时间：2026-07-30 17:41（GMT+8）
> 评估方：项目总监 大湾区靓仔 + 7 位领域专家（许清楚/颜好看/高见远/贾思敏/贝洛奇/严过关/卜宕机）
> 评估范围：**当前 HEAD = `a690645`**（M65 WIP，Companion 真实 AI 模式）；最新 tag = vM62.5
> 方法：7 位专家**并行独立**读真实代码体检 + 总监实拉/交叉核验；带【已核实】者为本轮实拉证据

---

## 0. 项目快照（实拉事实）

| 维度 | 事实 |
|------|------|
| 定位 | 全球历史探索平台。React18 + TS + Vite 前端；Python FastAPI 后端 |
| 规模 | 前端 src **298 文件**、测试 **106 文件（951 测试 0 失败）**；后端 ~30 测试；docs 97 份 |
| 当前 WIP | M65 Companion（Chat/Explain/Discover 真实 AI 模式 + 持久 Workspace）——**纯前端里程碑，backend diff = 0** |
| 工作树 | 干净（仅 1 份未跟踪 `M63_DECISION_WORKSHOP.md`） |
| 门禁 | `freeze-check` ✅ / `emoji-scan`（含 SYMBOL 守卫）✅ / `visual-check` ✅；`release-consistency` **7/7 ✅ 但仅 advisory** |
| 红线状态 | emoji 图标 ✅ 守住 / 紫粉渐变 ✅ 守住 / **AI 运行时 = 受控例外（ADR-0003 批准，默认关闭）** |

---

## 1. 直接回答 PO 三问

### Q1：是否符合期望 / 研发方向是否偏离设想？
**功能愿景上符合，治理流程上偏离。**
- ✅ 符合：AI 向导 + 探索闭环本就是 PRD/DNA 设想，M65 终于把"可信 AI 伙伴"从愿景变成真交互。
- ⚠️ 偏离（实质）：**M65 在 PO 尚未拍板 Q1（AI 角色模型）/Q2（Museum）/Q4（持久工作空间）时，已由工程默认落地"单一 AI 伴侣 + 持久探索 shell"方向，且 git 中无 M63/M64/M65 独立 ADR**，违反 `PROJECT_CHARTER §7「AI Agents must not change product direction without approval」`。这不是技术破线，是**决策流程被工程默认绕过**——正是"方向走偏"的实质。

### Q2：与用户的交互够不够？
**显著变好，但真实 AI 默认不可达。**
- ✅ M65 把 Companion Chat/Explain/Discover 接上既有 `/ai/*`，交互层级明显提升（进步）。
- ⚠️ 真实 AI 运行时**默认关闭**：须 `AI_GATEWAY_ENABLED=true` + `OPENAI_API_KEY` 同时具备才激活（【已核实】`config.py:34` 默认 False、仓库无任何启用提交）。当前用户实际触达的是确定性 fallback。

### Q3：UI 够不够美？
**基础守住，但 M65 新界面"功能接上了、设计层没接"。**
- ✅ 博物馆级暗色 + 古金主视觉守住，无紫粉渐变。
- ❌ M65 Companion 外壳**零 CSS**（浏览器默认样式渲染，无古金/卡片面/字体/active 指示）；图谱组件硬编码**禁用紫 `#7c3aed`** + 浅色调色板，暗底不可读。"够美"目前不成立。

---

## 2. 跨专家共识（5 条真交叉）

1. **M65 方向治理缺口是头号风险**（PM ∩ 架构师共指）：缺 M63/M64/M65 独立 ADR，Q1/Q2/Q4 未拍板即被工程默认——唯一可能动摇产品根基。
2. **视觉/设计层没跟上功能**（UI ∩ 前端共指）：Companion 外壳零 CSS、图谱硬编码禁用紫+浅色、33 处硬编码颜色、token 双向漂移。"AI 能力接上，设计层没接"。
3. **测试"量≠质量"长期无改善**（QA ∩ 前端 ∩ 上份报告一致）：断言锁死中文字面量（现 **523 处 / 63 文件**）、M65 真实 AI **零测试覆盖**、**无 E2E 框架**。
4. **冻结治理退化但红线没破**（架构 ∩ 后端 ∩ 运维）：allowlist 膨胀到 **206 条（17 宽前缀）**、最小权限退化；一致性门禁仅 advisory；`data/` 策展被 freeze-check 跳过。但 freeze-check 实跑 PASSED，emoji/紫粉/AI 受控红线都没破。
5. **上份报告的 P0 已真修复，但一处判定为假阳性**（前端核实）：符号图标 P0-1（10 文件）已清零、工作树 87→1、freeze 越界已补、DS 入库、一致性 7/7 绿——均多位独立核实，是实打实进步；但上份"单文件≤300 行合规、超阈值 0 个"为**假阳性**：实拉 `git show 68cd0fa:App.tsx` 显示 vM62 即 909 行、13 文件超 300，该债务长期存在。

---

## 3. 已核实硬发现（总监亲核 / 交叉核验）

| # | 发现 | 证据 | 性质 |
|---|------|------|------|
| H1 | M65 **未破 AI 红线**，backend diff=0 | git diff HEAD~5..HEAD -- backend/ 空；ADR-0003 + 基线 §3 明文允许 `ai_gateway/` 受控 AI | 修正误判（先前"初步信号"作废） |
| H2 | AI 运行时**默认关闭**，当前无启用提交 | `config.py:34` enabled 默认 False；grep 全仓无 `AI_GATEWAY_ENABLED=true` | 安全 |
| H3 | **M65 缺独立 Freeze Revision ADR** | 仅代码注释"PO-approved 2026-07-30"，docs/15_DECISIONS 无 M65 ADR | 审计缺口 |
| H4 | 单文件 >300 行：**13 文件**（App.tsx 956 / RelationshipInsightPanel 841 / relationshipUtils 759…） | 前端实拉 `git show 68cd0fa` 证 vM62 起即存在 | 技术债（上份误判合规） |
| H5 | 硬编码颜色 **33 处**（非 #fff/#000） | GraphViewPanel 实体调色板 + RelationshipInsightPanel SVG 时间轴 | 违反 P0-3 |
| H6 | M65 Companion 外壳 **0 CSS** | grep `companion-` 仅 `.companion-panel` 有样式 | 视觉倒退 |
| H7 | 图谱硬编码 **禁用紫 `#7c3aed`** + 浅色锌系 | GraphViewPanel:42-51 / RelationshipPathGraph:50-54 | 违反 P0-2 邻近红线 |
| H8 | 符号图标 P0-1 **已清零**、工作树 87→1、freeze 越界已补、DS 入库、一致性 7/7 绿 | 多专家独立 grep/实跑确认 | 真进步 |
| H9 | 测试脆性：**523 处中文字面量断言** / 63 文件；M65 真实 AI 零测试；无 E2E | QA + 前端 grep 确认 | 质量盲区 |
| H10 | allowlist **206 条 / 17 宽前缀** | 架构师实拉 SCOPE_ALLOWLIST | 治理退化 |

---

## 4. 优先级行动清单

### P0（眼前最硬，须 PO 拍板）
| 行动 | 归属 | 说明 |
|------|------|------|
| **补 M65（及 M63/M64）独立 Freeze Revision ADR**；尤其 ADR-0007 追认"单一 AI 伴侣 + 持久 shell"方向或纠偏 | PM + 架构 + **PO** | 唯一动摇根基的治理缺口（charter §7）。**给 PO 选择题**：A 推荐=追认单一伴侣+补 ADR-0007 锁定；B=若选 Toolbox 则 M65 需重构；C=冻结 AI 方向回退占位（最慢） |
| **M65 Companion 外壳补 CSS + 图谱配色抽成 DS 语义 token**（去禁用紫/浅色） | UI + 前端 | "够美"不成立的根因，否则博物馆级质感崩 |
| **M65 真实 AI 运行时补测试**（至少点亮调用链）+ 补 E2E 冒烟 | QA + 前端 | 核心新能力零防护不可发 |

### P1
| 行动 | 归属 |
|------|------|
| 一致性门禁升 **required**（去 advisory）+ 部署/回滚/可观测链路（/health、Sentry、CI 完成 push/tag） | 运维 |
| 硬编码颜色 33 处 **token 化** + token 双向对齐 + CI 裸 hex 扫描 | 前端 + UI |
| 单文件 >300 行**拆分/登记技术债**（更正上份假阳性） | 前端 |
| 数据策展接 **CI required 校验**（data/ 当前被 freeze-check 跳过） | 后端 + QA |
| AI 启用**书面 PO 决策/runbook** + "AI 默认关闭"机器断言 | 后端 + PO |
| allowlist **回收宽前缀 → 精确/按特性目录分组 + TTL** | 架构 |

### P2
| 行动 | 归属 |
|------|------|
| i18n 引擎层英文补齐 + LocaleProvider 迁 `contexts/` + 测试去脆（契约化断言） | 前端 |
| 情报层 M43–M49 **cross-module 校验** + 真实事件流验证 | 架构 + QA |
| React18→19 非破坏性路线 | 架构 |
| 设计 token **强制落地**（DS 不达标 = CI 红） | UI + 架构 |

---

## 5. 给 PO 的一句话总结

项目"**能跑、freeze 红线没破、真实 AI 交互终于落地、emoji/紫粉/DS 入库/工作树/一致性都实打实修好了**"——比上份报告那会儿健康得多。但有两件**真问题必须你拍板**：① M65 在你还没定 Q1/Q2/Q4 时就由工程默认成了"单一 AI 伴侣"方向、且无 ADR，请补 **ADR-0007 追认或纠偏**（这是唯一会动摇根基的）；② M65 新界面"功能接上了、设计层没接"（Companion 外壳零 CSS、图谱硬编码禁用紫），**"够美"目前不成立**。其余（测试脆性、allowlist 膨胀、部署缺失）都是老问题延续，按 P1 排期即可。

> 报告完。7 份专家报告见同目录 `HEALTHCHECK_2026-07-30_{PM,ARCHITECT,DESIGNER,FRONTEND,BACKEND,QA,DEVOPS}.md`；带【已核实】者均经实拉代码确认。
