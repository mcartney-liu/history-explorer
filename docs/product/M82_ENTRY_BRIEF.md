# M82 Entry Brief

> **阶段**：M82 启动准备（不实现）
> **来源**：M80.5 Revision Acceptance → M82 Causal Semantics Visible
> **日期**：2026-08-05
> **状态**：Entry Brief（M82 启动前必须签署的输入契约）

---

## 1. M82 Mission

**Causal Semantics Visible**：将 `CausalStatement`（mechanism / consequence / confidence / evidence）呈现到关系链与来源链 UI 中，使 Explorer 在探索过程中能看到"一个历史变化为什么会发生"——不是系统告诉你一个结论，是系统帮你整理了一条证据链，你可以自己走一遍。

**一句话**：让因果关系从"后台字段"变成"可读、可追溯、可验证的探索路径"。

---

## 2. Input Contract

M82 的产品约束来自以下 M80.5 Revision Acceptance 输出：

| 输入 | 内容 | 约束 |
| --- | --- | --- |
| **M80.5_REVISION_ACCEPTANCE_RECORD.md** | PO ACCEPT，9 条 Proposal 全部接受 | M82 启动前必须确认此记录已生效 |
| **P03 — Interpreter AI 缺位兜底** | CausalStatement 自然语言句式必须在 AI 不可用时仍可呈现 | M82 的 CausalStatement 呈现是 Interpreter 的底线，不得依赖 AI |
| **P04 — Guide 推荐附带叙事理由** | 推荐必须解释"为什么 A 而非 B" | M82 的 Guide 推荐引擎输出需包含叙事理由字段 |
| **P07 — 区分事实与推断原则** | Fact-Layer vs Inference-Layer UI 区分 | M82 的整个 CausalStatement/Signal UI 组件体系必须遵循此原则 |
| **P06 — CausalStatement 附带 Evidence 引用** | CausalStatement 必须附带可点击的 Evidence 溯源 | M82 的 CausalStatement UI 组件必须支持 Evidence 溯源 |

---

## 3. Non-Negotiable Principles

以下原则在 M82 实现期间**不可妥协**：

### 3.1 Fact Layer 不被推断污染

CausalStatement 属于 Fact-Layer（基于 KG 中的 Entity/Relationship/Evidence）。M82 实现的任何 CausalStatement 呈现必须：
- 其内容 100% 来自 KG 中已有的 CausalStatement 数据
- 不得由 AI 生成或补充
- 不得混入 Signal（系统推断）

### 3.2 Inference Layer 必须可识别

Signal / 推荐 / 关联评分 属于 Inference-Layer。M82 必须：
- 在 UI 上以视觉方式区分 Fact-Layer 内容（CausalStatement）和 Inference-Layer 内容（Signal）
- 区分方式：颜色/图标标识 + 可溯源引用（P07 定义）

### 3.3 推荐必须解释 Why

Guide 推荐不仅是节点列表，必须附带叙事理由：
- 叙事理由回答"为什么推荐 A 而非 B"
- 叙事理由基于 CausalStatement 的关系语义生成（非 AI 生成）
- M81b-A 已完成的向导原因本地化是工程基础

### 3.4 AI 不作为事实来源

M82 不引入 AI Runtime。CausalStatement 的呈现是确定性的——基于 KG 数据，不依赖 AI。AI 的角色在 M83.5 中引入，且仅限于在 CausalStatement 骨架上叠加个性化解释（P03 + P09 定义）。

---

## 4. Scope（M82 做什么）

| # | 交付物 | 说明 |
| --- | --- | --- |
| 1 | **CausalStatement 自然语言呈现** | 将 CausalStatement 的 mechanism/consequence 字段渲染为可读的自然语言句式（非字段罗列） |
| 2 | **CausalStatement UI 组件** | 在关系链/来源链 UI 中展示 CausalStatement，附带可点击的 Evidence 溯源（P06） |
| 3 | **Fact-Layer vs Inference-Layer 视觉区分** | Signal 带"系统推断"标识，CausalStatement 带"基于证据"标识（P07 + P05） |
| 4 | **Guide 推荐附带叙事理由** | Guide 推荐引擎输出增加叙事理由字段，回答"为什么 A 而非 B"（P04） |
| 5 | **CausalStatement 在 AI 不可用时仍可呈现** | 确定性因果骨架是 Interpreter 的底线（P03） |

