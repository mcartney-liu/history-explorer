# M6 / M7 / M8 Historical Documentation Gap Note

> 文档状态：GAP NOTE（诚实声明，不伪造）。
> 关联：M9-DOC-001 Documentation Recovery & SSOT Alignment。
> 日期：2026-07-22。

---

## 1. Purpose

本文件**仅声明缺口**，不重构、不伪造 M6 / M7 / M8 的实现细节。其目的是在 GitHub 作为"代码 + 项目知识 SSOT"的治理目标下，明确记录哪些里程碑**缺乏 on-disk 设计规范 / 实施报告**，避免后续读者误以为这些文档存在或内容可信。

## 2. Confirmed Gap (via `git ls-files`)

通过 `git ls-files | grep -iE "M6|M7|M8"` 权威确认：

- **M6**（Temporal Understanding Layer, v0.7.0）：仓库内**无** `docs/20_MILESTONES/M6*` 设计规范 / 实施报告。
- **M7**（Temporal Comparison Layer, v0.8.0）：仓库内**无** `docs/20_MILESTONES/M7*` 设计规范 / 实施报告。
- **M8**（Multi-Entity Temporal Visualization, v0.9.0）：仓库内**无** `docs/20_MILESTONES/M8*` 设计规范 / 实施报告。

> 仅有 `CHANGELOG.md` 中对应的 `[0.7.0]` / `[0.8.0]` / `[0.9.0]` 条目记录了高层变更摘要（Added/Changed/Freeze Compliance），但**无**对应的里程碑设计规范（DESIGN）与实施报告（Implementation Report）落盘文档。

## 3. What IS Available (real, do not duplicate)

- `CHANGELOG.md` `[0.7.0]` / `[0.8.0]` / `[0.9.0]` —— 高层变更摘要（可信，来自真实发布）。
- `README.md` "Completed (M3 – M8.6)" 段落 —— 里程碑概览（可信）。
- `PROJECT_ROADMAP.md` "Completed Milestones" —— M6/M7/M8 一行描述（可信）。
- 真实代码（`frontend/src/**` 对应 temporal 组件）与 git tags `v0.7.0` / `v0.8.0` / `v0.9.0`（可信，为事实真相）。

## 4. Why Not Fabricated

M9-DOC-001 的硬性约束：**所有恢复文档必须依据真实代码 / 测试 / release，不得杜撰**。M6/M7/M8 的实现细节仅散落于聊天记录与 CHANGELOG 摘要，**不足以**在不虚构的前提下重建逐字对齐的设计规范与实施报告。因此本文件选择**只声明缺口**，而非编造。

## 5. Recommendation (for PO decision)

若 PO 希望补齐 M6/M7/M8 的设计/实施文档，建议路径（需单独立项，不在 M9-DOC-001 范围内）：
- **Option A（推荐）**：仅从真实代码 + CHANGELOG + tags **反向整理（reconstructed）** 高层摘要文档（类似 M9-003 四文档的 recovered 模式），明确标注 provenance，不向前预测。
- **Option B**：维持现状，仅保留本 Gap Note + CHANGELOG 摘要，接受 M6/M7/M8 为"代码即文档"的里程碑。

> 任一选择均须 PO（翔哥）拍板；不自行决定。

---

*Gap Note documented: 2026-07-22. Status: GAP NOTE. Declares (does not fabricate) the M6/M7/M8 on-disk documentation gap. Part of M9-DOC-001 honest SSOT alignment.*
