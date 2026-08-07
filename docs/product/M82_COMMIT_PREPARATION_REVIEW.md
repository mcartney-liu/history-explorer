# M82 Commit Preparation Review

> **模式**：只读审查
> **日期**：2026-08-05
> **结论**：**READY FOR COMMIT — 推荐 3-Group 拆分提交**

---

## Check 1 — 临时文件排除列表

以下文件 **不应进入 M82 commit**：

| # | 文件 | 原因 |
| --- | --- | --- |
| 1 | `backend/uvicorn_boot.err` | 临时启动日志 |
| 2 | `backend/uvicorn_boot.out` | 临时启动日志 |
| 3 | `frontend/vite_boot.err` | 临时启动日志 |
| 4 | `frontend/vite_boot.out` | 临时启动日志 |
| 5 | `.codebuddy/` | IDE 内部数据（memory 文件） |

> **排除数：5**。这些文件在 `.gitignore` 或 commit 脚本中应被显式排除。

---

## Check 2 — Commit Group 划分

基于语义内聚性和 review 便利性，推荐 **3 个 commit group**：

```
Group A: Backend Core (CausalStatement 数据 + 运行时)
Group B: Frontend Core (组件 + 数据层 + i18n)
Group C: Governance (测试 + 文档)
```

### 划分原则

1. **Group A 和 B 可独立 review**：Group A 不依赖 Group B 的任何前端代码，反之亦然
2. **Group C 放最后**：测试和文档是交付物的验证与记录，不影响运行时
3. **每组的 diff 量控制在可 review 范围**：A ~30KB, B ~50KB, C ~400KB（主要是文档）

---

## Check 3 — 每组文件清单

### Group A — Backend Core：CausalStatement 数据 + 运行时

**语义**：Semantic Layer 的完整后端实现 — Schema + Loader + Adapter + Engine Integration

**Modified（3 files）**：

| 文件 | 变更 | 关联任务 |
| --- | --- | --- |
| `backend/app/core/causal/__init__.py` | +3 行（新增 exports） | P1.3 |
| `backend/app/core/causal/model.py` | confidence `float\|None` → `str\|None` | P1.1（C-7 修正） |
| `backend/app/core/exploration_engine.py` | +67/-20（CausalAdapter 注入 + `_explain_path` 增强） | P1.4/P1.5 |

**Untracked（3 files）**：

| 文件 | 说明 | 关联任务 |
| --- | --- | --- |
| `backend/app/core/causal/adapter.py` | 115 行，只读查询适配器 | P1.3 |
| `backend/app/core/causal/loader.py` | 143 行，JSON 加载器 + 双索引 | P1.2 |
| `data/causal_statements.json` | 5 条 CausalStatement 数据 | P1.1 |

**Group A 统计**：6 files, ~350 行代码

---

### Group B — Frontend Core：组件 + 数据层 + i18n

**语义**：Semantic Layer 的完整前端实现 — 类型定义 + 组件 + 页面集成 + 样式

**Modified（10 files）**：

| 文件 | 变更 | 关联任务 |
| --- | --- | --- |
| `frontend/src/data/explorationGuide.ts` | +29/-2（resolveCausalForEdge + GuideStep.causal 字段） | P2.2/P2.3 |
| `frontend/src/components/guide/GuidePanel.tsx` | +11/-4（CS reason 替代模板 + CausalStatementCard 嵌入） | P2.4 |
| `frontend/src/components/package/RelationshipChain.tsx` | +21/-6（CausalStatementCard 在 journey-arrow 下方） | P2.5 |
| `frontend/src/components/package/PackageJourney.tsx` | +6/-1（causalStatements prop 传递） | P2.5 |
| `frontend/src/components/RecommendationPanel.tsx` | +5/-1（LayerBadge "系统推断"） | P3.3 |
| `frontend/src/pages/ExplorationPackagePage.tsx` | +49（CHINA_CAUSAL_STATEMENTS 硬编码） | P2.1（DEBT-001） |
| `frontend/src/locales/zh/common.ts` | +13（12 new i18n keys） | P1.6/P3.1 |
| `frontend/src/locales/en/common.ts` | +13（12 new i18n keys） | P1.6/P3.1 |
| `frontend/src/locales/ja/common.ts` | +13（12 new i18n keys） | P1.6/P3.1 |
| `frontend/src/styles/package.css` | +80（CausalStatementCard 在包页面中的样式） | P2.6 |

