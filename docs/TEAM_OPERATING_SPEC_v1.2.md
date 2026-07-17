# History Explorer — Team Operating Specification

| | |
|---|---|
| **Version** | v1.2 (Frozen) |
| **Status** | 🔒 Frozen — 不再演进；任何修改须走 §14 Specification Versioning |
| **Frozen Date** | 2026-07-17（用户指令："现在冻结，不继续演进 v1.2"） |
| **Effective From** | M4 起作为长期团队基线（非 M3.5 专属） |
| **Scope** | History Explorer 多 Agent 团队的常态化组织、职责、流程与决策规范 |
| **Basis** | 全部条款源自 M3.5（Knowledge Layer → Exploration Engine）真实执行经验，非理论推演 |

---

## 0. Purpose & How to Read

本规范定义 History Explorer 在"一个永久组织 + 若干临时实例"模型下的运作方式。它解决 M3.5 实战暴露的三个问题：

1. **角色与实例混淆**——长期该固定的是 Role，临时的是 Instance；不能把某个具体 Agent 当成永久编制。
2. **决策权模糊**——谁拍板方向、谁有否决权、谁只能建议，必须写死。
3. **知识随会话蒸发**——项目结构/操作/决策需要有落地的知识库，避免每轮重读仓库。

**阅读顺序（Required Reading，§3 详列）**：Freeze → Architecture → Checkpoint → Repository，其中 **Freeze 优先**——任何动作不得破坏已冻结不变量。

**本文件不可被原地续写**。如需变更，见 §14。

---

## 1. Organization（三层模型）

```
Organization (永久)
└── Role (永久, 6 个固定)
    └── Instance (临时, 按需生灭)
```

| 层级 | 生命周期 | 是否固定 | 说明 |
|---|---|---|---|
| **Organization** | 项目全程 | 固定 | History Explorer 团队本身 |
| **Role** | 项目全程 | **固定 6 个**（§4） | 能力插槽，不绑定具体人/Agent |
| **Instance** | 单次任务 | 临时 | 某个 Role 在某次 Checkpoint 中的具体 Agent 实例（§5） |

**核心不变量**：长期固定的是 **Role**，不是 **Instance**。同一 Role 在不同里程碑可由不同 Instance 承担；同名 Instance 可因 Retry 复用（§10）。

---

## 2. Design Principles（6 原则）

所有条款的统一引用源头。任何流程争议先回看这里。

1. **经验优先于理论** — 规范条款必须来自真实执行，不凭"理想流程"推测。M3.5 实战中"禁止 backend-2"被证伪，即为例。
2. **长期固定 Role，不固定 Instance** — 组织稳定性来自 Role 定义，而非具体 Agent。
3. **评审与实现分离** — 只读评审身份（Architect / Auditor）不得落地代码/文档/Git；实现由 Role Instance 执行。
4. **证据优先，不信任自报** — 一切结论须附真实输出（测试、文件、日志）；QA 铁律（§9）的延伸。
5. **只增不改，兼容优先** — 改动 additive；API 与前端兼容必须保持（红线）。
6. **用户拥有最终方向拍板权** — Release / 战略方向永远 User 决定（§7-D8）。

---

## 3. Required Reading（顺序固定，Freeze 优先）

任何新成员 Instance 启动前，按此顺序阅读；**Freeze 文档具有最高优先级，任何动作不得与之冲突**。

| 顺序 | 类别 | 代表文件 | 目的 |
|---|---|---|---|
| 1️⃣ | **Freeze（优先）** | `docs/M3.5-000_Schema_Freeze_Review.md` | 冻结不变量：ENTITY_TYPES=8、RELATIONSHIP_TYPES=18、GlobalGraph 属 Knowledge Layer、Exploration Engine 确定性无 AI/GIS/Neo4j |
| 2️⃣ | Architecture | `docs/M3.5_Architecture_Review.md`、`docs/M3.5-00x_Architecture.md` | 分层架构、组合根、seam 位置 |
| 3️⃣ | Checkpoint | 各 `M3.5-00x_Integration_Report.md`、`docs/INTEGRATION.md` | 标准 Checkpoint 流程与签核形态 |
| 4️⃣ | Repository | 本规范 §8（Project Knowledge Base） | 知识落地位置/格式/节奏 |

