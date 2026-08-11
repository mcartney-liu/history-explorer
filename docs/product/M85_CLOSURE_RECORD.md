# M85 Closure Record

> **阶段**：M85 Closure — Semantic Relationship 正式关闭
> **日期**：2026-08-05
> **基线**：M84 CLOSED + M84.5 CLOSED
> **下一阶段**：M86 — Civilization Pattern / Higher Understanding

---

## 1. M85 核心结论

```
M85 = Semantic Relationship Architecture

不是：
  Multi-hop Implementation
  AI Reasoning Pipeline
  Semantic Graph Engine
  Recommendation System
```

### M85 关闭的问题

> 解释之间的关系，是否值得作为独立的语义层存在于 History Explorer 中？

**答案：是。三层模型正式确立。**

---

## 2. M85 全链路

| 阶段 | 内容 | 判定 |
| --- | --- | --- |
| M85.0 | Architecture Gate（第一次 HOLD → 第二次 READY） | READY |
| M85.1 | Model Freeze（CausalObject 11 字段 + RelatedCausalObjectRef） | FROZEN |
| M85.2 | Dataset Freeze（5 条关系，4 种类型） | FROZEN |
| M85.3 | Explorer Validation（C5 PASSED — Strong Universal） | PASSED |
| M85.4 | Decision Gate（5 决策） | APPROVED |
| M85.5 | Implementation（Backend + Frontend） | COMPLETED |
| M85.6 | Acceptance（6 Check 全部 PASS） | PASSED |
| **M85.7** | **Closure** | **CLOSED** |

---

## 3. 三层模型 — History Explorer Architecture v3

```
┌──────────────────────────────────────────────────┐
│              History Explorer                     │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │  Understanding Layer（M85）                  │ │
│  │  Semantic Relationship                       │ │
│  │  Why do they matter together?                │ │
│  │  ─────────────────────────────────          │ │
│  │  CausalObject A ←── curator link ──→ B       │ │
│  │  "秦制建立中央集权框架，使科举成为必然选择"     │ │
│  └─────────────────────────────────────────────┘ │
│                      ↑                            │
│  ┌─────────────────────────────────────────────┐ │
│  │  Explanation Layer（M82-M84）                 │ │
│  │  CausalObject                                │ │
│  │  Why did it happen?                          │ │
│  │  ─────────────────────────────────          │ │
│  │  mechanism + consequence + confidence        │ │
│  └─────────────────────────────────────────────┘ │
│                      ↑                            │
│  ┌─────────────────────────────────────────────┐ │
│  │  Fact Layer（M77）                           │ │
│  │  Knowledge Graph                             │ │
│  │  What exists?                                │ │
│  │  ─────────────────────────────────          │ │
│  │  Entity + Relationship + Properties          │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 三层职责

| 层 | 问题 | 技术 | 来源 |
| --- | --- | --- | --- |
| Fact Layer | What exists? | KG Entity/Relationship | Data |
| Explanation Layer | Why did it happen? | CausalObject | Curator |
| Understanding Layer | Why do they matter together? | Semantic Relationship | Curator |

### History Explorer 定位

```
不是 Historical Database
不是 Knowledge Graph Viewer
不是 AI-powered Recommendation Engine

是 Civilization Understanding Engine

核心竞争壁垒：
  不是拥有更多历史数据，
  而是拥有一套让人类逐步形成文明理解的语义结构。
```

---

## 4. M85 关键决策（永久冻结）

### D1 — Semantic Relationship 作为平台能力

```
APPROVED — 永久

related_causal_objects 是 CausalObject 的正式字段。
Semantic Relationship 是 History Explorer 的第三层架构。
```

### D2 — 不建立 Relationship Runtime

```
HOLD — 永久约束

禁止：Semantic Graph 索引、BFS/DFS traversal、排序/权重、推荐引擎
M85 只做 Rendering，不做 Engine
```

### D3 — Multi-hop 延后

```
DEFER TO M86

M85 证明：单个关系有价值。
M85 未证明：链式多跳有价值。

M86 的前提：
  1. related_causal_objects ≥ 20
  2. 链式关系出现（A→B, B→C 同时存在）
  3. Explorer 自然产生 3+ 步探索行为
```

### D4 — Semantic Relationship 定义

```
APPROVED — 永久

Semantic Relationship = 帮助 Explorer 理解两个 Semantic Object
                        为什么值得关联的解释层结构

核心不是 "connect"，而是 "explain connection"。

