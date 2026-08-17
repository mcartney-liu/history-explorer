# ADR-0028 — P1 (Temporal Core) STOP Report for PO (翔哥)

> 生成时间：2026-08-17 | 状态：**P1 代码+单测完成，两处 STOP 级阻断待 PO 拍板**
> 本回合所有事实均经**重新核验**（非沿用历史摘要），涉及不可验证处已显式标注。

---

## 0. TL;DR

P1 的 `temporal_gate.py` + `test_temporal_gate.py` 已落盘，**153 单测全过（刚重跑确认）**，且为纯函数、无接线、无 config/IO 依赖。

但继续推进 P2/P3/P4 前被两处 **STOP 级**事项卡住，须你拍板：

- **STOP-A（硬阻断）**：`node scripts/freeze-check.mjs` → **FAILED，2 个 D-class SCOPE 违规**。两个新文件不在 `SCOPE_ALLOWLIST`，加入白名单 = 改 freeze guard = 9-STOP 之一"改 denylist" → 须走 Freeze Revision Gate。
- **STOP-B / D1（语义决策）**：`disputes`/`reinterprets`（ADR-0019 批准的 20 型，但**不在** Contract §3 的 18 型 temporal taxonomy 内）到达 gate 边界时如何处理。

另：**3 个预存测试失败**（与 P1 无关）一并报备。

---

## 1. P1 完成度 — 已重新核验

| 项 | 结果 | 证据 |
|---|---|---|
| 目标文件存在 | ✅ | `backend/app/ai_gateway/temporal_gate.py` (18.9KB, 未跟踪)、`backend/tests/test_temporal_gate.py` (27KB, 未跟踪) |
| 单测 | ✅ **153 passed** | 刚用 `Python312 -m pytest tests/test_temporal_gate.py -q` 重跑确认 |
| 纯函数 / 不接线 | ✅ | L4 `test_gate_is_not_wired_into_any_runtime_module`（rglob 全仓无 import）、`test_gate_imports_no_configuration`、`test_gate_has_no_io_or_clock_dependency` |
| 严格实现 Contract §3 | ✅ | 三 precedence、18 型→4 类映射、两条独立 SOFT 路径、D1 `UnmappedRelationError`、D2 显式 `tol`（None→`MissingToleranceError`，绝不 0） |
| token 合规 | ✅ | freeze-check 仅报 SCOPE 违规，**无 TOKEN 违规**（文件位于 `ai_gateway/` 下走 `APPROVED_MODULE_TOKENS` 宽松集） |

git 现状：`phase5-journey-continuity` 分支，HEAD `403f722`；P1 二文件为 untracked（**未提交**，遵守"commit/push/tag 不执行"）。

---

## 2. STOP-A — freeze-check SCOPE 违规（硬阻断）

**重跑结果（刚刚）：**
```
[M3.5 Freeze Guard] FAILED — 2 D-class violation(s):
  - SCOPE: ... not allowed -> backend/app/ai_gateway/temporal_gate.py
  - SCOPE: ... not allowed -> backend/tests/test_temporal_gate.py
```

**机制核验（读 `scripts/freeze-check.mjs:1096-1114`）：**
- `checkScope` 仅放行 `SCOPE_ALLOWLIST` 中的**精确路径或目录前缀**。
- 位于 `backend/app/ai_gateway/` 下**只放宽 token 扫描**（`APPROVED_AI_MODULE`，line 1133），**不自动授予 SCOPE 许可**。
- `freeze-check.mjs:160-166` 注释明言：`backend/app/ai_gateway/*` 是 "Explicitly FORBIDDEN from the allowlist (require a new Freeze Revision Gate)"。

→ 把这两个文件加入 `SCOPE_ALLOWLIST` = 修改 freeze guard = 触发你 9-STOP 中的"改 denylist"纪律。**我未自行修改白名单。**

### ▶ PO 决策点 A：如何放行 STOP-A

- **选项 A（推荐）**：走 Freeze Revision Gate，在 `SCOPE_ALLOWLIST` 显式加两行精确路径：
  - `"backend/app/ai_gateway/temporal_gate.py"`
  - `"backend/tests/test_temporal_gate.py"`
  这是 additive、精确到文件、不碰 denylist 逻辑本身，是 P1 合法放行的标准动作，风险最低。
- **选项 B**：不新增文件，把 gate 塞进已 allowlist 的现有 `ai_gateway` 文件（如 `grounding_builder.py` 内部）。会破坏"纯函数独立模块 + L4 白盒测试"架构，损害可测性与单一职责，**不推荐**。

**我的建议：选 A**——最小、最合规、可审计。

---