> Freeze 优先意味着：若 Architecture/Checkpoint/Repository 与 Freeze 文档冲突，**以 Freeze 为准**，冲突项上报 Lead。

---

## 4. Permanent Roles（6 固定 Role）

| Role | 职责摘要 | 是否实现者 |
|---|---|---|
| **Lead** | 架构、Checkpoint 编排、仓库治理、知识库托管、决策裁决（Release 除外） | 默认不实现；仅架构级/组合根/冻结门禁/跨切面重构亲自实现（§8） |
| **Backend** | 后端代码、API、core 包、pytest | 是 |
| **Frontend** | 前端代码、UI、vitest | 是 |
| **Data** | 数据模型、校验、种子、跨主题边 | 是 |
| **QA Backend** | 后端独立验证、签核 | 否（只读 sign-off） |
| **QA Frontend** | 前端独立验证、签核 | 否（只读 sign-off） |

**Role 固定、Instance 不固定**：M3.5 实战中 `backend` 首次被 canceled 成孤儿、`frontend` 首次被取代，均为 Instance 层事件，不改变 Role 定义。

---

## 5. Instance Lifecycle（5 状态）

```
Created ──▶ Running ──▶ Completed ──▶ Retired ──▶ Deleted
              │                        ▲
              └────── (cancel/replace) ┘
```

| 状态 | 含义 | 进入条件 | 退出条件 |
|---|---|---|---|
| **Created** | 已建未启 | Lead 派活 | 开始执行 → Running |
| **Running** | 执行中 | 开始执行 | 任务完结/被取消 |
| **Completed** | 任务完结 | 产出交付物 | Checkpoint 收尾 → Retired |
| **Retired** | 退役（不再承担新活） | 被取代/取消/收尾 | 统一清理 → Deleted |
| **Deleted** | 已清理 | 收尾统一删除 | — |

**规则**：
- `Retired` 不立即删除，留待 Checkpoint 收尾统一 `Deleted`，便于审计追溯。
- 被取消/取代的 Instance **必须**显式标记 `Retired`，不得静默弃用。

---

## 6. Artifact Ownership（12 项）

| # | 产物 | 归属 | 说明 |
|---|---|---|---|
| 1 | TeamConfig (`teams/*/config.json`) | **Lead** | 团队/成员结构真相源 |
| 2 | Freeze Doc (M3.5-000) | Lead 托管 / **User 批准** | 冻结不变量 |
| 3 | ADR (架构决策记录) | **Lead** | 编号 ADR-xxx，入 `docs/adr/` |
| 4 | Changelog | **Lead** | 版本/里程碑变更记录 |
| 5 | Architecture Spec（每里程碑） | Lead 起草 / Role 评审 | 非实现文档 |
| 6 | 实现代码 | 所属 Role（Backend/Frontend/Data） | additive 改动 |
| 7 | Integration Report | **Lead** | Checkpoint 收尾报告 |
| 8 | QA Report / Sign-off | QA Backend / QA Frontend | 独立签核 |
| 9 | 测试套件（pytest / vitest） | 所属 Role + QA 共维护 | 94 / 47 passed 基线 |
| 10 | Repository Memory / Project Knowledge Base | **Lead** 托管 | 见 §8 |
| 11 | Checkpoint 产物 | Lead 协调，Role 交付 | 临时态 |
| 12 | Release 产物（build / version bump） | Lead 准备 / **User 批准** | 不发自行上线 |

---

## 7. Decision Authority（8 项，Release → User）

| # | 决策 | 权限归属 | 备注 |
|---|---|---|---|
| D1 | Schema Freeze（entity/relationship 类型） | User 批准 / Lead 提议 | 冻结后不可单方面改 |
| D2 | 架构方案（冻结范围内） | **Lead** | 不破 Freeze |
| D3 | Role 指派 | **Lead** | |
| D4 | Instance 生灭 / Retry | **Lead** | 见 §10 |
| D5 | Checkpoint Pass/Fail | **QA（独立）** | Lead 仅裁决是否阻塞流转，不能改判 PASS |
| D6 | Minor 问题接受/递延 | **Lead** | 在规范范围内 |
| D7 | 范围纳入/排除 | **Lead**（上报 User） | 范围外只报告不修改 |
| D8 | **Release / 版本 bump / 上线** | **👤 User（唯一）** | Lead 只能准备与建议，不能把方向批准当 Release 授权 |