**Untracked（5 files）**：

| 文件 | 说明 | 关联任务 |
| --- | --- | --- |
| `frontend/src/data/causalStatement.ts` | 30 行，CausalStatementData 类型 + confidenceLabelKey() | P1.5 |
| `frontend/src/data/evidenceTrace.ts` | 36 行，resolveEvidenceRefs + lookupEvidenceClaim | P1.7 |
| `frontend/src/components/causal/CausalStatementCard.tsx` | 89 行，4-section card 组件 | P1.6 |
| `frontend/src/components/common/LayerBadge.tsx` | 37 行，causal/inference/evidence 三态 | P3.1 |
| `frontend/src/styles/components.css` | +21（LayerBadge + CausalStatementCard 通用样式） | P3.2 |

**Group B 统计**：15 files, ~330 行代码 + ~100 行 CSS

---

### Group C — Governance：测试 + 文档

**语义**：M82 全量测试覆盖 + 治理文档链

**Modified（2 files）**：

| 文件 | 变更 | 关联任务 |
| --- | --- | --- |
| `frontend/src/data/explorationGuide.test.ts` | +126（P2 resolver/guide reason/DEBT 验证） | P2.2/P2.3 |
| `frontend/src/styles/components.css` | 见 Group B | - |

**Untracked — 测试（10 files）**：

| 文件 | 测试数 | 关联任务 |
| --- | --- | --- |
| `backend/tests/conftest.py` | - | 测试基础设施 |
| `backend/tests/test_m82_p1_2_loader.py` | 9 | P1.2 |
| `backend/tests/test_m82_p1_3_adapter.py` | 8 | P1.3 |
| `backend/tests/test_m82_p1_4_explain_path.py` | 7 | P1.4 |
| `backend/tests/test_m82_p1_8_final_validation.py` | 24 | P1.8 |
| `frontend/src/components/causal/__tests__/CausalStatementCard.test.tsx` | 11 | P1.6 |
| `frontend/src/components/common/__tests__/LayerBadge.test.tsx` | 4 | P3.1 |
| `frontend/src/components/guide/__tests__/GuidePanel.p2.test.tsx` | 4 | P2.4 |
| `frontend/src/components/package/__tests__/RelationshipChain.p2.test.tsx` | 4 | P2.5 |
| `frontend/src/data/__tests__/evidenceTrace.test.ts` | 5 | P1.7 |

**Untracked — 文档（36 files）**：

