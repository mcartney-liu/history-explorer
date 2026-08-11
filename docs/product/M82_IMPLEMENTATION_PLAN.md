# M82 Implementation Plan

> **阶段**：M82 Implementation Planning（不实现）
> **来源**：M82 Entry Gate APPROVED → M82 Causal Semantics Visible
> **日期**：2026-08-05
> **状态**：Plan（待 PO 审核后进入 Implementation）

---

## A. Causal Semantics 产品目标

**Mission**：将 CausalStatement 从"后台字段"变成"可读、可追溯、可验证的探索路径"。

**用户价值**：Explorer 在看到 Entity/Relationship 时，不再只是"知道 A 和 B 有关联"，而是能读懂"因为什么原因，A 导致了 B，产生了什么后果，证据是什么"。

**一句话**：让因果关系从 `mechanism/consequence/confidence/evidence` 四个字段变成一段 Explorer 可以自己走的证据链。

---

## B. Current State Audit

### B.1 KG Relationship Layer

| 能力 | 状态 | 详情 |
| --- | --- | --- |
| `CausalStatement` 数据模型 | ✅ 已定义 | `backend/app/core/causal/model.py` L28-36，4 字段完整（mechanism/consequence/confidence/evidence_refs） |
| `CausalStatement` 实例数据 | ❌ 缺失 | `data/examples/*.json` 中无 CausalStatement 实例；关系上的 `mechanism` 是枚举值（如 `"political"`），非自由文本 |
| `CausalStatement` 加载器 | ❌ 缺失 | 无 `CausalLoader`，无法从数据文件读取 CausalStatement 实例 |
| `Edge` 与 `CausalStatement` 关联 | ❌ 缺失 | `graph.py` Edge（L21-25）仅有 source/target/type，无 CausalStatement 字段 |
| `RELATIONSHIP_MEANING` 18 种权重 | ✅ 可复用 | `exploration_engine.py` L74-93，作为 CausalStatement 缺失时的 fallback |
| `_explain_path` 路径解释 | ⚠️ 仅结构描述 | `exploration_engine.py` L699-711，模板式 `"—[{relationship}]→"`，无因果叙事 |

**结论**：CausalStatement 的数据模型已就绪（M79），但**数据层和关联层完全空白**。M82 需要在 KG JSON 中创建 CausalStatement 实例，并将其与 Entity/Relationship 关联。

### B.2 Evidence Layer

| 能力 | 状态 | 详情 |
| --- | --- | --- |
| `evidence_claims.json` | ✅ 存在 | 76 条 evidence claim，有 `claim_id`/`source_id`/`text` 结构 |
| `sources.json` | ✅ 存在 | 来源注册 |
| `provenance_index.py` | ✅ 可复用 | 来源索引，按 entity_id 检索 |
| `CausalStatement.evidence_refs` → `evidence_claims` 关联 | ❌ 缺失 | 当前 CausalStatement 实例不存在，故无关联 |
| `CausalStatement.evidence_refs` 可点击跳转 | ❌ 缺失 | 前端无 evidence claim 展示组件 |

**结论**：Evidence 基础设施已存在（76 claims + sources），但 CausalStatement 与 Evidence 的关联链路未建立。

### B.3 Guide Layer

| 能力 | 状态 | 详情 |
| --- | --- | --- |
| `getGuideSnapshot` / `getNextSteps` | ✅ 可复用 | `explorationGuide.ts` L145-255，返回位置 + 下一步 + 覆盖率 |
| 关系原因模板（zh/en/ja） | ✅ 可复用 | `understandingRules.ts`，ZH_RELATIONSHIP_TEMPLATES 已完整（M72） |
| Guide 推荐原因本地化 | ✅ 已修复 | M81b-A，GuidePanel 6 处硬编码 → i18n key |
| **叙事理由字段**（回答"为什么 A 而非 B"） | ❌ 缺失 | 当前 reason 来自 `RELATIONSHIP_TEMPLATES`（如"A preceded B in time"），是模板化原因，非基于 CausalStatement 的叙事理由 |
| GuidePanel 渲染叙事理由 | ❌ 缺失 | 当前 `GuidePanel.tsx` L88 渲染 `step.reason`（模板文本），无叙事理由字段 |

**结论**：Guide 的基础设施已就绪（本地化 + 原因模板），但 M82 需要将 reason 从"模板字符串"升级为"基于 CausalStatement 的叙事理由"。这是 P04 的核心要求。

### B.4 Side Index / Inference Layer

| 能力 | 状态 | 详情 |
| --- | --- | --- |
| Signal 数据（评分/权重） | ✅ 存在 | `relationshipUtils.ts` 包含关联分析输出 |
| **Fact vs Inference UI 区分** | ❌ 缺失 | 当前 UI 未区分 Fact-Layer 内容（Entity/Relationship/CausalStatement）和 Inference-Layer 内容（Signal/推荐/评分） |
| Signal "系统推断"标识 | ❌ 缺失 | P05 要求，当前未实现 |

**结论**：Signal 数据存在，但 P07 的 Fact/Inference UI 区分完全空白。这是 M82 的核心交付物之一。

