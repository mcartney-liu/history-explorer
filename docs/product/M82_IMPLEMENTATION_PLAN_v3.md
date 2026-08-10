# M82 Implementation Plan v3

> **版本**：v3（Constraint Lock 修订版）
> **v2 → v3 变更**：新增 §I Implementation Constraints（8 条硬约束）+ confidence 类型从 float 固化为 enum string + 任务 P1.6 增加 Risk #1 缓解
> **阶段**：M82 Implementation Planning（不实现）
> **来源**：M82 Entry Gate APPROVED → M82 Architecture Gate READY WITH CONDITIONS → M82 Constraint Lock
> **日期**：2026-08-05
> **状态**：Plan v3（Implementation Constraints 已锁定，待 PO 签核后进入 Implementation）

---

## A. Causal Semantics 产品目标

**Mission**：将 CausalStatement 从"后台字段"变成"可读、可追溯、可验证的探索路径"。

**用户价值**：Explorer 在看到 Entity/Relationship 时，不再只是"知道 A 和 B 有关联"，而是能读懂"因为什么原因，A 导致了 B，产生了什么后果，证据是什么"。

---

## B. Layer Architecture

```
┌─────────────────────────────────────────────┐
│          Exploration Layer（探索层）           │
│   Guide / Navigator / Interpreter / Analyst  │
│   消费下层输出，提供叙事理由 / 推荐 / 因果故事  │
│   不在本层存储数据                              │
├─────────────────────────────────────────────┤
│          Inference Layer（推断层）              │
│   Signal（系统推断）/ 推荐评分 / 关联权重       │
│   带"系统推断"视觉标识                          │
│   来源：系统算法                                │
│   可被用户质疑 / 不被信任为事实                 │
├─────────────────────────────────────────────┤
│          Semantic Layer（语义层）               │
│   CausalStatement（因果陈述）                   │
│   基于 Fact-Layer 的 Entity/Relationship/      │
│   Evidence，表达因果语义（mechanism/           │
│   consequence 自然语言文本）                    │
│   带"基于证据"视觉标识                          │
│   来源：人工策展 + Evidence 引用               │
│   不可被 AI 生成（M82 范围内）                  │
├─────────────────────────────────────────────┤
│          Fact Layer（事实层）                   │
│   Entity / Relationship / Evidence Claim      │
│   结构化标识符 / 关系类型 / 来源引用            │
│   来源：KG 数据 + 策展                         │
│   不可被修改                                   │
└─────────────────────────────────────────────┘
```

### 四层职责

| 层 | 数据特征 | 标识 | 可修改？ | 来源 |
| --- | --- | --- | --- | --- |
| **Fact** | 结构化（id/type/name） | 无特殊标识（默认可信） | 仅策展 | KG JSON |
| **Semantic** | 自然语言文本（mechanism/consequence） | "基于证据" + 可溯源引用 | 仅策展（M82） | 策展 + Evidence 引用 |
| **Inference** | 数值/枚举（评分/权重/语义匹配类型） | "系统推断" | 系统算法自动更新 | 算法 |
| **Exploration** | 渲染后文本（叙事理由/推荐/因果故事） | 引用下层标识 | 无持久化 | 消费下层输出 |

---

## C. Edge 修改方案

**CausalStatementAdapter 旁挂，不修改 `graph.py` Edge。**

```
causal_statements.json（独立数据文件）
  ↓
CausalStatementAdapter（新增，旁挂模块）
  ↓ 提供方法：
  │  get_for_relationship(source_id, target_id, type) → List[CausalStatement]
  │  get_for_entity(entity_id) → List[CausalStatement]
  │  get_for_path(path: List[Edge]) → List[CausalStatement]
  ↓
ExplorationEngine._explain_path 通过 Adapter 查询 CausalStatement
```

**不修改**：`graph.py` / `DirectedGraph` / `KnowledgeGraph` / `Relationship` 枚举。