| 文件 | 类别 |
| --- | --- |
| `docs/product/ADR-M82-CAUSAL-SEMANTIC-LAYER.md` | 架构决策 |
| `docs/product/M82_CAUSAL_DATA_CONTRACT_FREEZE_RECORD.md` | 数据合同 |
| `docs/product/M82_CAUSAL_DATA_CONTRACT_FUTURE_COMPATIBILITY_REPORT.md` | 兼容性 |
| `docs/product/M82_CAUSAL_DATA_CONTRACT_FUTURE_SCALE_SANITY_REPORT.md` | 规模化 |
| `docs/product/M82_CAUSAL_DATA_CONTRACT_REVIEW.md` | 合同审查 |
| `docs/product/M82_CLOSURE_REVIEW.md` | 关闭审查 |
| `docs/product/M82_FINAL_CLOSE_REVIEW.md` | 最终关闭 |
| `docs/product/M82_FINAL_GATE_REPORT.md` | 最终闸门 |
| `docs/product/M82_P1.1_DATA_CREATION_REPORT.md` | P1.1 |
| `docs/product/M82_P1.2_IMPLEMENTATION_REPORT.md` | P1.2 |
| `docs/product/M82_P1.3_IMPLEMENTATION_REPORT.md` | P1.3 |
| `docs/product/M82_P1.4_IMPLEMENTATION_REPORT.md` | P1.4 |
| `docs/product/M82_P1.5_IMPLEMENTATION_REPORT.md` | P1.5 |
| `docs/product/M82_P1.6_FRONTEND_INTEGRATION_GATE_REPORT.md` | P1.6 闸门 |
| `docs/product/M82_P1.6_IMPLEMENTATION_REPORT.md` | P1.6 |
| `docs/product/M82_P1.7_EVIDENCE_TRACEABILITY_REPORT.md` | P1.7 |
| `docs/product/M82_P1.7_REVIEW_GATE_REPORT.md` | P1.7 闸门 |
| `docs/product/M82_P1.8_FINAL_VALIDATION_REPORT.md` | P1.8 |
| `docs/product/M82_PHASE1_IMPLEMENTATION_READINESS_REPORT.md` | Phase 1 |
| `docs/product/M82_PHASE2_ARCHITECTURE_GATE.md` | Phase 2 |
| `docs/product/M82_PHASE2_CLOSURE_GATE.md` | Phase 2 |
| `docs/product/M82_PHASE2_DESIGN_REVIEW.md` | Phase 2 |
| `docs/product/M82_PHASE2_IMPLEMENTATION_PLAN.md` | Phase 2 |
| `docs/product/M82_PHASE2_IMPLEMENTATION_REPORT.md` | Phase 2 |
| `docs/product/M82_PHASE2_IMPLEMENTATION_REVIEW.md` | Phase 2 |
| `docs/product/M82_PHASE2_PHASE3_PLANNING_REVIEW.md` | Phase 2→3 |
| `docs/product/M82_PHASE2_VALIDATION_REPORT.md` | Phase 2 |
| `docs/product/M82_PHASE3_ARCHITECTURE_REVIEW.md` | Phase 3 |
| `docs/product/M82_PHASE3_IMPLEMENTATION_GATE.md` | Phase 3 |
| `docs/product/M82_PHASE3_IMPLEMENTATION_PLAN.md` | Phase 3 |
| `docs/product/M82_PHASE3_IMPLEMENTATION_REPORT.md` | Phase 3 |
| `docs/product/M82_PHASE3_SCOPE_CONFIRMATION.md` | Phase 3 |
| `docs/product/M82_PHASE3_VALIDATION_GATE.md` | Phase 3 |
| `docs/product/M82_SEMANTIC_LAYER_GOVERNANCE_GATE.md` | 治理 |
| `docs/product/M82_SEMANTIC_LAYER_SCALE_STRESS_REPORT.md` | 规模化 |
| `docs/product/M82_RELEASE_READINESS_REVIEW.md` | 本次审查 |

**Group C 统计**：48 files, 104 tests, 36 docs

---

## Check 4 — 跨 Milestone 文件检查

| 文件 | 分析 | 判定 |
| --- | --- | --- |
| `docs/product/M83_ENTRY_GAP_ANALYSIS.md` | M83 入口差距分析，M82 治理过程产物 | **跨 milestone 标记** |
| `docs/product/M83_ENTRY_GATE_REVIEW.md` | M83 入口闸门审查，M82 治理过程产物 | **跨 milestone 标记** |
| `frontend/src/pages/ExplorationPackagePage.tsx` | 含 M82-P2-DEBT-001 硬编码数据 | **M82 技术债，后续 M83 需修改** |
| `backend/app/core/causal/model.py` | confidence 类型修正（M82 C-7 约束） | **M82 正确** |

### 处理建议