## 3. STOP-B / D1 — 未映射关系的边界策略

**已核验的事实：**
- `validation.py:43-66` 定义 **20 型**关系：18 核心型（temporal_gate 映射到 4 类）+ `disputes`/`reinterprets`（ADR-0019，2026-08-08 PO 批准，Truth-layer P09 异议导航）。**这 2 型不在 Contract §3 的 18 型 temporal taxonomy 内。**
- `grounding_builder.py` 把 `nbr.get("relationship")` **原样透传**（line 256、278）。所以 P2 接线后，**若**实时图谱含 disputes/reinterprets 边，gate 会收到并触发 `UnmappedRelationError`（D1：防御性失败，不静默降级、不审计日志兜底）。
- D1 已单测（L2 classifier：disputes/reinterprets 必 raise，绝不静默转 SOFT_WEAK）。

**⚠️ 诚实修正（重要）**：历史摘要称"data/examples/ 有 11 条 disputes/reinterprets 真实边"。我重核查**无法从本 checkout 确认**：
- 规范数据路径是 `data/examples/`（`config.py:60` `default_data_dir = repo_root/"data"/"examples"`），但**本工作树该目录不存在**（仅 `data/*.db` + `feedback.jsonl`）。
- 实时 KG（`*_example.json`）经 `DATA_DIR` 环境变量在运行时外部加载，**未提交进本仓**。
- 故边数量在本 agent checkout 中**不可验证**。我不会把"11 条"当作事实复述。

**但决策本身与数量无关**：gate 必须在边界正确处理这两型。两种策略供你定：

### ▶ PO 决策点 B：D1 边界策略

- **选项 A（推荐）**：**在 grounding 层预过滤**。P2 接线时，调用 `temporal_gate.decide()` 前先判 `if rel_type in UNMAPPED = {"disputes","reinterprets"}`，将其路由到专属的异议导航路径（Article 0 Truth-layer P09），**绝不进 temporal gate**；gate 的 `raise` 保留为防御纵深（depth-in-defense）。→ 既保持 temporal taxonomy 纯净，又让 disputes/reinterprets 按 ADR-0019 意图成为一等公民（异议导航，而非"时间未知"）。
- **选项 B**：让 gate 直接 raise，在 grounding 层 catch，把未映射关系当作"时间中性 / 跳过（无决策）"。接线更简单，但把防御性异常混入主路径，且丢失 ADR-0019 的显式异议导航语义。

**我的建议：选 A**——贴合 ADR-0019 本意，gate 的 raise 退居纯防御，不污染主流程。

> 附：文档层张力（非阻断，待 PO 定夺）。`freeze-check.mjs:69-72` 已把 `EXPECTED_RELATIONSHIP_TYPES = 20`（与 ADR-0019 一致），但 `docs/M4-002_Architecture.md:14` 仍写 `RELATIONSHIP_TYPES=18`，未随 ADR-0019 更新。改 M4-002 = STOP 级（改冻结引用），须在 P2/P3 之外单独走流程。

---

## 4. 预存测试失败（与 P1 无关）— 报备

隔离确认（只跑这 3 个仍 fail，且 `temporal_gate` 不被任何模块 import → 与 P1 零关联）：

- `tests/test_evidence_claim.py::test_validate_evidence_claims_passes_for_curated_file`
- `tests/test_m82_p1_4_explain_path.py::test_path_candidate_causal_statements`
- `tests/test_m82_p1_8_final_validation.py::TestRuntimeIntegration::test_api_path_candidate_has_cs`
  （断言 `causal_statements` 字段缺失，疑似 ADR-0019 策展数据 / causal_statements 字段未对齐）

P1 的 153 测试全绿且隔离。**建议**：不因此阻塞 P1→P2；归入 P4 的 L6 回归闸或单独 triage，由你定。

---

## 5. 未经你拍板我绝不做的事

- ❌ 不修改 `SCOPE_ALLOWLIST`（STOP 级）
- ❌ 不推进 P2 / P3 / P4
- ❌ 不 commit / push / tag
- ❌ 不碰 denylist / Contract / M4-002 / validation.py / exploration_engine.py / G1

---

## 6. 建议的下一步（等你一句话）

1. **你批准 STOP-A（选项 A，Freeze Revision Gate）** → 我随即加那 2 行白名单（这 itself 就是你授权的 gate 动作）。
2. **你选 D1 策略（推荐 A）**。
3. 然后按锁定顺序 **P2 ∥ P3 → P4** 连续施工；全程不 commit/push/tag，直至你最终签字。

---
*本文件为工作产物（未提交），待 PO 决策后或随 P4 一并归档。*