### B.5 UI Components

| 组件 | 文件 | 状态 | M82 缺口 |
| --- | --- | --- | --- |
| 关系链展示 | `RelationshipChain.tsx` | ✅ 存在 | 当前展示 Entity→Relationship→Entity 链，无 CausalStatement 嵌入 |
| 来源链展示 | `SourceChain.tsx` | ✅ 存在 | 当前展示来源列表，无 CausalStatement Evidence 溯源 |
| 推荐下一步 | `RecommendedNext.tsx` | ✅ 存在 | 当前展示推荐节点列表，无叙事理由字段 |
| 探索向导 | `GuidePanel.tsx` | ✅ 已本地化 | 当前渲染 `step.reason`（模板），需升级为叙事理由 |
| 实体页关系 | `EntityRelations.tsx` | ✅ 存在 | 当前展示关系列表，无 CausalStatement 附加 |
| Evidence Claim 展示组件 | — | ❌ 不存在 | 需要新建，用于 CausalStatement 的"点击溯源" |
| Fact/Inference 视觉标识组件 | — | ❌ 不存在 | 需要新建，用于区分 Fact-Layer 和 Inference-Layer 内容 |

---

## C. Target Architecture

### 三层边界

```
┌─────────────────────────────────────────────┐
│          Exploration Layer（探索层）           │
│   Guide / Navigator / Interpreter / Analyst  │
│   消费 Fact-Layer 和 Inference-Layer 的输出    │
│   提供叙事理由 / 推荐 / 因果故事               │
│   不在本层存储数据                              │
├─────────────────────────────────────────────┤
│          Inference Layer（推断层）              │
│   Signal（系统推断）/ 推荐评分 / 关联权重       │
│   带"系统推断"视觉标识                          │
│   可被用户质疑 / 不被信任为事实                 │
│   来源：系统算法                                │
├─────────────────────────────────────────────┤
│          Fact Layer（事实层）                   │
│   Entity / Relationship / CausalStatement    │
│   Evidence Claim（可溯源引用）                  │
│   带"基于证据"视觉标识                          │
│   来源：KG 数据 + 策展                         │
│   不可被 AI 修改                               │
└─────────────────────────────────────────────┘
```

### 各层职责

| 层 | 负责什么 | 不负责什么 |
| --- | --- | --- |
| **Fact Layer** | CausalStatement 存储与检索；Evidence Claim 索引；确定性因果骨架生成 | 推断、个性化、AI 生成 |
| **Inference Layer** | Signal 计算与标识；推荐评分；关联权重 | 事实声明、因果叙事 |
| **Exploration Layer** | 将 Fact-Layer 的 CausalStatement 渲染为可读文本；Guide 叙事理由生成；Fact vs Inference UI 区分 | 修改 KG 数据、创造事实 |

### 数据流

```
KG JSON (Entity/Relationship/CausalStatement/Evidence)
  → CausalLoader（新增）→ CausalStatement 实例
    → ExplorationEngine._explain_path 增强 → 因果骨架文本
      → Guide.getNextSteps 增强 → 叙事理由
        → UI Components 渲染（带 Fact/Inference 标识）
```

---

## D. Implementation Tasks

### D.1 数据层

| # | 任务 | 文件 | 触 Freeze Boundary？ | 说明 |
| --- | --- | --- | --- | --- |
| D1.1 | 创建 CausalStatement 实例数据 | `data/causal_statements.json`（新增） | ⚠️ 不触 8/18，但新增数据文件 | 为现有 KG 中的 Entity/Relationship 创建 CausalStatement 实例。初始覆盖：4 个探索包的中国/丝路/罗马/印度主题，每个主题 3-5 条 CausalStatement |
| D1.2 | 实现 CausalLoader | `backend/app/core/causal/loader.py`（新增） | ✅ 不触 | 从 `causal_statements.json` 加载 CausalStatement 实例，按 cause_id/effect_id 索引 |
| D1.3 | Edge 与 CausalStatement 关联 | `backend/app/core/graph.py` | ⚠️ 触 Edge 结构，不触 8/18 | Edge 新增 `causal_statement_ids: Tuple[str, ...]` 字段（只读索引，不修改 Edge 语义） |
| D1.4 | CausalStatement → Evidence Claim 关联 | `backend/app/core/causal/loader.py` | ✅ 不触 | `evidence_refs` 解析为 `evidence_claims.json` 中的 claim_id，建立可溯源引用 |

### D.2 后端/数据处理

| # | 任务 | 文件 | 触 Freeze Boundary？ | 说明 |
| --- | --- | --- | --- | --- |
| D2.1 | `_explain_path` 增强 | `backend/app/core/exploration_engine.py` | ✅ 不触 | 在路径解释中注入 CausalStatement 的 mechanism/consequence 文本，替代当前纯结构模板 |
| D2.2 | API 返回 CausalStatement | `backend/app/core/knowledge_service.py` | ✅ 不触 | entity/explore API 返回结果中包含关联的 CausalStatement |
| D2.3 | Guide 推荐增加叙事理由 | `backend/app/core/exploration_engine.py` | ✅ 不触 | `RecommendationItem.reasons` 从模板字符串升级为基于 CausalStatement 的叙事理由 |