**M83 文档**（2 files）：
- `M83_ENTRY_GAP_ANALYSIS.md` 和 `M83_ENTRY_GATE_REVIEW.md` 是 M82 Close 时产生的治理文档
- 它们属于 M82 治理产物（记录 M82→M83 过渡状态），但文件名前缀为 "M83"
- **推荐**：包含在 M82 commit 中，因为它们是在 M82 Final Close 阶段生成的，属于 M82 的完整治理记录
- **替代方案**：如果 PO 希望保持文件名和 commit 严格对齐，可将其移到 M83 的第一次 commit，但会丢失 M82 关闭时的完整治理链

**技术债标记**（1 file）：
- `ExplorationPackagePage.tsx` 中的 `CHINA_CAUSAL_STATEMENTS` 硬编码已标记为 M82-P2-DEBT-001
- 不影响 M82 功能完整性，M83 P3.2 将替换为真实 API

> **跨 milestone 判定**：2 个 M83 文档是 M82 治理产物。推荐包含在 M82 commit 中以保持治理链完整性。

---

## Check 5 — Commit Message 建议

### 3-Group Commit Sequence

```
Commit 1/3 — Group A: Backend Core
===================================
feat(m82): add causal semantic layer — backend core

Add the CausalStatement interpretive semantic layer (ADR-M79) to the
backend:

- CausalStatement schema: 7-field frozen dataclass with confidence as
  enum string (C-7 constraint: "high"|"medium"|"low"|null)
- CausalLoader: read-only JSON loader with dual index (by_cause /
  by_effect), forward-compatible field parsing
- CausalStatementAdapter: read-only query adapter (get_for_relationship
  / get_for_entity / get_for_path), no generation (C-5/C-6)
- ExplorationEngine: optional causal_adapter injection; _explain_path
  now returns (text, causal_statements) tuple; PathCandidate gains
  causal_statements field
- Data: 5 CausalStatements (科举→文官, 三省六部→内阁, 唐诗→宋词,
  宋朝→理学, 明朝→郑和)

Phase: P1.1-P1.5


Commit 2/3 — Group B: Frontend Core
===================================
feat(m82): add causal semantic layer — frontend components and i18n

Integrate CausalStatement into the Explorer UI:

- CausalStatementCard: 4-section card (mechanism / consequence /
  confidence / evidence refs) with LayerBadge
- LayerBadge: pure presentational component (causal "因果解释" /
  inference "系统推断" / evidence "证据来源")
- GuidePanel: CS.mechanism replaces template reason when available;
  CausalStatementCard embedded below guide step
- RelationshipChain: CausalStatementCard rendered below journey-arrow
  when edge matches a CS
- RecommendationPanel: LayerBadge("inference") on panel title
- evidenceTrace.ts: bridge resolveEvidenceRefs / lookupEvidenceClaim
  to existing SourceChain API
- i18n: 12 new keys for zh/en/ja (guide.*, causal.*, layer.*)
- Styles: causal-card, layer-badge, confidence states CSS

Phase: P1.6-P1.7, P2.1-P2.6, P3.1-P3.3
Known Debt: M82-P2-DEBT-001 (hardcoded CHINA_CAUSAL_STATEMENTS in
  ExplorationPackagePage.tsx, to be replaced in M83 P3.2)


Commit 3/3 — Group C: Tests + Governance
========================================
test(m82): add test suite and governance records for causal semantic layer

- Backend: 48 tests (loader 9, adapter 8, explain_path 7,
  final_validation 24) — schema contract, runtime integration,
  boundary compliance, scale simulation
- Frontend: 56 tests (evidenceTrace 5, explorationGuide 28,
  CausalStatementCard 11, LayerBadge 4, GuidePanel.p2 4,
  RelationshipChain.p2 4)
- Governance: 36 documents including ADR, gate reports, validation
  records, freeze records, closure reviews, and M83 entry preparation

Total: 104 tests (48 backend + 56 frontend), 36 governance documents
```

