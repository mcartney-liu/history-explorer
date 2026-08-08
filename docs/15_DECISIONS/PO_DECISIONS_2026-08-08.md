# PO 裁决方案 — 2026-08-08 待拍板项

> 整理：小梦（执行引擎）｜拍板：翔哥（PO）
> 日期：2026-08-08
> 状态：待裁决

---

## 0. 本次裁决范围

| 编号 | 项 | 状态 |
|------|----|----|
| 1 | OD-08（DiscoverPage 陈旧测试） | **已闭环，无需裁决**（见 §1） |
| 2 | ModeBar 4 模式 vs FRW 四主干 | **待裁决**（§2） |
| 3 | 审计 Gate B D1-D4（4 项架构债务） | **待裁决**（§3） |

---

## 1. OD-08 — 实际已闭环（建议直接标记 RESOLVED）

**挂账描述**：DiscoverPage 4 个陈旧测试（ProductIntro 已迁出 App，测试仍断言 'History Explorer'/'历史叙事'/'关系探索'/'深度研究'）。

**现状核验（2026-08-08）**：
- `frontend/src/pages/DiscoverPage.test.tsx` 18 测试 **全部通过**（`npx vitest run` 实测 1 file / 18 passed）
- 关键断言已在 Wave2-#140 更新：`expect(html).not.toContain('History Explorer 能做什么')`（组件已迁出，不再断言）
- ProductIntro 的覆盖已迁移至 `components/shell/ProductIntro.test.tsx`

**结论**：OD-08 已在 #140 处理时实质闭环，仅登记册未更新。**建议直接标记 RESOLVED**，下次 docs-sync 时改 OPEN-DECISIONS.md 一行即可，无需任何代码改动。

---

## 2. ModeBar 4 模式 vs FRW 四主干 — 导航架构裁决

### 冲突本质

| 体系 | 模式列表 | 来源 |
|------|---------|------|
| **ModeBar（现状）** | exploration / explanation / relationship / understanding | M90.3 架构，实际运行的模式切换 UI（`components/shell/ModeBar.tsx`） |
| **FRW 四主干（契约）** | Explore / Understand / Compare / Mirror | FRW Phase 3 IP-01 交互规范，产品架构层定义 |

**差异**：
- ModeBar 的 `explanation`/`relationship` 不在 FRW 四主干里
- FRW 的 `Compare`/`Mirror` 没有对应 ModeBar 模式（Compare 走独立 CrossTopic 视图，Mirror 刚做了只读面板）
- 实际渲染只有 `mode === 'understanding'` 有专门分支（UnderstandingWorkspace），其余模式共用默认探索渲染

### 选项

| 选项 | 做法 | 代价 | 风险 |
|------|------|------|------|
| **A（推荐）** | **ModeBar 保留现状，FRW 四主干作为语义框架在文档对齐**——在 IP-01 补一段"ModeBar 4 模式 ↔ 四主干映射说明"（exploration/explanation/relationship → Explore 主干；understanding → Understand 主干；Compare/Mirror 为独立入口，不强行并入 ModeBar） | 低（纯文档，零代码） | 最低——不动运行中的交互，只消除"两套体系并列"的文档歧义 |
| B | 把 ModeBar 改成 FRW 四主干（Explore/Understand/Compare/Mirror） | 高（改路由枚举 + ModeBar + 渲染分支 + 测试） | 高——Compare/Mirror 目前无模式级实现，强行并入会出空壳模式 |
| C | 维持挂账，不做任何处理 | 零 | 中——文档歧义持续存在，未来 Phase 落地时可能按错体系执行 |

**推荐理由**：ModeBar 是 M90 认证的实际交互，FRW 四主干是架构愿景——两者不需要互相消灭。Compare（CrossTopic）和 Mirror（面板）已有独立载体，强行塞进 ModeBar 反而破坏"模式切换不丢上下文"的设计。文档对齐是成本最低、歧义消除最彻底的解法。

---

## 3. 审计 Gate B D1-D4 — 架构债务裁决

> 来源：`artifacts/HEALTH_AUDIT_v1.1_GATE_B_ARCHITECTURE_BACKEND.md`（Health 85/100，13 Findings，12 Debts，4 PO Decisions）
> 每项审计报告已给出推荐，此处汇总为可一次拍板的清单。

### D1 — DB-B01（架构契约测试 RED）

- **A（推荐）**：列为 M80 前置阻塞项，单独开小修复批次——加 `backend/conftest.py`（统一 sys.path + `_ADAPTERS` 快照/还原 fixture），同批修 B-07/B-08/B-09/B-10。改动全在测试基础设施与 domain 层内部，不触碰 Runtime。
- B：仅登记为 Debt，M80 期间一并处理。
- C：只加测试跳过（治标）。

### D2 — DB-B03 / DB-B04（词汇源治理）

- **A（推荐）**：M80 Planning 阶段先出"词汇源地图"文档（Ontology / validation 8-18 / RELATIONSHIP_MEANING 三处定义点的职责、允许差异、互译规则），再决定是否代码化守卫。
- B：立即加测试断言 `RELATIONSHIP_MEANING.keys() == RELATIONSHIP_TYPES`。

### D3 — DB-B05 / DB-B06（ADR-M79 文档漂移）

- **A（推荐）**：合并到 M78+M79 Release Gate 的 docs-sync 一次性修（Rule 3 措辞修正 + §Decision 删 causal_type 或标注 future extension）。
- B：现在单独开 commit 修 ADR。

### D4 — DB-B11 / DB-B12（PRD 空间与时间维度断层）

- **A（推荐）**：Gate E 产品侧判定前先补一份"PRD vs Freeze Baseline 差异登记"（只记录事实与决策状态，不做取舍）。
- B：现在决定放弃空间维度，更新 PRD。
- C：现在把 GIS 提上 Freeze Revision Gate。

---

## 4. 裁决方式

- 项 2：单选（A/B/C）
- 项 3：四组各单选（A/B/C），可打包"全部选 A"或逐项指定
- 裁决后由执行引擎按结果落地（文档对齐 / M80 计划挂账等）