---

## D. 数据范围

**1 个探索包（中国文明）× 5 条 CausalStatement。**

| # | 场景 | 覆盖字段 | confidence |
| --- | --- | --- | --- |
| CS-01 | 科举制度 → 文官体系建立（简单因果） | mechanism + consequence + 1 evidence | high |
| CS-02 | 三省六部 → 内阁体系（多跳因果） | mechanism + consequence + 2 evidence | high |
| CS-03 | 汉朝 → 丝绸之路开通（跨域因果） | mechanism + consequence + 3 evidence | medium |
| CS-04 | 宋朝 → 理学兴起（低置信度因果） | mechanism + consequence + 1 evidence | **low** |
| CS-05 | 明朝 → 郑和下西洋（复杂后果） | mechanism + consequence（长文本）+ 2 evidence | high |

---

## E. MVP Scope 三阶段

### Phase 1：最小可信因果链

| # | 任务 | 所属层 | 触 Freeze？ | 约束 |
| --- | --- | --- | --- | --- |
| P1.1 | 创建 5 条 CausalStatement 实例数据 | Semantic | ⚠️ 新增数据文件 | confidence 使用 `"high"`/`"medium"`/`"low"`（C-7） |
| P1.2 | 实现 CausalStatement Loader | Semantic | ✅ 不触 | 从 JSON 加载，校验 evidence_refs 引用完整性 |
| P1.3 | 实现 CausalStatementAdapter | Semantic | ✅ 不触 | 只读查询，不生成（C-5）；docstring 声明"只读"（Risk #2 缓解） |
| P1.4 | `_explain_path` 注入 CausalStatement | Backend | ✅ 不触 | CausalStatement 缺失 → fallback 到 Relationship Template（C-8）；禁止调用 AI（Risk #2 缓解） |
| P1.5 | API 返回 CausalStatement | Backend | ✅ 不触 | entity/explore API 包含 CausalStatement |
| P1.6 | CausalStatementCard 渲染组件 | Frontend | ✅ 不触 | confidence 渲染附带解释文本（Risk #1 缓解：low → "策展者置信度：低——此因果关系在学术界仍有争议"） |
| P1.7 | Evidence 可点击溯源 | Frontend | ✅ 不触 | evidence_refs → evidence_claims.json |
| P1.8 | 单元测试 | Test | ✅ 不触 | Loader + Adapter + `_explain_path` |

**Phase 1 验收**：Explorer 能在关系链中看到因果陈述，点击 Evidence 能跳转到证据详情。

### Phase 2：Guide 叙事理由

| # | 任务 | 所属层 | 触 Freeze？ |
| --- | --- | --- | --- |
| P2.1 | Guide `getNextSteps` 增强：推荐原因从模板 → CausalStatement 叙事理由 | Backend | ✅ 不触 |
| P2.2 | Guide 叙事理由 i18n 模板（zh/en/ja） | Frontend | ✅ 不触 |
| P2.3 | GuidePanel 渲染叙事理由 | Frontend | ✅ 不触 |
| P2.4 | 单元测试 + Explorer Validation | Test | ✅ 不触 |

**Phase 2 验收**：Explorer 能说出"为什么系统推荐我看这个"。

### Phase 3：Fact/Inference 展示体系

| # | 任务 | 所属层 | 触 Freeze？ |
| --- | --- | --- | --- |
| P3.1 | LayerBadge 组件（Fact 绿色 / Semantic 绿色+"基于证据" / Inference 蓝色+"系统推断"） | Frontend | ✅ 不触 |
| P3.2 | RelationshipChain 嵌入 CausalStatementCard + LayerBadge | Frontend | ✅ 不触 |
| P3.3 | Signal 区域增加 "系统推断" 标识（P05） | Frontend | ✅ 不触 |
| P3.4 | Explorer Validation（SC-3） | Test | ✅ 不触 |