---

## 5. Non-Scope（M82 明确不做）

| # | 非范围项 | 原因 |
| --- | --- | --- |
| 1 | **AI Runtime 扩展** | M82 是确定性因果语义，AI 在 M83.5 引入（P03 + P09） |
| 2 | **新知识写入** | KG 数据不变，仅改变呈现方式 |
| 3 | **Ontology 扩展** | ENTITY=8 / RELATIONSHIP=18 不变 |
| 4 | **KG Schema 修改** | CausalStatement 字段已存在（mechanism/consequence/confidence/evidence），M82 是呈现层工作 |
| 5 | **新探索包创建** | 内容工作在 M84 |
| 6 | **Trail 持久化** | Shell/Trail 在 M83 |
| 7 | **用户画像/个性化** | 产品红线（Product Constitution） |
| 8 | **新里程碑创建** | 不新增 M82.5/M82b 等编号 |

---

## 6. Success Criteria（M82 完成标准）

M82 完成的判定标准（Gate 条件）：

| # | 标准 | 验证方式 |
| --- | --- | --- |
| SC-1 | **CausalStatement 可读**：Explorer 能用自己的话复述一个 CausalStatement 的因果关系（"因为 A 导致了 B"），而非复述字段名 | Explorer Validation（≥3/4 Explorer 达成） |
| SC-2 | **Evidence 可溯源**：Explorer 能从 CausalStatement 点击跳转到其底层 Entity/Relationship | 功能验收 + Explorer Validation |
| SC-3 | **Fact vs Inference 可区分**：Explorer 能识别界面上哪些信息是"库里的事实"、哪些是"系统推断" | Explorer Validation（≥3/4 Explorer 达成） |
| SC-4 | **Guide 叙事理由可理解**：Explorer 能说出"为什么系统推荐我看这个"（基于叙事理由，非猜测） | Explorer Validation（≥3/4 Explorer 达成） |
| SC-5 | **AI 不可用时仍可用**：关闭 AI 服务后，CausalStatement 自然语言句式仍正常呈现 | 自动化测试 |
| SC-6 | **Freeze Gate 未触**：ENTITY=8 / RELATIONSHIP=18 未变，Runtime Freeze 未触 | freeze-check 脚本通过 |

---

## 7. M82 启动前置条件检查

| 条件 | 状态 |
| --- | --- |
| M80.5 Revision ACCEPTED | ✅ `M80.5_REVISION_ACCEPTANCE_RECORD.md` |
| P03/P04/P07/P06 已接受 | ✅ 全部 ACCEPTED |
| M81a Gate PASS | ✅ `M81a_GATE_REPORT.md` |
| M81b Phase 1 Closed | ✅ A/F done, E/C verified, B/D deferred |
| Runtime Freeze 未触 | ✅ ENTITY=8 / RELATIONSHIP=18 不变 |
| M82 Entry Brief 已签署 | ⬜ 待 PO 签署 |

---

## 签核

| 签核项 | 签名 | 日期 |
| --- | --- | --- |
| M82 Mission 确认 | ________ | ________ |
| Input Contract 确认 | ________ | ________ |
| Non-Negotiable Principles 确认 | ________ | ________ |
| Scope / Non-Scope 确认 | ________ | ________ |
| Success Criteria 确认 | ________ | ________ |
| **M82 启动批准** | ________ | ________ |

签署后执行：M82 Causal Semantics Visible Implementation。

---

> 来源：M80.5 Revision Acceptance Record → M82
> 状态：Entry Brief（待 PO 签署，不实现）
> 日期：2026-08-05
