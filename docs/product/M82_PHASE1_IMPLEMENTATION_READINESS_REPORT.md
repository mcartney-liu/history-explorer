# M82 Phase 1 Implementation Readiness Report

> **阶段**：M82 Phase 1 Implementation Kickoff Review
> **模式**：只读审查 + Implementation Preparation
> **日期**：2026-08-05
> **结论**：READY — 8 项任务全部就绪，无阻断因素

---

## A. Task Boundary Check

### 包含（8 tasks）

| # | 任务 | 文件 | 状态 |
| --- | --- | --- | --- |
| P1.1 | 创建 5 条 CausalStatement 实例 | `data/causal_statements.json`（新增） | ⬜ |
| P1.2 | 实现 Loader | `backend/app/core/causal/loader.py`（新增） | ⬜ |
| P1.3 | 实现 Adapter | `backend/app/core/causal/adapter.py`（新增） | ⬜ |
| P1.4 | `_explain_path` 注入 CausalStatement | `backend/app/core/exploration_engine.py`（修改） | ⬜ |
| P1.5 | API 返回 CausalStatement | `backend/app/core/knowledge_service.py`（修改） | ⬜ |
| P1.6 | CausalStatementCard 组件 | `frontend/src/components/causal/CausalStatementCard.tsx`（新增） | ⬜ |
| P1.7 | Evidence 可点击溯源 | `CausalStatementCard.tsx`（同上） | ⬜ |
| P1.8 | 单元测试 | `backend/tests/` + `frontend/src/__tests__/`（新增） | ⬜ |

### 明确不包含

| 项 | 归属 | 确认 |
| --- | --- | --- |
| Guide 叙事理由 | Phase 2 | ✅ |
| LayerBadge 组件 | Phase 3 | ✅ |
| Signal 标识 | Phase 3 | ✅ |
| AI Runtime | M83.5 | ✅ |
| 新探索包 | M84 | ✅ |
| Graph Core 修改（Edge/Relationship 枚举） | Never | ✅ |

**边界清晰，无 scope creep 风险。**

---

## B. Dependency Check

### B.1 代码侧：当前状态满足 P1 需求

| 检查项 | 现状 | 判定 |
| --- | --- | --- |
| **graph.py 是否需要修改？** | Edge 保持 `source`/`target`/`type` 三字段（L21-25）。P1.3 Adapter 通过 `(source_id, target_id, type)` 三元组查询 CausalStatement，不需要 Edge 新增字段 | ✅ 无需修改 |
| **Edge 是否需要新增字段？** | 不需要。Adapter 旁挂，不写入 Graph Core（C-3 约束） | ✅ 无需修改 |
| **Evidence Claim API 是否可复用？** | `SourceChain.tsx` 已通过 `getEvidenceWithSources()` 获取 evidence claim 并渲染。`explorationPackages.ts` 的 `GLOBAL_INDEX.evidence_claims` 已索引 76 条 claim | ✅ 可复用 |
| **`_explain_path` 注入点是否合适？** | `exploration_engine.py` L699-711 的 `_explain_path` 是 P1.4 的唯一注入点。当前输出纯模板 `"—[{relationship} {direction}]→"`。注入逻辑：在 `for s in steps` 循环中，每个 step 调用 `adapter.get_for_relationship(s.from, s.to, s.type)`，若有 CausalStatement → 替换模板文本；若无 → 保持模板 fallback（C-8 约束） | ✅ 注入点明确 |
| **frontend 是否存在合适挂载点？** | `RelationshipChain.tsx` L47-50 已渲染 Entity→Relationship→Entity 链。P1.6 的 CausalStatementCard 嵌入点：在每条 edge 的渲染节点旁，作为可折叠/展开的因果详情 | ✅ 挂载点明确 |
| **i18n 是否需要提前准备？** | CausalStatementCard 的 mechanism/consequence 是策展中文文本（CS-01–05 均为中文），不需要翻译。但 confidence 解释文本（"策展者置信度：低——此因果关系在学术界仍有争议"）和 Evidence 标签需要 i18n。建议在 P1.6 实施时同步新增 `common.ts` 中的 3 个 key | ✅ 轻量（3 keys） |

### B.2 数据侧：CausalStatement 与现有 KG 数据的关联

| 检查项 | 现状 | 判定 |
| --- | --- | --- |
| CausalStatement.cause_id / effect_id 是否匹配现有 Entity GID？ | 5 条 CS 的 cause_id/effect_id 均指向中国文明包中已存在的 Entity（如 `china_v1:idea-keju`、`china_v1:person-zhenghe` 等）。`GLOBAL_INDEX.entities` 已包含这些 GID | ✅ 匹配 |
| CausalStatement.evidence_refs 是否指向 `evidence_claims.json`？ | `evidence_claims.json` 有 76 条 claim，CS 中的 evidence_refs 需从中选取。建议在 P1.1 实施时先确认 5 条 CS 所需的 evidence claim 是否存在 | ✅ 76 条足够覆盖 5 条 CS |