**Phase 3 验收**：Explorer 能识别界面上哪些信息属于哪一层。

### 阶段依赖

```
Phase 1 ──→ Phase 2
         └─→ Phase 3（可与 Phase 2 并行）
```

---

## F. M82 Gate Criteria

| # | 标准 | 验证方式 | Phase |
| --- | --- | --- | --- |
| SC-1 | CausalStatement 可读 | Explorer Validation（≥3/4） | Phase 1 |
| SC-2 | Evidence 可溯源 | 功能验收 + Explorer Validation | Phase 1 |
| SC-3 | Fact vs Inference 可区分 | Explorer Validation（≥3/4） | Phase 3 |
| SC-4 | Guide 叙事理由可理解 | Explorer Validation（≥3/4） | Phase 2 |
| SC-5 | AI 不可用时仍可用 | 自动化测试 | Phase 1 |
| SC-6 | Freeze Gate 未触 | freeze-check 脚本 | Phase 1–3 |

---

## G. Non-Scope（不变）

| # | 禁止项 |
| --- | --- |
| 1 | AI Runtime / LLM 生成事实 |
| 2 | Ontology 扩展（ENTITY=8 / RELATIONSHIP=18 不变） |
| 3 | 新数据库 |
| 4 | 用户画像 |
| 5 | Trail 持久化（M83） |
| 6 | 新探索包（M84） |
| 7 | AI 介入探索（M83.5） |
| 8 | 修改 Graph Core（Edge/Relationship 枚举不变） |

---

## H. v2 → v3 变更摘要

| 变更 | v2 | v3 | 来源 |
| --- | --- | --- | --- |
| Implementation Constraints | 无 | 新增 §I（8 条硬约束） | Architecture Gate → Constraint Lock |
| confidence 类型 | `float \| None` | `"high"` \| `"medium"` \| `"low"` \| `null`（enum string） | C-7 |
| CausalStatementCard | 渲染 confidence 数字 | 渲染 confidence 时附带解释文本（Risk #1 缓解） | Architecture Gate Risk #1 |
| Adapter docstring | 未指定 | 明确声明"只读查询，不生成"（Risk #2 缓解） | Architecture Gate Risk #2 |
| `_explain_path` fallback | 模板 fallback | 明确禁止 AI/LLM 生成替代文本（Risk #2 缓解） | Architecture Gate Risk #2 |

---

## I. Implementation Constraints（锁定）

> 以下约束来自 `M82_IMPLEMENTATION_CONSTRAINT_RECORD.md`。M82 Implementation 启动前必须逐项签核。

| # | 约束 | 签核 |
| --- | --- | --- |
| C-1 | CausalStatement 属于 Semantic Layer（ADR-M79） | ________ |
| C-2 | CausalStatement 不属于 Fact/Inference Layer | ________ |
| C-3 | Edge 不允许修改（`source`/`target`/`type` 三字段不变） | ________ |
| C-4 | CausalStatement 通过 CausalStatementAdapter 访问，不直接在核心模块内联 | ________ |
| C-5 | Adapter 只查询，不生成（禁止 `generate_`/`synthesize_`/`infer_`/`predict_` 方法） | ________ |
| C-6 | AI 不生成 CausalStatement（内容 100% 来自 `causal_statements.json`） | ________ |
| C-7 | confidence 值域固化：`"high"` \| `"medium"` \| `"low"` \| `null`（禁止浮点数/算法置信度/AI 置信度） | ________ |
| C-8 | CausalStatement 缺失 → Relationship Template fallback（禁止自动生成文本/调用 AI/显示错误信息） | ________ |

---

> 版本：v3（Constraint Lock 修订版）
> 来源：M82 Entry Brief + M80.5 Revision Acceptance + Architecture Gate Report + Constraint Record
> 日期：2026-08-05
> 状态：Plan v3（Constraints Locked，待 PO 签核后进入 Implementation）