### 替代方案：单 Commit

如果 PO 偏好单 commit（M82 作为一个原子功能单元）：

```
feat(m82): add causal semantic layer and trust presentation

Add the CausalStatement interpretive semantic layer (ADR-M79):
- Backend: Schema (7-field frozen) + Loader (dual index) +
  Adapter (read-only) + Engine integration (_explain_path enrichment)
- Frontend: CausalStatementCard (4-section) + LayerBadge (3-layer) +
  GuidePanel CS integration + RelationshipChain CS integration +
  evidenceTrace bridge + 12 i18n keys (zh/en/ja)
- Data: 5 CausalStatements (科举→文官, 三省六部→内阁, 唐诗→宋词,
  宋朝→理学, 明朝→郑和)
- Tests: 104 (48 backend + 56 frontend)
- Docs: 36 governance records (ADR + gates + validations + closure)

Phase 1-3 complete. Known debt: M82-P2-DEBT-001.
```

---

## 总览矩阵

| Group | Files | 行数（估） | 语义 | 可独立 Review |
| --- | --- | --- | --- | --- |
| **A — Backend Core** | 6 | ~350 代码 | Semantic Layer 后端全栈 | ✅ |
| **B — Frontend Core** | 15 | ~430 代码+CSS | Semantic Layer 前端全栈 | ✅ |
| **C — Tests + Docs** | 48 | 104 tests + 36 docs | 验证 + 治理记录 | ✅ |
| **排除** | 5 | - | 临时日志 + IDE 数据 | - |
| **合计** | 69 | - | M82 全量 | - |

---

## 最终判定

```
READY FOR COMMIT
```

**推荐方案**：3-Group 拆分提交（便于 review 和 bisect）

**条件**：
1. 排除 5 个临时文件（`*_boot.{err,out}` + `.codebuddy/`）
2. 确认 M83 文档（2 files）是否纳入 M82 commit 或延迟到 M83
3. 确认 `causal/__init__.py` 和 `causal/model.py` 的 diff 已 review（它们是已有文件的修改，不是新文件）

**不执行 commit。等待 PO 指令。**

---

## 附录：完整文件清单（用于 commit 脚本）

### Group A — Backend Core

```
backend/app/core/causal/__init__.py          (M)
backend/app/core/causal/model.py             (M)
backend/app/core/causal/adapter.py           (A)
backend/app/core/causal/loader.py            (A)
backend/app/core/exploration_engine.py       (M)
data/causal_statements.json                  (A)
```

### Group B — Frontend Core

```
frontend/src/data/causalStatement.ts         (A)
frontend/src/data/evidenceTrace.ts           (A)
frontend/src/data/explorationGuide.ts        (M)
frontend/src/components/causal/CausalStatementCard.tsx  (A)
frontend/src/components/common/LayerBadge.tsx            (A)
frontend/src/components/guide/GuidePanel.tsx             (M)
frontend/src/components/package/RelationshipChain.tsx    (M)
frontend/src/components/package/PackageJourney.tsx       (M)
frontend/src/components/RecommendationPanel.tsx          (M)
frontend/src/pages/ExplorationPackagePage.tsx            (M)
frontend/src/locales/zh/common.ts            (M)
frontend/src/locales/en/common.ts            (M)
frontend/src/locales/ja/common.ts            (M)
frontend/src/styles/components.css           (M)
frontend/src/styles/package.css              (M)
```

### Group C — Tests + Docs

