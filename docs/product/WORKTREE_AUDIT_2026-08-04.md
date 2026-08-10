# History Explorer — 工作树审计报告

> 审计日期：2026-08-04
> 范围：全工作树（根目录 + 8 个主目录 + 12 个 docs 子目录）
> 目的：梳理每个文件/目录的职责，识别冗余与缺失

---

## 一、目录总览

```
History-Explorer/
├── .github/              # GitHub 配置（CI/CD）
├── .pip_target/          # Python 依赖包（FastAPI/Pydantic/Uvicorn 等 14 个包）
├── .playwright-cli/      # Playwright CLI 缓存
├── .workbuddy/           # WorkBuddy IDE 项目数据
├── ai/                   # AI 能力预留（全部空占位）
├── artifacts/            # 工作产物档案（62 个文件，不进 git）
├── backend/              # Python FastAPI 后端
├── data/                 # 核心数据资产（9 个主题的结构化历史知识）
├── docs/                 # 文档体系（12 个子目录 + 40+ 根级文件）
├── frontend/             # React 18 + TypeScript 前端
├── infrastructure/       # 基础设施预留（空）
├── prompts/              # AI Agent 治理体系（6 种角色模式）
├── scripts/              # 自动化脚本（freeze-check、发布一致性等）
├── tasks/                # 任务预留（空）
├── templates/            # 模板预留（空）
├── [根目录 33 个文件]     # 产品/路线图/章程/发布报告
```

---

## 二、根目录（33 个文件）

### 产品核心文档（7 个）

| 文件 | 大小 | 用途 |
|---|---|---|
| `README.md` | 56KB | 项目入口文档，含项目概述、里程碑记录、开发原则 |
| `PRD.md` | 3KB | 产品需求文档镜像（源自 docx 签名版） |
| `Product_DNA.md` | 3KB | 产品 DNA（探索引擎，非事实数据库） |
| `Product_Constitution.md` | 3KB | 产品宪法（四大原则 + 决策四问） |
| `PROJECT_CHARTER.md` | 3KB | 项目章程（使命/角色/治理结构） |
| `PROJECT_CONTEXT.md` | 37KB | 项目上下文，当前最全面的状态文档 |
| `PROJECT_ROADMAP.md` | 8KB | 路线图 v1.1（M1-M86.5） |

### 开发/环境（3 个）

| 文件 | 大小 | 用途 |
|---|---|---|
| `DEVELOPMENT.md` | 1KB | 开发指南（哲学/结构/规则/启动） |
| `DEVELOPMENT_ENVIRONMENT.md` | 1KB | 开发环境文档 |
| `CHANGELOG.md` | 140KB | 完整变更日志（vM78 回溯） |

### 技术评估（2 个）

| 文件 | 大小 | 用途 |
|---|---|---|
| `TECH_ROUTE_EVALUATION.md` | 8KB | 技术路线评估（评分卡 + A/B/C 决策建议） |
| `PROJECT_HEALTH_REPORT_2026-07-30.md` | 19KB | 全项目健康体检（7 位领域专家评估） |

### 里程碑发布报告（14 个）

| 文件 | 归属 |
|---|---|
| `M35_PRE_RELEASE_PRODUCT_ACCEPTANCE_REPORT.md` | M35 产品验收 |
| `M35_RELEASE_REPORT.md` | M35 发布 |
| `M35.1_PHASE2_IMPLEMENTATION_REPORT.md` | M35.1 Phase 2 |
| `M36_0_IMPLEMENTATION_REPORT.md` | M36 AI 解释层激活 |
| `M62_RELEASE_REPORT.md` | M62 发布 |
| `M62_UX_CONVERGENCE_REPORT.md` | M62 UX 收敛 |
| `M62.5_EXECUTION_PLAN.md` | M62.5 执行计划 |
| `M62.5_STATUS_REPORT_2026-07-30.md` | M62.5 状态 |
| `M62.5_STAGE_B_MIGRATION_DECISION_RECORD.md` | M62.5 迁移决策 |
| `M62.5_W0BIS_FREEZE_SUPPLEMENT_REVIEW.md` | M62.5 冻结补充 |
| `M62.5_W0BIS_W3W4_PREPARATION_REVIEW.md` | M62.5 准备审查 |
| `M62.5_W1_IMPLEMENTATION_REPORT.md` | M62.5 W1 |
| `M62.5_CLOSURE_BATCH01_REPORT.md` | M62.5 收敛 |
| `M69_PHASE2_UI_IMPLEMENTATION_REPORT.md` | M69 UI 实现 |

