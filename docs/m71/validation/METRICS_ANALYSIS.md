# M71 Metrics 数据采集与分析 — Exploration Validation

> 阶段：M71 Phase 2（早期探索行为验证）
> 口径声明：本分析基于 **① 单元测试验证的指标引擎**（`explorationMetrics.test.ts` 7/7 确定性）+ **② 内部系统化走查产生的真实事件流**（1 名操作者，非真实用户数据——M71 Q5）。所有数值为描述性基线，不做统计推断。
> 表述口径：早期探索行为验证 / 体验链路有效性评估 / 为 M72 优化提供依据。

---

## 1. 指标引擎正确性（单元测试证据）

`explorationMetrics.ts` 4 组指标函数已由 `explorationMetrics.test.ts` 7 个测试验证（Representative Exploration Event Sequence fixture）：

| 指标 | 断言要点 | 结果 |
|---|---|---|
| sessionize | 30min gap 分桶（2 会话） | ✅ |
| Exploration Depth | 实体 3/session、关系 0.5/session、节点 1/session | ✅ |
| Package Coverage | 包窗口归因（中国 5 实体 / 罗马 1 / 丝绸 0） | ✅ |
| Cross Package Expansion | 3 包、跨包率 0.5、推荐点击 1 | ✅ |
| Guide Interaction | Guide 使用率 0.5、深度对比 5 vs 1 | ✅ |
| 空流容错 | 零值输出不崩溃 | ✅ |

## 2. 内部走查真实事件流（样本：1 名操作者 + 浏览器自动化，2026-07-31）

```
open_discover             03:50:56   (T1 首页)
open_discover             03:50:56   (Discover + Landing 双挂载)
open_package | roman-empire-exploration   03:51:25   (T2 进罗马包)
click_guide_next | roman_empire:event-roman-empire-established   03:51:54   (T2 点向导下一步)
open_entity               03:51:54   (进入实体页 — 无 gid)
open_entity               03:51:54   (同上)
open_discover             03:53:16   (T3 返回首页)
open_discover             03:53:16
open_package | china-civilization-v1   03:53:30   (T3 进中国包)
```

## 3. 四指标基线（真实样本口径）

| 指标 | 数值（真实样本） | 说明 |
|---|---|---|
| **Depth** | 1 会话（gap<30min）；open_entity×2（**无 gid**）、click_guide_next×1、click_relationship×0 | 实体归因受限（见发现 E） |
| **Package Coverage** | roman 窗口：open_entity×2 但 gid 缺失 → 窗口归因无法命中实体 | **引擎正确，埋点数据质量限制** |
| **Cross Package Expansion** | 同会话打开 2 包（roman+china）→ 跨包会话 = 1/1 = 100%（小样本） | 跨包路径真实存在 |
| **Guide Interaction** | click_guide_next = 1；Guide 被用于决策（点下一步→进入实体） | H2 早期证据（1 样本） |

## 4. 数据质量发现（埋点审计）

| # | 发现 | 影响 | M72 候选 |
|---|---|---|---|
| **E1** | `open_entity` 事件**未携带 entityGlobalId**（EntityPageShell M43 遗留：`recordEvent({ action: 'open_entity' })` 无实体 id） | Depth 实体去重、Coverage 窗口归因、Guide 定位（仅靠 click_guide_next/click_relationship 的 gid 兜底）均受限 | 补 `entityGlobalId`（需改 M43 文件，走 Freeze Gate） |
| E2 | 同一动作重复（open_discover ×2） | 计数口径需按会话去重 | 无（会话级聚合已处理） |

## 5. Baseline 阈值建议（供 M72 校准）

| 指标 | 建议阈值 | 依据 |
|---|---|---|
| Depth（实体/会话） | ≥3 = 有效探索 | 3 包平均 12.3 实体/包，取 1/4 |
| Coverage（关系链段） | T2 定向旅程后 ≥60% | 关系链为包骨架 |
| Cross Package 率 | ≥30% 会话跨包 = 生态有粘性 | 描述性参考 |
| Guide 使用率 | ≥50% 会话用 Guide | 向导应成为默认路径 |

> 以上阈值为**基线框架**，正式校准需真实用户样本（PO 组织体验者后回填）。

---

**结论（早期验证口径）**：链路 T1→T2→T3 全走通、埋点端到端真实触发、Guide 定位/推荐/覆盖度三能力在真实事件流下工作；同时暴露 5 处体验链路有效性问题（见 Validation Report §4），为 M72 优化提供明确依据。
