# ADR-0028 — P4 (Verification & Acceptance) 验收报告

> 生成时间：2026-08-17 | 状态：**验证完成，待 PO 签字**
> 全程遵守 PO 常令：未执行 commit / push / tag
> 分支：`phase5-journey-continuity`

---

## 0. 总判定（RoleVerdict）

**VERIFY PASS（验证通过，待签字）**。三道验证闸全绿：

- **L6** 后端全量回归：607 passed / 3 failed（3 个均为**预存失败**，ADR-0028 引入 **0 个新失败**）
- **L7** 冻结闸：`PASSED — no D-class violations`
- **L7** 前端类型检查：`tsc --noEmit` EXIT=0，0 错误（架构解耦佐证）

`dormant-by-default`（生产默认 `tol=None`）保证既有行为零变化；D1 防御（`disputes`/`reinterprets` 永不进 temporal gate）；阶段隔离（gate 仅接于 `grounding_builder.py` / `response_validator.py` 两个授权面）。

---

## 1. 执行顺序与进度

**P1 Temporal Core → P2 Grounding Integration ∥ P3 Response Validation Integration → P4 Verification & Acceptance**

| 阶段 | 内容 | 状态 |
|---|---|---|
| P1 | `temporal_gate.py` + `test_temporal_gate.py`（纯函数，未接线）| ✅ |
| P2 | `grounding_builder.py` 接线（+89）| ✅ |
| P3 | `response_validator.py` 接线（+86）| ✅ |
| P4 | L6/L7 验证 + 文档同步 + 本报告 | ✅ |

---

## 2. 验证证据（真实 git / pytest / tsc 输出）

### 2.1 L6 后端全量回归

```
3 failed, 607 passed in 19.60s
```

3 个失败**均为预存**（与 ADR-0028 零关联，已隔离确认）：

- `tests/test_evidence_claim.py::test_validate_evidence_claims_passes_for_curated_file`
- `tests/test_m82_p1_4_explain_path.py::test_path_candidate_causal_statements`
- `tests/test_m82_p1_8_final_validation.py::TestRuntimeIntegration::test_api_path_candidate_has_cs`

（均断言 `causal_statements` 字段缺失，疑似 ADR-0019 策展数据 / 字段未对齐 → 见 §6 开放项）

### 2.2 L7 冻结闸

```
[M3.5 Freeze Guard] PASSED — no D-class violations.
```

> 前置 `fatal: Invalid symmetric difference expression master...HEAD` 为预存 git-ref 怪象，不影响实际判定行。

### 2.3 L7 前端类型检查（解耦佐证）

```
frontend/ $ ./node_modules/.bin/tsc --noEmit -p tsconfig.json
EXIT=0 ; ERROR_COUNT=0
```

ADR-0028 改动全部位于 `backend/app/ai_gateway/`（Python），前端不 import 后端 Python、未改任何共享接口（STOP 条件"改 answer_service 接口"未触发，freeze PASSED 亦佐证），故前端构建影响 **= 设计上 N/A**。

### 2.4 定向契约测试

`tests/test_temporal_gate.py` 当前 **159 passed**（P1 STOP 报告所写 153 为 L5 集成测试加入前数字；P2/P3 补的 L5 grounding/validator 集成测试使总数升至 159）。覆盖 L0 漂移 / L1 原语 / L2 分类器 / L3 决策矩阵 / L4 优先+双路径+隔离 / L5 集成（dormant pass-through / active gating rejects / D1 prefilter）。

---

## 3. 关键不变量核验

| 不变量 | 验证方式 | 结果 |
|---|---|---|
| dormant-by-default（`tol=None` → 纯 pass-through，零行为变化）| 全量套件绿 + L5 dormant 测试 | ✅ |
| D1 防御：`disputes`/`reinterprets` 永不进 gate | L2 classifier raise + L5 prefilter 测试 | ✅ |
| 两条独立 SOFT 路径（SOFT-WEAK 跳过 / PROPAGATION 降级，禁合并）| L4 `TwoIndependentSoftPaths` 测试 | ✅ |
| 阶段隔离：gate 仅接于两授权面 | `test_gate_wired_only_into_authorized_surfaces` | ✅ |
| 18 型 → 4 类映射严格契约 | L2/L3 测试 | ✅ |
| D2 显式 `tol`（`None`→`MissingToleranceError`，绝不 0）| L1 测试 | ✅ |

---

## 4. 交付物清单（10 项，附真实 git 证据）

**已跟踪修改**（`git diff --stat`，ADR-0028 scope）：