### M63 专项（2 个）

| 文件 | 用途 |
|---|---|
| `M63_EXECUTION_PLAN_V1.0.md` | M63 执行计划 |
| `M63_STRATEGIC_DIRECTION_REVIEW.md` | M63 战略方向评审 |

### M62.6 治理（1 个）

| 文件 | 用途 |
|---|---|
| `M62.6_GOVERNANCE_READINESS_REPORT.md` | M62.6 治理就绪度 |

### 其他（2 个）

| 文件 | 用途 |
|---|---|
| `RELEASE_READINESS_2026-07-29.md` | 发布就绪度评估（结论 NO-GO） |
| `REPOSITORY_INIT_REPORT.html` | 仓库初始化报告（2026-07-13） |

### 配置（1 个）

| 文件 | 用途 |
|---|---|
| `.gitignore` | Git 忽略规则 |

---

## 三、`backend/` — Python FastAPI 后端

```
backend/
├── .env.example           # 环境变量模板
├── conftest.py            # Domain Registry 隔离（全局单例污染修复）
├── pytest.ini             # Pytest 配置
├── requirements.txt       # 运行时依赖（fastapi/uvicorn/openai）
├── requirements-dev.txt   # 开发依赖（pytest/httpx）
├── README.md              # API 文档
├── app/                   # 主应用
│   ├── main.py            # FastAPI 入口（Composition Root）
│   ├── config.py          # 环境配置（Settings dataclass）
│   ├── validation.py      # 数据质量校验（5 类检查）
│   ├── core/              # 知识核心层
│   │   ├── repository.py          # JSON 文件仓储
│   │   ├── registry.py            # 内存索引（实体/别名/全局注册表）
│   │   ├── graph.py               # 有向图（BFS/最短路径）
│   │   ├── global_graph.py        # 跨主题全局图
│   │   ├── exploration_engine.py  # 探索引擎（路径评分/推荐）
│   │   ├── knowledge_service.py   # 知识服务门面
│   │   ├── temporal_engine.py     # 时间线引擎
│   │   ├── search_engine.py       # 搜索（前缀/别名/模糊匹配）
│   │   ├── provenance_index.py    # 来源索引
│   │   ├── ai_explanation_service.py  # AI 解释服务
│   │   └── causal_chain.py        # 因果链
│   └── ai_gateway/        # AI 网关层
│       ├── grounding_builder.py   # 接地引用构建
│       ├── response_validator.py  # 响应校验
│       ├── exploration_planner.py # 探索规划器
│       └── citation_service.py    # 引用服务
├── tests/                 # 31 个测试文件
├── uvicorn_boot.err       # 启动日志（待清理）
└── uvicorn_boot.out       # 启动日志（待清理）
```

**职责**：纯内存、确定性知识引擎。无 Neo4j/Redis/外部 DB。提供 `/explore`、`/entity`、`/search`、`/ai/explain` 等 API。

---

## 四、`frontend/` — React 18 + TypeScript 前端