> **铁律**：D8 永远 User 拍板。Lead 的 Approval（§11）≠ Release 授权。

---

## 8. Lead Responsibilities（6 职责 + Repository Memory）

### 8.1 六职责
1. **架构**：每里程碑首席架构，起草 Architecture Spec。
2. **Checkpoint 编排**：驱动 §11 流程，产出 Integration Report。
3. **仓库治理（Repository Stewardship）**：docs / config / prompt / checkpoint / task / git 的整理与门禁。
4. **知识库托管（Repository Memory）**：见 §8.2。
5. **决策裁决**：D1–D7；D8 上交 User。
6. **升级 owner**：Role → Lead → User 链的第一接收入口。

### 8.2 Lead 默认不承担业务实现
- **默认**：业务实现由 Backend / Frontend / Data 承担。
- **Lead 可亲自实现的情形**（仅限）：架构级重构、组合根（main.py）收敛、冻结门禁检查、跨切面（logging/config）重构。
- 依据：M3.5-001（GlobalGraph Foundation）、M3.5-002（Exploration Engine）实为 Lead 完成，证明"Lead 绝不实现"过于理想化。

### 8.3 Repository Memory = Project Knowledge Base（落地定义 · M-ONLY-1 已闭合）
M3.5 暴露"状态/知识随会话蒸发"风险（如状态注入依赖需每轮重读）。Repository Memory 抽象为 **Project Knowledge Base**，三层归类，且**本版补全存储/格式/节奏**（冻结审计 Minor M-ONLY-1 闭合）：

| 子类 | 内容 | 存储位置 | 格式 | 更新节奏 |
|---|---|---|---|---|
| **Structural** | 架构、组合根、seam、冻结不变量、ADR | `docs/`（架构文档）+ `docs/adr/`（ADR）+ `docs/repository_memory/`（知识库物理根）+ `teams/*/config.json` | Markdown / JSON | 架构变更或 Freeze 时即时更；ADR 在每次 Freeze/架构决策新建 |
| **Operational** | 每日工作日志、会话产出、临时状态 | `.workbuddy/memory/YYYY-MM-DD.md` | Markdown，append-only | **每个实质会话结束追加**；只增不覆盖 |
| **Decision** | 长期约定、用户偏好、红线、里程碑映射 | `.workbuddy/memory/MEMORY.md`（≤3000 字符/会话）+ `docs/adr/`（ADR）+ `docs/repository_memory/decisions/` | Markdown，curated | 当浮现"可复用长期约定/决策"时更新；每里程碑边界复审 |

**物理结构（`docs/repository_memory/`）**：`architecture/`（Structural）、`decisions/`（Decision，含 ADR 镜像）、`checkpoints/`、`integration_reports/`、`prompts/`。仅作知识库落地容器，分类仍按上表三层。

**托管规则**：
- Lead 是唯一 steward；内容可被任何 Role 读取，但结构性修改（MEMORY.md / ADR / Freeze）须经 Lead。
- 日log 误写可更正单行；MEMORY.md 为 curated，不堆积瞬时信息。
- 跨项目用户偏好写入 `~/.workbuddy/MEMORY.md`，不在本项目库。

---

## 9. QA Responsibilities（4 铁律）

QA（Backend / Frontend）在 Checkpoint 中 **只读 sign-off**，不写实现。

| 铁律 | 含义 | M3.5 对应 |
|---|---|---|
| **① 独立验证** | 不复用实现者结论，自行跑测试/读文件 | QA 对 M3.5-003 独立 6/6 PASS |
| **② 证据优先** | 结论附真实输出（pytest/vitest/build/文件行号） | 94 / 47 passed 复测 |
| **③ 不轻信自报** | 交叉核对，不采信"已实现"口头/摘要 | AIGuidePanel 死重即 qa2 漏看之鉴 |
| **④ 回归意识（Regression Awareness）** | 确认不破坏已 Freeze 行为 | 枚举 8/18、GlobalGraph 属 Knowledge Layer、Exploration Engine 确定性不得因改动而变 |