```
backend/tests/conftest.py                    (A)
backend/tests/test_m82_p1_2_loader.py        (A)
backend/tests/test_m82_p1_3_adapter.py       (A)
backend/tests/test_m82_p1_4_explain_path.py  (A)
backend/tests/test_m82_p1_8_final_validation.py (A)
frontend/src/components/causal/__tests__/CausalStatementCard.test.tsx (A)
frontend/src/components/common/__tests__/LayerBadge.test.tsx (A)
frontend/src/components/guide/__tests__/GuidePanel.p2.test.tsx (A)
frontend/src/components/package/__tests__/RelationshipChain.p2.test.tsx (A)
frontend/src/data/__tests__/evidenceTrace.test.ts (A)
frontend/src/data/explorationGuide.test.ts   (M)
docs/product/ADR-M82-CAUSAL-SEMANTIC-LAYER.md (A)
docs/product/M82_CAUSAL_DATA_CONTRACT_FREEZE_RECORD.md (A)
docs/product/M82_CAUSAL_DATA_CONTRACT_FUTURE_COMPATIBILITY_REPORT.md (A)
docs/product/M82_CAUSAL_DATA_CONTRACT_FUTURE_SCALE_SANITY_REPORT.md (A)
docs/product/M82_CAUSAL_DATA_CONTRACT_REVIEW.md (A)
docs/product/M82_CLOSURE_REVIEW.md (A)
docs/product/M82_FINAL_CLOSE_REVIEW.md (A)
docs/product/M82_FINAL_GATE_REPORT.md (A)
docs/product/M82_P1.1_DATA_CREATION_REPORT.md (A)
docs/product/M82_P1.2_IMPLEMENTATION_REPORT.md (A)
docs/product/M82_P1.3_IMPLEMENTATION_REPORT.md (A)
docs/product/M82_P1.4_IMPLEMENTATION_REPORT.md (A)
docs/product/M82_P1.5_IMPLEMENTATION_REPORT.md (A)
docs/product/M82_P1.6_FRONTEND_INTEGRATION_GATE_REPORT.md (A)
docs/product/M82_P1.6_IMPLEMENTATION_REPORT.md (A)
docs/product/M82_P1.7_EVIDENCE_TRACEABILITY_REPORT.md (A)
docs/product/M82_P1.7_REVIEW_GATE_REPORT.md (A)
docs/product/M82_P1.8_FINAL_VALIDATION_REPORT.md (A)
docs/product/M82_PHASE1_IMPLEMENTATION_READINESS_REPORT.md (A)
docs/product/M82_PHASE2_ARCHITECTURE_GATE.md (A)
docs/product/M82_PHASE2_CLOSURE_GATE.md (A)
docs/product/M82_PHASE2_DESIGN_REVIEW.md (A)
docs/product/M82_PHASE2_IMPLEMENTATION_PLAN.md (A)
docs/product/M82_PHASE2_IMPLEMENTATION_REPORT.md (A)
docs/product/M82_PHASE2_IMPLEMENTATION_REVIEW.md (A)
docs/product/M82_PHASE2_PHASE3_PLANNING_REVIEW.md (A)
docs/product/M82_PHASE2_VALIDATION_REPORT.md (A)
docs/product/M82_PHASE3_ARCHITECTURE_REVIEW.md (A)
docs/product/M82_PHASE3_IMPLEMENTATION_GATE.md (A)
docs/product/M82_PHASE3_IMPLEMENTATION_PLAN.md (A)
docs/product/M82_PHASE3_IMPLEMENTATION_REPORT.md (A)
docs/product/M82_PHASE3_SCOPE_CONFIRMATION.md (A)
docs/product/M82_PHASE3_VALIDATION_GATE.md (A)
docs/product/M82_SEMANTIC_LAYER_GOVERNANCE_GATE.md (A)
docs/product/M82_SEMANTIC_LAYER_SCALE_STRESS_REPORT.md (A)
docs/product/M82_RELEASE_READINESS_REVIEW.md (A)
docs/product/M83_ENTRY_GAP_ANALYSIS.md (A)  ← 跨 milestone
docs/product/M83_ENTRY_GATE_REVIEW.md (A)   ← 跨 milestone
```

### 排除（不 commit）

```
backend/uvicorn_boot.err
backend/uvicorn_boot.out
frontend/vite_boot.err
frontend/vite_boot.out
.codebuddy/
```