```
frontend/
├── package.json           # 项目元信息
├── vite.config.ts         # Vite 构建配置
├── tsconfig.json          # TypeScript 编译配置
├── vitest.config.ts       # Vitest 测试配置
├── playwright.config.ts   # Playwright E2E 配置
├── index.html             # HTML 入口（含背景动画/字体）
├── .env.example           # 环境变量模板
├── vite_boot.err          # 启动日志（待清理）
├── vite_boot.out          # 启动日志（待清理）
├── public/                # 静态资源（favicon.svg）
├── e2e/                   # Playwright E2E 测试
├── src/
│   ├── main.tsx           # 入口
│   ├── App.tsx            # 根组件（43KB）
│   ├── App.css            # 全局样式（40KB）
│   ├── vite-env.d.ts      # 环境变量类型声明
│   ├── components/        # 180+ 组件（按功能域分 10 个子目录）
│   │   ├── ai/            # AI 伴侣（CompanionShell/TrustDisplay 等 17 文件）
│   │   ├── discover/      # 发现页（TopicCard/QuickStartChips）
│   │   ├── entity/        # 实体页（EntityHero/ConnectionExplorer）
│   │   ├── guide/         # 引导（GuidePanel）
│   │   ├── journey/       # 旅程（JourneyPanel）
│   │   ├── package/       # 探索包（PackageJourney/RelationshipChain 等 12 文件）
│   │   ├── shell/         # Shell 占位（CompanionPlaceholder）
│   │   ├── ui/            # 通用 UI（Button/Card）
│   │   └── [根组件]       # 60+ 核心组件（EntityPage/Breadcrumb/HistorianChat 等）
│   ├── data/              # 数据层（90+ 文件）
│   │   ├── explorationGuide.ts      # 探索引导逻辑
│   │   ├── explorationPackages.ts   # 包管理 + GID 索引
│   │   ├── understandingRules.ts    # 关系理解模板（19KB，含 ZH 模板）
│   │   ├── relationshipUtils.ts     # 关系工具（28KB）
│   │   ├── UserBehaviorEvent.ts     # 埋点（M43）
│   │   ├── aiClient.ts              # AI API 客户端
│   │   ├── locale.tsx               # LocaleProvider
│   │   ├── aiFeatureFlag.ts         # AI 功能开关
│   │   ├── entity/                  # 实体数据模型
│   │   ├── workspace/               # 工作区数据模型
│   │   └── ...                      # 分析/智能/审计等模块
│   ├── pages/             # 页面
│   │   ├── DiscoverPage.tsx         # 发现页（16KB）
│   │   ├── ExplorationPackagePage.tsx # 探索包页面
│   │   └── DevCatalog.tsx           # 开发目录
│   ├── hooks/             # 自定义 Hooks
│   │   ├── useNavigationHistory.ts  # 导航历史
│   │   └── usePackageContext.ts     # 包上下文
│   ├── locales/           # 国际化（zh/en/ja × 10 模块 = 30 文件）
│   ├── lib/               # 工具库（workspaceStore/preferences/graphLayout 等）
│   ├── styles/            # 全局样式（tokens/typography/layout-grid/ui/package）
│   ├── utils/             # 工具函数（explorationPersistence）
│   └── __tests__/         # 集成测试（39 文件）
└── dist/                  # 构建输出
```

**职责**：历史探索交互界面。分层：入口 → 页面 → 组件 → 数据 → Hooks → 工具库。

---

## 五、`docs/` — 文档体系

### 5.1 子目录（12 个）

| 目录 | 文件数 | 用途 |
|---|---|---|
| `00_VISION/` | 2 | 产品愿景源。签名 PRD .docx（唯一权威） + README |
| `10_ARCHITECTURE/` | 9 | 架构冻结基线 + ADR。`CURRENT_ARCHITECTURE_BASELINE.md` 为单一入口 |
| `15_DECISIONS/` | 20 | 离散决策记录（ADR），含 ADR 模板 |
| `20_MILESTONES/` | 13 | 里程碑归档（M9 系列为主，迁移待办） |
| `30_TEAM/` | 1 | 团队治理指针 → `TEAM_OPERATING_SPEC_v1.2.md` |
| `90_ARCHIVE/` | 27 | 历史归档（非权威）：M1/M2 设计、旧编号体系 |
| `archive/` | 15+ | 早期设计归档：legacy_structure（v0.2.0/v0.6.0 发布说明） |
| `design-system/` | 4 | 设计系统 V1.0 规范（38KB 主文档） |
| `m71/` | 8 | M71 POC 验证：演示脚本/机构价值/验证报告 |
| `milestones/` | 1 | 产品化里程碑：`M59-productization-foundation.md` |
| `product/` | 21 | 产品策略 + M81a 验证（当前最活跃） |
| `release/` | 2 | 发布闭包：M76/M77 |