KG 回答：有没有关系？
SR 回答：为什么值得一起理解？
```

---

## 5. M85 永久禁止事项

| # | 禁止 | 理由 |
| --- | --- | --- |
| P1 | Semantic Relationship ≠ Graph Engine | related_causal_objects 是静态引用列表，不是图边 |
| P2 | Understanding Layer ≠ Recommendation Layer | "理解关联" 不是 "你可能还想了解" |
| P3 | Relationship ≠ AI Generated Connection | Curator authored only |
| P4 | relation_type ≠ 自动推导 | Curator 手动分类，初始 4 种 |
| P5 | RelatedCausalObjectRef ≠ graph.add_edge() | 不参与遍历、不构建图结构、不被算法消费 |

---

## 6. M85 产出

### 代码

| 层 | 文件 | 变更 |
| --- | --- | --- |
| Backend | `causal_object.py` | +RelatedCausalObjectRef + CausalObject 10→11 |
| Backend | `__init__.py` | 导出新类 |
| Frontend | `causalStatement.ts` | +RelatedCausalObjectRefData |
| Frontend | `UserBehaviorEvent.ts` | +2 事件 |
| Frontend | `CausalObjectDetailPage.tsx` | +"理解关联" 区块 |

### 数据

| 文件 | 内容 |
| --- | --- |
| `causal_objects.json` | 12 CausalObject + 5 Semantic Relationship |
| `curator_relationship_candidates.md` | 7 候选关系对（研究记录） |

### 治理文档（8 份）

| 文档 | 用途 |
| --- | --- |
| M85.0_SEMANTIC_RELATIONSHIP_ARCHITECTURE_GATE_REVIEW.md | 架构 Gate（第一次 HOLD → 第二次 READY） |
| M85.1_SEMANTIC_RELATIONSHIP_MODEL_FREEZE.md | Model Freeze |
| M85.2_RELATIONSHIP_DATASET_FREEZE.md | Dataset Freeze |
| M85.3_EXPLORER_VALIDATION_DESIGN.md | C5 验证设计 |
| M85.3_EXPLORER_VALIDATION_SESSIONS.md | Session Records（4 场） |
| M85.4_DECISION_GATE.md | 战略决策（5 决策） |
| M85.6_IMPLEMENTATION_ACCEPTANCE_REVIEW.md | 验收审查 |
| M85_CLOSURE_RECORD.md | 本文档 |

### 测试

```
Backend:  50/50 PASS（M85 8 + M82-M84 42）
Frontend: 63/63 PASS（M85 7 + M83.1 10 + M82 46）
Total:    113/113 PASS
```

---

## 7. M85 的战略意义

### 7.1 M85 之前的 History Explorer

```
Entity → CausalStatement → Explorer

两层模型：事实 + 解释
Explorer 理解单个历史事件的原因。
```

### 7.2 M85 之后的 History Explorer

```
Entity → CausalObject → Semantic Relationship → Explorer Understanding

三层模型：事实 + 解释 + 理解
Explorer 理解文明现象之间的关联。
```

### 7.3 里程碑演进链

```
M82：系统可以解释（"会解释"）
M83：解释值得存在（"解释有价值"）
M84：解释成为平台对象（"CausalObject"）
M84.5：对象需要连接（"跨对象需求"）
M85：关系解释有价值（"Semantic Relationship"）

每一步都在向上抽象：
  信息 → 解释 → 对象 → 关系 → 理解
```

### 7.4 M85 的最大成功

```
不是引入了 Semantic Relationship 功能。

而是证明了：
  History Explorer 的核心竞争壁垒
  不是拥有更多历史数据，
  而是拥有一套让人类逐步形成文明理解的语义结构。

这个语义结构现在有三层：
  Fact → Explanation → Understanding

M86+ 可以在此基础上讨论：
  Civilization Pattern
  Narrative Chain
  Higher Understanding
  AI-assisted Exploration
```

---

## 8. 为 M86 留问题

M86 不应该直接定义为 "Multi-hop"。

M86 的真正问题应该是：

> 当多个 Semantic Relationship 同时存在时，
> Explorer 是否需要系统帮助形成更高层理解？

即：

```
Current（M85）：
  Relationship A→B
  Relationship B→C
  （独立存在，Explorer 自行连接）

Future（M86）：
  Relationship A→B + Relationship B→C
  → Relationship Pattern A→B→C
  （系统帮助 Explorer 发现模式）
```

M86 的关键约束：

```
❌ M86 ≠ Graph Traversal Engine
❌ M86 ≠ AI-powered Reasoning
❌ M86 ≠ Recommendation

M86 应该 = Relationship Pattern Recognition
  不是系统自动推导新关系，
  而是帮助 Explorer 发现已有关系之间的模式。
```

---

## 9. 里程碑状态

```
M82 Runtime Capability              ✅ CLOSED
M83 Validation + Governance         ✅ CLOSED
M84 Semantic Object Capability      ✅ CLOSED
M84.5 Evidence Expansion            ✅ CLOSED
M85 Semantic Relationship           ✅ CLOSED
M86 Civilization Pattern            ← 下一步
```

---

> M85 CLOSED | 三层模型正式确立 | History Explorer Architecture v3 | 等待 PO Review
