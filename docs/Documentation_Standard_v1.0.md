# History Explorer Documentation Standard v1.0

> Status: Approved (Land)
> Date: 2026-07-17
> Owner Role: Project Architect (Lead)
> Dependencies: TEAM_OPERATING_SPEC_v1.2 (Frozen), M3.5-000 Schema Freeze Review
> Scope: 全项目文档体系标准；不特化任何 Milestone。

---

## 1. Documentation Philosophy

History Explorer 是一个多 Role（Lead / Backend / Frontend / Data / QA Backend / QA Frontend）、多里程碑（M1…M4…Release）协作的项目。文档是团队之间唯一稳定的契约载体，必须做到：

- **可比对**：同一类文档（如 Completion Report）在所有里程碑结构一致，可直接横向比对。
- **单一真相源**：冻结不变量（Entity Types / Relationship Types / `global_id` 规则等）只定义一次、全文引用，禁止在各文档中重写常量值。
- **无噪音**：文档只承载结论与证据，禁止夹带 Git diff 元数据（`+N / -N / N files / commit hash`）或实现代码。
- **职责清晰**：每类文档明确"谁写、何时写、包含什么、不包含什么"。
- **冻结优先**：任何文档不得与 `M3.5-000` 冻结不变量及 `TEAM_OPERATING_SPEC_v1.2` 冲突；冲突时以冻结文档与团队规范为准。

---

## 2. Document Naming Convention

### 2.1 Milestone Document
格式：`<MILESTONE_ID>_<DocType>.md`

- `<MILESTONE_ID>` 用连字符，例：`M4-002`、`M3.5-003`。
- `<DocType>` ∈ {`Architecture`, `Integration_Report`, `Lead_Review`, `QA_Report`, `Completion_Report`}。
- 合法示例：
  - `M4-002_Architecture.md`
  - `M4-002_Integration_Report.md`
  - `M4-002_Lead_Review.md`
  - `M4-002_QA_Report.md`
  - `M4-002_Completion_Report.md`

### 2.2 Project Document
- 项目级规范/全局文档使用固定 ASCII 文件名（无里程碑前缀）：
  - `PRD.md`、`PROJECT_CONTEXT.md`、`DEVELOPMENT.md`
  - `TEAM_OPERATING_SPEC_vX.Y.md`
  - `Documentation_Standard_vX.Y.md`（本文件）
  - `SUGGESTIONS.md`、`INDEX.md`
  - `M3.5-000_Schema_Freeze_Review.md`（冻结基线，特例保留）
- 文件名只允许 ASCII 字母、数字、连字符、下划线；禁止空格、中文、特殊符号。
- 版本化标准文档采用 `vX.Y` 后缀；演进遵循 TEAM 规范 §14 Versioning（Patch / Minor / Major）。

---

## 3. Document Header Standard

所有 Milestone 文档必须在标题后以引用块固定输出以下元数据：

```
> Milestone:   <MILESTONE_ID>
> Doc Type:    <Architecture | Integration Report | Lead Review | QA Report | Completion Report>
> Date:        YYYY-MM-DD
> Author Role: <Role>
> Status:      <Draft | Review | Approved | Closed>
> Dependencies: <前置里程碑 / 冻结基线 / 团队规范>
```

Project Document 可省略 `Milestone` / `Doc Type`，但须保留 `Status` 与 `Dependencies`。

---

## 4. Glossary

本术语为全项目单一真相源，所有文档直接引用，**禁止重写常量值**。

| 术语 | 定义 |
|------|------|
| `global_id` | 全局实体标识，格式 `{namespace}:{id}`；`namespace` 即 topic 键。 |
| Entity Types | 实体类型集合，**冻结 = 8**（来源 M3.5-000）。 |
| Relationship Types | 关系类型集合，**冻结 = 18**（来源 M3.5-000）。 |
| Cross-topic edge | 两端 `topic` 不同的关系边（跨主题边）。 |
| ExplorationEngine | 确定性 ranking 引擎（`explore_from` / `find_connections`），**冻结不可改**。 |
| Additive-only | 仅新增字段/端点，禁止删除、改名、改语义。 |
| v1 == legacy | `/api/v1` 与 legacy 路由共用同一 handler，行为一致。 |

> 文档中不得出现 "Entity Types = 8" 的字面重复定义；改为 "Entity Types（冻结，见 Glossary / M3.5-000）"。

---

## 5. Validation Standard

所有文档的 Validation 章节统一格式。**仅列出实际适用的 Gate；不适用的整节省略，不写 "N/A"。**