### 5.2 根级关键文件（部分）

| 文件 | 大小 | 用途 |
|---|---|---|
| `INDEX.md` | 8KB | 文档总导航地图（L1-L6 分层模型） |
| `AGENT_WORKFLOW_PROTOCOL.md` | — | Agent 工作流与契约框架 |
| `AGENT_OPERATION_PROTOCOL.md` | — | Agent 操作协议 |
| `DEVELOPMENT_PLAYBOOK.md` | — | 开发手册 |
| `ENGINEERING_PLAYBOOK.md` | — | 工程手册（里程碑生命周期） |
| `TEAM_OPERATING_SPEC_v1.2.md` | — | 团队操作规范（冻结版 v1.2） |
| `Documentation_Standard_v1.0.md` | — | 文档标准 |
| `RELEASE_VERSION_POLICY.md` | — | 发布版本策略 |
| `SUGGESTIONS.md` | 31KB | 运行中建议积压 |
| `HISTORY_EXPLORER_AI_CONTEXT.md` | 34KB | AI 上下文文档 |

另有大量 M3/M3.5/M4/M5/M60/M62x/M63 等里程碑报告（尚未迁移进子目录）。

---

## 六、`data/` — 核心数据资产

| 路径 | 用途 |
|---|---|
| `exploration_packages.json` | 4 个官方探索包（中国/丝路/罗马/印度） |
| `evidence_claims.json` | 76 条证据声明（38KB） |
| `sources.json` | 来源注册（15KB） |
| `schemas/exploration_schema.md` | 知识模型契约：8 实体类型 / 18 关系类型 |
| `examples/` | **9 个主题数据集**（API 直接读取） |
| `examples/roman_empire_example.json` | 罗马帝国（36KB） |
| `examples/china_civilization_v1_example.json` | 中国文明 V1（41KB，729 条） |
| `examples/silk_road_example.json` | 丝绸之路（13KB） |
| `examples/ancient_india_example.json` | 古印度（30KB） |
| `examples/hellenistic_world_example.json` | 希腊化世界（20KB） |
| `examples/greek_philosophy_example.json` | 希腊哲学（13KB） |
| `examples/egypt_technology_religion_example.json` | 埃及技术与宗教（13KB） |
| `examples/persian_empire_example.json` | 波斯帝国（14KB） |
| `examples/early_christianity_example.json` | 早期基督教（12KB） |
| `raw/` | 预留（空） |
| `processed/` | 预留（空） |

---

## 七、其他目录

### `scripts/` — 自动化脚本（活跃）

| 文件 | 大小 | 用途 |
|---|---|---|
| `freeze-check.mjs` | 52KB | 冻结守卫：扫描违禁 token/依赖/路径 + ENTITY=8/RELATIONSHIP=18 不变量 |
| `freeze-check.test.mjs` | 8KB | freeze-check 测试 |
| `release-consistency-check.mjs` | 13KB | 发布一致性检查（R1-R7） |
| `emoji-scan.mjs` | 3KB | Emoji 扫描 |
| `m62-structure-check.mjs` | 1KB | M62 结构检查 |
| `visual-check.mjs` | 7KB | 视觉检查 |
| `eval/golden-set.json` | 6KB | 黄金评估集 |
| `eval/run-evaluation.py` | 9KB | 评估运行脚本 |