### D.3 前端展示

| # | 任务 | 文件 | 触 Freeze Boundary？ | 说明 |
| --- | --- | --- | --- | --- |
| D3.1 | CausalStatement 自然语言渲染组件 | `frontend/src/components/causal/CausalStatementCard.tsx`（新增） | ✅ 不触 | 将 mechanism/consequence/confidence/evidence 渲染为可读卡片 |
| D3.2 | Fact vs Inference 视觉标识组件 | `frontend/src/components/causal/LayerBadge.tsx`（新增） | ✅ 不触 | Fact-Layer 绿色 "基于证据" 标识；Inference-Layer 蓝色 "系统推断" 标识 |
| D3.3 | CausalStatement 嵌入关系链 | `RelationshipChain.tsx` | ✅ 不触 | 关系链中嵌入 CausalStatementCard，展示因果叙事 |
| D3.4 | Evidence 可点击溯源 | `CausalStatementCard.tsx` | ✅ 不触 | `evidence_refs` 渲染为可点击链接，跳转至 Evidence Claim 详情 |
| D3.5 | GuidePanel 叙事理由渲染 | `GuidePanel.tsx` | ✅ 不触 | `step.reason` 从模板字符串升级为叙事理由文本 |
| D3.6 | Guide 叙事理由 i18n | `frontend/src/locales/` | ✅ 不触 | 叙事理由文本的 zh/en/ja 模板 |

### D.4 测试验证

| # | 任务 | 触 Freeze Boundary？ | 说明 |
| --- | --- | --- | --- |
| D4.1 | CausalStatement 加载器单元测试 | ✅ 不触 | 验证 CausalStatement 实例加载、索引、关联 |
| D4.2 | `_explain_path` 增强回归测试 | ✅ 不触 | 确保路径解释在 CausalStatement 缺失时 fallback 到模板 |
| D4.3 | Fact/Inference 视觉区分组件测试 | ✅ 不触 | 验证 LayerBadge 在 Fact-Layer 和 Inference-Layer 内容上正确渲染 |
| D4.4 | M82 Success Criteria Explorer Validation | ✅ 不触 | 按 M82 Entry Brief §6 的 6 条标准进行 Explorer 验证 |

---

## E. Non-Scope

| # | 禁止项 | 确认 |
| --- | --- | --- |
| 1 | AI Runtime / LLM 生成事实 | ✅ CausalStatement 内容 100% 来自 KG 数据 |
| 2 | Ontology 扩展 | ✅ ENTITY=8 / RELATIONSHIP=18 不变 |
| 3 | 新数据库 | ✅ 所有数据在 JSON 文件中 |
| 4 | 用户画像 | ✅ 产品红线 |
| 5 | Trail 持久化 | ✅ M83 范围 |
| 6 | 新探索包 | ✅ M84 范围 |
| 7 | AI 介入探索 | ✅ M83.5 范围 |
| 8 | 新里程碑编号 | ✅ 不新增 M82.5/M82b 等 |

---

## F. M82 Gate Criteria

| # | 标准 | 验证方式 | 来源 |
| --- | --- | --- | --- |
| SC-1 | CausalStatement 可读：Explorer 能用自己的话复述因果 | Explorer Validation（≥3/4） | M82 Entry Brief |
| SC-2 | Evidence 可溯源：Explorer 能从 CausalStatement 点击跳转到 Evidence | 功能验收 + Explorer Validation | M82 Entry Brief |
| SC-3 | Fact vs Inference 可区分：Explorer 能识别界面上的信息归属层 | Explorer Validation（≥3/4） | M82 Entry Brief |
| SC-4 | Guide 叙事理由可理解：Explorer 能说出"为什么推荐这个" | Explorer Validation（≥3/4） | M82 Entry Brief |
| SC-5 | AI 不可用时仍可用：关闭 AI 后 CausalStatement 正常呈现 | 自动化测试 | M82 Entry Brief |
| SC-6 | Freeze Gate 未触：ENTITY=8 / RELATIONSHIP=18 不变 | freeze-check 脚本 | M82 Entry Brief |

---

## 任务优先级与依赖

```
Phase 1: Data Foundation（先有数据）
  D1.1 → D1.2 → D1.3 → D1.4

Phase 2: Backend Enhancement（后端支撑）
  D2.1 → D2.2 → D2.3

Phase 3: Frontend Components（前端呈现）
  D3.1 → D3.2 → D3.3 → D3.4 → D3.5 → D3.6

Phase 4: Validation（验证）
  D4.1 → D4.2 → D4.3 → D4.4
```

**关键路径**：D1.1（CausalStatement 数据）→ D1.2（加载器）→ D2.1（explain_path 增强）→ D3.1（渲染组件）。这是 M82 的最小可交付链路。

---

> 来源：M82 Entry Brief + M80.5 Revision Acceptance + Current State Audit
> 状态：Plan（待 PO 审核后进入 Implementation）
> 日期：2026-08-05
