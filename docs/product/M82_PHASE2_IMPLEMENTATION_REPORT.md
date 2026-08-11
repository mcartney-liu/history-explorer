# M82 Phase 2 Implementation Report

> **阶段**：M82 Phase 2 Implementation
> **日期**：2026-08-05
> **状态**：**IMPLEMENTED — 5 files changed, 0 lint errors**

---

## A. Files Changed

| # | 文件 | 操作 | 说明 |
| --- | --- | --- | --- |
| 1 | `frontend/src/data/explorationGuide.ts` | 修改 | `GuideStep` + `causal`; `resolveCausalForEdge()`; `getNextSteps(causalStatements)`; `getGuideSnapshot(causalStatements)` |
| 2 | `frontend/src/components/guide/GuidePanel.tsx` | 修改 | 接收 `causalStatements`; 嵌入 `CausalStatementCard` |
| 3 | `frontend/src/components/package/RelationshipChain.tsx` | 修改 | 接收 `causalStatements`; `journey-arrow` 下方嵌入 `CausalStatementCard` |
| 4 | `frontend/src/components/package/PackageJourney.tsx` | 修改 | 接收 `causalStatements`; 透传给 `RelationshipChain` |
| 5 | `frontend/src/pages/ExplorationPackagePage.tsx` | 修改 | 硬编码 `CHINA_CAUSAL_STATEMENTS` (5 条); 传递给 `GuidePanel` + `PackageJourney` |

---

## B. Architecture Impact

| 层 | 影响 | 说明 |
| --- | --- | --- |
| Semantic Layer | ❌ 无 | Schema 7 字段未修改 |
| Fact Layer | ❌ 无 | Graph Core / Edge 未修改 |
| Inference Layer | ❌ 无 | Phase 3 范围 |
| Exploration Layer | ✅ Guide reason + RelationshipChain | 纯前端变更，不改变 Explorer Flow |
| API | ❌ 无 | `causal_statements` 已在 P1.5 响应中 |

---

## C. Implementation Details

### P2.1 — Data Structure

- `GuideStep.causal?: CausalStatementData` — 可选字段，向后兼容
- `CausalStatementData` 类型与后端 `PathCandidate.causal_statements[]` 一致

### P2.2 — Causal Reason Resolver

- `resolveCausalForEdge(edge, causalStatements)` — O(n) 直接匹配
- 匹配规则：`cs.cause_id === edge.from && cs.effect_id === edge.to`
- 无匹配 → `null` → 调用方 fallback 到模板 reason

### P2.3 — GuidePanel Integration

- `GuideStep.reason` 优先使用 `cs?.mechanism ?? template.meaning`
- `step.causal` 存在时渲染 `CausalStatementCard`（完整 mechanism + consequence + confidence + evidence）

### P2.4 — RelationshipChain Integration

- `journey-arrow` 下方条件渲染 `CausalStatementCard`
- 使用已有的 `resolveCausalForEdge()` resolver

### P2.5 — Page Integration

- 硬编码 `CHINA_CAUSAL_STATEMENTS`（5 条，与 `data/causal_statements.json` 一致）
- 仅中国文明包传递 CS 数据（`pkg.slug === 'china-civilization-v1'`）
- 其他包不传 → 保持原行为（模板 reason）

---

## D. Constraint Compliance

| # | 约束 | 状态 |
| --- | --- | --- |
| IC-1 | 不新增 CausalStatement 字段 | ✅ |
| IC-2 | 不新增 API | ✅ |
| IC-3 | 不调用 AI/LLM | ✅ |
| IC-4 | 不修改 Graph Core | ✅ |
| IC-5 | 不生成 fallback 文本 | ✅ 无 CS → 模板 reason |
| IC-6 | CausalStatementCard 不修改 | ✅ 仅增加挂载点 |
| IC-7 | 匹配策略为直接 GID 匹配 | ✅ |
| IC-8 | 0 个新依赖 | ✅ |

---

## E. Known Limitations

| 限制 | 说明 | 解决时机 |
| --- | --- | --- |
| 硬编码 CS 数据 | `CHINA_CAUSAL_STATEMENTS` 在页面层硬编码，非 API 动态获取 | P3.2 时接入 `PathCandidate.causal_statements` API |
| 仅中国包有 CS | 其他 3 个包（丝路/罗马/印度）无 CS 数据 | M84 包库扩展时补充 |
| vitest 环境阻塞 | 前端测试无法运行（与 P1.6 相同的环境问题） | 环境修复后补充测试 |

---

## F. Phase 2 Status

### PASS — P2.1-P2.5 COMPLETE

| 任务 | 状态 |
| --- | --- |
| P2.1 Data Structure | ✅ |
| P2.2 Causal Resolver | ✅ |
| P2.3 GuidePanel Integration | ✅ |
| P2.4 RelationshipChain Integration | ✅ |
| P2.5 Page Integration | ✅ |
| P2.6 Tests | ⚠️ vitest 环境阻塞 |

**满足进入 Phase 3 条件**：Guide 叙事理由 + RelationshipChain 因果解释均已实现。Phase 3（LayerBadge + Signal 标识）可并行启动。

---

> 日期：2026-08-05
> 状态：**M82 PHASE 2 IMPLEMENTED — P2.1-P2.5 COMPLETE**