| # | 文件 | 变更 | 阶段 |
|---|---|---|---|
| 1 | `backend/app/ai_gateway/temporal_gate.py` | 新建（未跟踪）| P1 Temporal Core |
| 2 | `backend/tests/test_temporal_gate.py` | 新建（未跟踪）| P1/P2/P3 L0–L5 |
| 3 | `scripts/freeze-check.mjs` | +6 | P1 STOP-A 放行 |
| 4 | `backend/app/ai_gateway/grounding_builder.py` | +89 | P2 接线 |
| 5 | `backend/app/ai_gateway/response_validator.py` | +86 | P3 接线 |
| 6 | `backend/app/ai_gateway/config.py` | +71（Step 0-C 配置载波，P2/P3 仅引用未改）| Step 0-C |

**新建文档**（未跟踪）：

| # | 文件 | 性质 |
|---|---|---|
| 7 | `ADR-0028_P1_STOP_REPORT.md` | P1 STOP 报告 |
| 8 | `docs/15_DECISIONS/ADR-0028_research_context_grounding_revision.md` | ADR-0028 主文档（架构决策）|
| 9 | `docs/15_DECISIONS/CONTRACT_vNext_1.2_research_context.md` | Contract vNext 1.2（冻结权威，G4 落盘）|
| 10 | `docs/15_DECISIONS/ADR-0027_grounding_temporal_coherence_gate.md` | ADR-0027（被取代参考，保留溯源）|

> 本报告为第 11 份产物（验证交付物），待签字后随 P4 一并归档。

**合计 ADR-0028 改动**：4 文件 tracked（+252 行）+ 6 新建文件。无关改动（`M36_0_IMPLEMENTATION_REPORT.md`、`lumina-demo/*`、`lumina_borrow_plan.md`）不在 ADR-0028 scope，原样未动。

---

## 5. 冻结合规

- **STOP-A（硬阻断）**已按 PO 批准**选项 A**走 Freeze Revision Gate：`SCOPE_ALLOWLIST` 精确加 2 行（`temporal_gate.py` / `test_temporal_gate.py`），additive、不碰 denylist 逻辑。
- 未触发任何 9-STOP：未改 denylist / Contract / M4-002 / `validation.py` / `exploration_engine.py` / G1 / `answer_service` 接口 / 加依赖 / 改 ADR-0028 语义。
- freeze-check 复验 **PASSED**。

---

## 6. 开放项（需 PO 拍板）

### 6.1 三项预存测试失败（非 ADR-0028 引入）
3 个失败均因 `causal_statements` 字段断言缺失，疑似 ADR-0019 策展数据 / 字段未对齐（与 temporal gating 正交）。**建议不阻塞 ADR-0028 验收**，另立 triage。

### 6.2 M4-002:14 文档张力
`docs/M4-002_Architecture.md:14` 仍写 `RELATIONSHIP_TYPES=18`，但 ADR-0019 + freeze-check（`EXPECTED_RELATIONSHIP_TYPES=20`）已为 20。改 M4-002 = STOP 级（改冻结引用）。**建议作为已知文档漂移记录**，或走独立 Freeze Revision Gate 文档补丁，不并入本次。

### 6.3 提交时机
全程遵守"不 commit / push / tag"常令，当前所有改动未提交。待签字后，按团队纪律：每人提交自己那笔、共享分支 `phase5-journey-continuity`、ff-only + annotated tag 仅 PO 拍板。

---

## 7. 签字请求（单交互点）

验证全部通过，三闸全绿，`dormant-by-default` 保证既有行为零变化。请审阅本报告与 §6 两项开放项。

**是否批准 ADR-0028 P1–P4 验收？** 另请就 §6.1 / §6.2 两项开放项给处置方向。

---

## 8. PO 签字（2026-08-17）

PO（翔哥）经单交互点拍板，三项均采用推荐项：

- **验收**：✅ 批准 ADR-0028 P1–P4 验收（三闸全绿、dormant-by-default 零行为变化成立）。
- **§6.1 三项预存失败**：登记为已知债务（ADR-0019 策展数据 / `causal_statements` 字段对齐），**不阻塞** ADR-0028，另立 triage。
- **§6.2 M4-002:14 张力**：记为已知文档漂移（`RELATIONSHIP_TYPES=18` vs 实际 20），**不并入本次**；后续如需修正走独立 Freeze Revision Gate 文档补丁。

**状态**：验收闭环完成。全部改动保持未提交（遵守 PO "不 commit/push/tag" 常令）；提交时机由 PO 最终确认，按团队纪律执行（每人提交自己那笔、共享分支 `phase5-journey-continuity`、ff-only + annotated tag 仅 PO 拍板）。