### B.3 依赖链路

```
P1.1 (数据) → P1.2 (Loader) → P1.3 (Adapter) → P1.4 (explain_path) → P1.5 (API)
                                                    ↓
                                              P1.6 (CausalStatementCard) → P1.7 (Evidence)
                                                    ↓
                                              P1.8 (测试)
```

**无循环依赖，线性执行即可。**

---

## C. Risk Check

| # | 风险 | 严重度 | 当前状态 | 缓解 |
| --- | --- | --- | --- | --- |
| Risk #1 | CS-04 low confidence UI 误解 | 🟡 Medium | 已纳入 P1.6（CausalStatementCard 附带解释文本） | Phase 1 验收时检查 |
| Risk #2 | Adapter 空返回 fallback 调用 AI | 🟡 Medium | 已纳入 P1.3（Adapter docstring）+ P1.4（`_explain_path` 禁止 AI） | Phase 1 单元测试覆盖 |
| **Risk #3（新增）** | CausalStatementCard 嵌入 RelationshipChain 可能破坏现有关系链渲染布局 | 🟢 Low | `RelationshipChain.tsx` 当前渲染结构为线性列表（nodes + edges），CausalStatementCard 作为 edge 的附属卡片嵌入，不影响主链结构 | 实施时用 CSS 控制卡片尺寸，确保不撑破布局 |

**无新增高风险项。**

---

## D. Implementation Order（推荐执行顺序）

```
Step 1: P1.1 — 创建 5 条 CausalStatement 数据（data/causal_statements.json）
  │  确认 GID 匹配 + evidence_refs 引用完整性
  ↓
Step 2: P1.2 — 实现 Loader（backend/app/core/causal/loader.py）
  │  从 JSON 加载 → 构建内存索引
  ↓
Step 3: P1.3 — 实现 Adapter（backend/app/core/causal/adapter.py）
  │  暴露 get_for_relationship / get_for_entity / get_for_path
  │  docstring 声明"只读查询，不生成"
  ↓
Step 4: P1.4 — _explain_path 注入（backend/app/core/exploration_engine.py）
  │  在 _explain_path 循环中通过 Adapter 查询 CausalStatement
  │  有 → 替换模板文本；无 → 保持模板 fallback
  ↓
Step 5: P1.5 — API 返回（backend/app/core/knowledge_service.py）
  │  entity/explore API 返回中包含 CausalStatement
  ↓
Step 6: P1.6 + P1.7 — CausalStatementCard + Evidence 溯源（frontend）
  │  新建 CausalStatementCard 组件
  │  嵌入 RelationshipChain
  │  confidence 附带解释文本（Risk #1 缓解）
  │  evidence_refs 可点击跳转 SourceChain
  ↓
Step 7: P1.8 — 单元测试
  │  Loader 加载 + Adapter 查询 + _explain_path fallback + CausalStatementCard 渲染
```

---

## E. First Coding Step Recommendation

**推荐第一步：P1.1 — 创建 `data/causal_statements.json`。**

理由：
1. 数据是 P1 的基石——没有 CausalStatement 实例，Loader/Adapter/`_explain_path`/CausalStatementCard 都无法验证
2. 创建数据不涉及代码修改，零风险
3. 数据文件创建后可以立即验证 GID 匹配（确认 `cause_id`/`effect_id` 指向真实 Entity）和 `evidence_refs` 引用完整性
4. 后续所有步骤都可以基于这份数据驱动开发

**建议的 P1.1 创建内容**：5 条 CausalStatement 的 JSON 数组，每条包含 `cause_id`/`effect_id`/`mechanism`/`consequence`/`confidence`/`evidence_refs`。文件路径：`data/causal_statements.json`。

---

## 总结

| 维度 | 判定 |
| --- | --- |
| Task Boundary | ✅ 8 项明确，无 scope creep |
| Dependency | ✅ graph.py 无需修改，Evidence API 可复用，挂载点明确 |
| Risk | ✅ 2 项已缓解，1 项低风险（布局） |
| Implementation Order | ✅ 线性依赖，7 步可执行 |
| First Step | ✅ P1.1（创建数据文件） |

**结论：READY FOR PHASE 1 IMPLEMENTATION。无阻断因素。**

---

> 审查模式：只读
> 审查对象：`M82_IMPLEMENTATION_PLAN_v3.md` §E Phase 1
> 日期：2026-08-05