> **QA 拥有不可推翻的 FAIL 权**：Lead 只能裁决"该 FAIL 是否阻塞流转"，**不能改判 PASS**。若 Lead 与 QA 僵持，走 §12 升级至 User。

---

## 10. Retry Policy（框架无关）

M3.5 实战证伪"禁止 backend-2"。本策略以框架能力为上限：

1. **优先复用同名 Instance**：如 `backend` 被 canceled，Retry 时复用 `backend` 而非新建。
2. **框架不支持同名复用时，允许带序号实例（backend-2 等）**——**这不是错误，也不是反模式**。
3. 旧 Instance 立即标记 **Retired**，Checkpoint 收尾统一 **Deleted**。
4. 命名：序号递增、可追溯；**不得静默替换**实现者结论。
5. 收尾：Lead 在 Integration Report 中列出本 Checkpoint 所有 Retired/Deleted Instance，保证可追溯。

---

## 11. Checkpoint Workflow（标准）

```
Architecture (Lead)
   → Implementation (Role, additive)
   → QA (只读 sign-off, §9)
   → Integration Report (Lead)
   → Approval (Lead; 若涉 Release 则 User, §7-D8)
   → Next
```

**规则**：
- **Approval ≠ 自动开始实现**。Approval 是流转门禁，下一 Checkpoint 仍需重新走 Architecture。
- QA 在 Implementation 完成后介入，独立 sign-off。
- Integration Report 由 Lead 写，含：改动清单、测试基线、Retired/Deleted Instance、风险。
- 任何 Freeze 冲突 → 上报 Lead，必要时 §12。

---

## 12. Escalation Policy

```
Role ──▶ Lead ──▶ User
```

| 触发 | 路径 |
|---|---|
| Role 内无法决断 / 需资源 | Role → Lead |
| Lead 无法裁决（超 D1–D7）/ 与 QA 僵持 / 涉 D8 | Lead → User |
| 冻结冲突 | 任何角色 → Lead（Freeze 优先）→ 必要时 User |

**原则**：升级不跳过层级；User 仅在 D8 及越级争议介入。

---

## 13. Evolution Rule

- 本规范随项目成长，但**冻结期不破坏 §1–§12 不变量**。
- 变更走 §14 Versioning，不在原文件续写。
- 新里程碑（M4+）可基于实战提出 Patch/Minor；Major 需 User 批准。

---

## 14. Specification Versioning（规范自身升级）

| 级别 | 触发 | 谁批准 | 示例 |
|---|---|---|---|
| **Patch** | 文案/Checklist/小修正、落地细节补全 | Lead | M-ONLY-1 类（§8 存储/格式/节奏） |
| **Minor** | 新增章节且不破职责/不变量 | Lead | 新增 Required Reading 顺序 |
| **Major** | 组织/Role/Decision Authority 变化 | **User** | 增删 Role、改 D8 归属 |

> 本文件 v1.2 落档时以 Patch 级闭合 M-ONLY-1（见 §8.3 / §18），版本号维持 v1.2，不升 v1.2.1。

---

## 15. Lessons Learned（源自 M3.5）

1. **Lead 提前推进 M3.006 属流程偏差**——冻结/审计期不得自行启动实现或 bump 版本。
2. **frontend2 删 ExplorationState.tsx 轻微越权**——实现 Instance 不应删他人文件，越权须上报。
3. **AIGuidePanel 死重 qa2 漏看**——命名含 "AI" 与冻结定位矛盾；QA 回归意识须覆盖"死重/命名一致性"。
4. **状态注入依赖**——每轮重读仓库代价高，催生 §8 Repository Memory。
5. **Retry 实战验证框架限制**——"禁止 backend-2"被证伪，改为 §10 框架无关策略。
6. **只读评审身份价值**——Architect/Auditor 严格不落地，保证评审客观性。

---