### `prompts/` — Agent 治理体系（活跃）

| 文件 | 用途 |
|---|---|
| `task-planning-mode.md` | 任务规划 Agent（只读审查，不实施） |
| `implementation-mode.md` | 实施 Agent（Level 1，严格范围内执行） |
| `release-mode.md` | 发布 Agent（Level 2，merge/tag/push） |
| `readonly-audit-mode.md` | 只读审计 Agent（Level 0） |
| `security-audit-mode.md` | 安全/治理审计 Agent |
| `emergency-fix-mode.md` | 紧急修复 Agent（Level 3，最小 hotfix） |

### `artifacts/` — 工作产物档案（62 个文件，不进 git）

| 分类 | 数量 | 内容 |
|---|---|---|
| 架构设计 | 9 | ADR-0011 / HKAP / M74 AI 架构 / M75 蓝图 |
| 健康审计 | 2 | Gate B2 引擎 + Gate B 架构后端 |
| M73 | 5 | Bug 清扫 / 指标关闭 / RC 清单 / 发布 |
| M74 | 20+ | Phase 0-3 全套报告 / Alpha 就绪 / Issue Queue |
| M75 | 5 | 实施计划 / 就绪审查 / 编码契约 |
| 管理框架 | 1 | `MANAGEMENT_FRAMEWORK_DESIGN.md`（设计稿） |
| 里程碑年表 | 1 | `MILESTONE_TIMELINE_M1_TO_M80.md` |
| 项目情报 | 2 | 项目交接报告 / 进度报告 |
| UX 评估 | 1 | HEP-UX-Eval |
| Landing Page | 1 HTML + 6 图片 | `history-explorer-landing.html` |

### 空占位目录

| 目录 | 状态 |
|---|---|
| `ai/` | 预留 AI config/prompts/services（仅 README） |
| `infrastructure/` | 空 |
| `tasks/` | 空 |
| `templates/` | 空 |

---

## 八、当前突出问题

| # | 问题 | 严重度 | 建议 |
|---|---|---|---|
| 1 | `docs/archive/` 与 `docs/90_ARCHIVE/` 双归档目录并存 | 🟡 | 合并为单一归档目录 |
| 2 | `docs/milestones/`（仅 M59）与 `docs/20_MILESTONES/` 双里程碑目录 | 🟡 | 合并到 `20_MILESTONES/` |
| 3 | `docs/` 根级 40+ 文件未迁移进子目录 | 🟡 | 按归属迁移（里程碑→20，决策→15，历史→90） |
| 4 | 根目录 14 个发布报告散落，不在 `docs/` 下 | 🟡 | 移入 `docs/release/` 或根目录 `reports/` |
| 5 | 无中央 Issue Tracker | 🔴 | 按 `MANAGEMENT_FRAMEWORK_DESIGN.md` 创建 `docs/30_TRACKING/` |
| 6 | `backend/tests/conftest.py` 与 `backend/conftest.py` 功能重复 | ⚪ | 删除 tests 下冗余副本 |
| 7 | `*.err` / `*.out` 启动日志未被 `.gitignore` 覆盖 | ⚪ | `.gitignore` 追加 `*.err` `*.out` |
| 8 | `data/raw/` / `data/processed/` 目录为空 | ⚪ | 删除或标注为预留 |
| 9 | `design-system/archive/` 与主文档实质同文 | ⚪ | 确认后删除 archive 副本 |

---

## 九、工作树统计

| 层级 | 文件/目录数 |
|---|---|
| 根目录文件 | 33 |
| `backend/` 模块 | 25+ |
| `frontend/` 组件 | 180+ |
| `docs/` 文档 | 150+ |
| `data/` 数据集 | 9 个主题 |
| `scripts/` 脚本 | 10 |
| `artifacts/` 产物 | 62 |
| **总计** | **约 500 文件** |