```
## Validation
### Backend
pytest:              <N> passed / 0 failed / 0 skipped
build_validation_report: <healthy | degraded | broken> | Warnings <N> | Errors <N>
### Frontend
vitest:              <N> passed / 0 failed
build:               <N> errors
### Data
build_global_validation_report: <healthy | degraded | broken> | Warnings <N> | Errors <N>
### Performance
<gate 示例：p95 latency / 内存峰值 / 并发上限>
### Security
<gate 示例：依赖扫描 / 密钥扫描 / SAST>
```

规则：
- 数字必须来自实际运行输出，不得估算。
- `healthy` 当且仅当 Warnings = 0 且 Errors = 0。
- 多 Gate（Backend / Frontend / Data / Performance / Security）按需出现，结构同上。

---

## 6. Freeze Compliance Standard

所有里程碑文档的 Freeze Compliance 章节统一用表格，固定 7 维度：

```
## Freeze Compliance
| Dimension         | Status    | Note              |
|-------------------|-----------|-------------------|
| Entity Types      | unchanged | 8（冻结，见 Glossary） |
| Relationship Types| unchanged | 18（冻结，见 Glossary）|
| Schema            | unchanged |                   |
| Schema Version    | unchanged |                   |
| API Contract      | unchanged | additive only     |
| ExplorationEngine | unchanged |                   |
| Version           | unchanged | <X.Y.Z>           |
```

规则：
- 状态只能是 `unchanged` 或 `changed`。
- 若 `changed`，须在 Note 注明 "从 X 到 Y" 并说明是否在冻结门禁内（任何超出冻结的变更须先走 Freeze Review）。
- `Schema Version` 与 `Version` 区分：前者指数据 Schema 版本，后者指应用版本号。

---

## 7. Repository Baseline Standard

所有里程碑收口类文档固定输出 Repository Baseline，6 字段：

```
## Repository Baseline
- Branch:       master
- HEAD:         <commit hash>
- Parent:       <parent commit hash>
- Origin:       <origin/master commit hash>
- Working Tree: <clean | dirty>
- Tag:          <tag | none（existing）>
- Version:      <unchanged | X.Y.Z>
```

规则：
- 数值来自 `git` 实际状态，不得凭记忆填写。
- `Tag` 注明是否既有（existing）或新建。
- 本节点**仅记录状态**，不构成 Git 写操作。

---

## 8. Approval Standard

所有需要签核的文档用统一 Approval 表，固定 3 角色：

```
## Approval
| Role   | Decision         | Date       |
|--------|------------------|------------|
| Lead   | Approved         | YYYY-MM-DD |
| QA     | Approved         | YYYY-MM-DD |
| Release| Approved (User)  | YYYY-MM-DD |
```

规则（与 TEAM 规范一致）：
- **Release Approval 永远由 User 拍板**；Lead 仅可建议/准备，不能把方向批准当 Release 授权。
- **QA 拥有不可推翻的 FAIL 权**；Lead 只能裁决是否阻塞流转，不能改判 PASS。
- 缺失任一行视为未达 Approval 门槛。

---

## 9. Completion Report Template

```
# <MILESTONE_ID> Completion Report

## Objective
<一句话：本 Milestone 目标。>

## Summary
<一句话：最终完成内容。>

## Deliverables
### Backend
<模块/方法/逻辑；无则省略本小节。>
### Frontend
<组件/页面/交互；无则省略本小节。>
### API
<新增/修改字段、端点；说明 additive、v1==legacy；无则省略本小节。>
### Data
<数据集/实体/关系；无则省略本小节。>
### Tests
<测试文件/覆盖点/是否 0 业务代码；无则省略本小节。>
### Documentation
<文档；无则省略本小节。>

> 硬规则：Deliverables 禁止任何 Git Metadata（+N / -N / N files / commit hash）。

## Validation
<采用 §5 统一格式；Backend/Frontend/Data/Performance/Security 多 Gate 按需。>

## Freeze Compliance
<采用 §6 统一表格。>

## Repository Baseline
<采用 §7 统一格式。>

## Scope
### Included
<本 Milestone 明确包含的内容。>
### Excluded
<本 Milestone 明确未包含、留待后续的内容。>

## Remaining Risks
<None blocking.>
<或分类列出：>
### Blocking
<R1: ...>
### Non-blocking
<R2: ...>

## Approval
<采用 §8 统一表格。>

## Next Checkpoint
<明确说明下一 Checkpoint（如 M4-003 / M5 / Release）。>
```

---

## 10. Architecture Report Template

- **何时写**：里程碑启动、进入实现前。
- **负责人**：Lead（起草）/ Role（评审）。
- **必含章节**：
  ```
  ## Objective
  ## Background
  ## Current Architecture Review
  ## Design Decision        （含方案对比表，明确采纳/否决理由）
  ## New Responsibilities   （各 Role 新增职责）
  ## API Contract           （additive 字段/端点；v1==legacy 说明）
  ## Data Flow
  ## Freeze Compliance      （§6）
  ## Risk Assessment        （R1 / R2 ...）
  ## Next Phase Entry       （进入实现的条件）
  ```