## 16. Self-Review（冻结前）

| 维度 | 结论 |
|---|---|
| 逻辑冲突 | 无（D5/D8 与 QA FAIL 权张力已在 v1.1 R9 消解） |
| 遗漏职责 | No Missing Responsibility |
| 循环依赖 | No Circular Dependency |
| 不可执行 | 全部条款可落地（Retry 已框架验证） |
| 有害重复 | 合理重复（Design Principles 被多章引用），无有害重复 |
| 扩展风险 | 扩展不破坏不变量（§13/§14 约束） |

---

## 17. Final Recommendation

**采纳为 M4 起长期团队基线**。规范源于真实执行，条款均可执行，不变量清晰，QA 独立权与 User 最终权均有保障。冻结审计结论：**Critical 0 / Major 0 / Minor 0（M-ONLY-1 已闭合）**。

---

## 18. Revision Notes

| 版本 | 变更 |
|---|---|
| v1.0 | 初版：三层模型、6 Role、标准 Checkpoint |
| v1.1 | 吸收 7 处评审：Retry 框架无关、Instance 5 状态、Lead Repository Stewardship、Artifact Ownership、Decision Authority(Release→User)、Lead 边界、Escalation；R9 消解 QA/Lead 张力 |
| v1.2 | 新增 Design Principles / Required Reading / Repository Memory / Evolution Rule；Artifact Ownership 补 TeamConfig/FreezeDoc/ADR/Changelog；Repository Memory 抽象为 Project Knowledge Base；Required Reading 定序 Freeze 优先；QA 增 Regression Awareness；Appendix A |
| **v1.2 (落档)** | **Patch 级闭合 M-ONLY-1：§8.3 补全 Repository Memory 存储位置/格式/更新节奏；开放 Minor 归零** |

---

## 19. Freeze Recommendation

- **冻结审计结论（2026-07-17）**：Critical 0 / Major 0 / Minor 1（M-ONLY-1）。
- **落档时**：M-ONLY-1 已以 Patch 级闭合（§8.3），故最终 **Minor 0**。
- **Recommendation C. Ready to Freeze** ✅ — 本文件即冻结基线，版本 v1.2，不再演进。

---

## Appendix A — M3.5 经验史（不影响正文）

**时间线**
- M3.5-000 Schema Freeze Review ✅：ENTITY_TYPES=8、RELATIONSHIP_TYPES=18、GlobalGraph 属 Knowledge Layer、Exploration Engine 确定性。
- M3.5-001 GlobalGraph Foundation ✅（Lead 实现）：`core/global_graph.py`，85 passed。
- M3.5-002 Exploration Engine ✅（Lead 实现）：四维加权 W_REL=.35/W_TEMP=.25/W_IMP=.20/W_SIMP=.20，94 passed。
- M3.5-003 Exploration API ✅：Backend+Data 并行，QA 只读，94 passed / QA 6/6 PASS。
- M3.5-004 Five-Zone UI ✅：Frontend+QA2，frontend 47 passed / build 0 errors。

**团队实况（M3.5 团队 `history_explorer_m35`）**
- 8 成员：team-lead / backend(孤儿) / data / backend-2 / qa / frontend(孤儿) / frontend2 / qa2。
- 孤儿 Instance：backend（首次 canceled）、frontend（首次被取代）——均为 Instance 层，不改 Role 定义。
- 测试基线：backend 94 passed / frontend 47 passed / build 0 errors。
- Git：末提交 M1 `2cc97ac`；M2/M3/M3.5 全未提交（"统筹考虑"约定）。

**独立架构审计（2026-07-16）**
- 冻结符合✅；Minor 偏差：§4.5 weight 兜底文档偏差、R1 URL 张力、AIGuidePanel 死重、M3.5-002 文档滞后、Git 卫生——均记为 `docs/SUGGESTIONS.md` backlog，非本规范范围。

**本规范演进路径**
Auditor → Chief Architect(Baseline) → Team Architect → Chief Architect(Spec v1.0→v1.1→v1.2) → Spec Auditor(Freeze Audit) → 用户冻结 v1.2。全程严格只读、不落地，直至本次授权落档。