- **不含**：实现代码、测试代码、Git 提交、Validation 实测结果（仅设计意图）。

---

## 11. Integration Report Template

- **何时写**：各 Role 实现完成、汇总时。
- **负责人**：Lead（综合各 Agent / Role 产出）。
- **必含章节**：
  ```
  ## Status Overview        （角色 × 状态表）
  ## Hard Constraints Compliance
  ## Per-Role Results
  ## Validation             （§5）
  ## Freeze Compliance      （§6）
  ## Git Scope Note         （仅说明范围，不执行写操作）
  ## Verdict                （PASS → 建议 GO）
  ```
- **不含**：未来里程碑计划、未授权 Git 写操作。

---

## 12. Lead Review Template

- **何时写**：Integration 之后、QA 之前（Lead 独立复核）。
- **负责人**：Lead。
- **必含章节**：
  ```
  ## Scope Verification
  ## Validation Re-run      （§5）
  ## Freeze Compliance      （§6）
  ## Regression Check
  ## Decision               （PASS / FAIL）
  ## Next                   （→ QA 或打回）
  ```
- **不含**：代码修改、替 QA 下结论。

---

## 13. QA Report Template

- **何时写**：Lead Review 通过后，QA 独立复验。
- **负责人**：QA Backend / QA Frontend（只读，证据优先）。
- **必含章节**：
  ```
  ## Independent Re-validation   （§5，实时运行）
  ## Freeze Compliance           （§6）
  ## Runtime Health
  ## Regression                  （pytest 实时）
  ## Git Scope
  ## QA Sign-off                 （APPROVED 或 FAIL）
  ```
- **不含**：任何文件修改、Commit、Push。
- **铁律**：QA 的 FAIL 权不可被 Lead 推翻（见 TEAM 规范 §9）。

---

## 14. Documentation Lifecycle

```
Architecture ──▶ Implementation ──▶ Integration ──▶ Lead Review ──▶ QA
     │                                                              │
     ▼                                                              ▼
Completion Report ──▶ Git Commit ──▶ Release
```

| 步骤 | 输入 | 输出 | 负责人 | Gate |
|------|------|------|--------|------|
| Architecture | 里程碑目标 + 冻结基线 | Architecture Report | Lead | 冻结符合 + 设计决策明确 |
| Implementation | Architecture Report（Approved） | 代码/测试/数据 | Backend/Frontend/Data | 测试绿 + additive-only |
| Integration | 已实现变更 | Integration Report | Lead | 各 Role 完成 + Validation healthy |
| Lead Review | Integration Report + 变更 | Lead Review | Lead | 范围/Validation/Freeze 核对 |
| QA | 已 Review 变更 | QA Report | QA Backend/Frontend | 独立复验；FAIL 权不可推翻 |
| Completion Report | QA APPROVED | Completion Report | Lead | 全章节齐 + Baseline 一致 |
| Git Commit | Completion Report | Commit（本地） | Lead | 仅批准文件；不 push |
| Release | Commit(s) + Completion Report | Tag/Version/Changelog | **User**（Release Approval） | 用户签字 |

---

## 15. Document Ownership Matrix

与 TEAM_OPERATING_SPEC_v1.2 §6 Artifact Ownership 对齐：

| 文档类型 | 归属 | 说明 |
|----------|------|------|
| Architecture Report（每里程碑） | Lead 起草 / Role 评审 | 非实现文档 |
| Integration Report | Lead | 综合各 Role 产出 |
| Lead Review | Lead | 独立复核 |
| QA Report | QA Backend / QA Frontend | 只读复验，FAIL 权不可推翻 |
| Completion Report | Lead | 里程碑收口 |
| Freeze Doc（M3.5-000） | Lead 托管 / **User 批准** | 冻结不变量 |
| ADR | Lead | 编号 ADR-xxx，入 `docs/adr/` |
| Changelog | Lead | 版本/里程碑变更记录 |
| Documentation Standard | Lead | 本文件；演进走 TEAM §14 |
| PRD / Project Context | Lead / Product | 产品真相源 |
| SUGGESTIONS.md | Lead | 运行式 backlog |

---

## 一致性声明

本标准：
- 不依赖任何具体 Milestone（全文使用 `<占位符>`）。
- 不写死 M4-002 或任何具体数字（8/18 等仅作为 Glossary 引用示例，实际来自冻结源）。
- 不含代码实现细节（仅描述文档结构与职责）。
- 不含 Git diff 元数据（`+N / -N / N files` 被显式禁止）。
- 不与 TEAM_OPERATING_SPEC_v1.2 冲突；Document Ownership Matrix 与其 §6 对齐。
