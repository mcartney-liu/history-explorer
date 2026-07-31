# M71 Validation Report — Exploration 体验链路有效性评估

> 阶段：M71 Phase 2（早期探索行为验证）
> 基线：M71 Phase 1 CLOSED（feat-m71-validation，4 commits）；master=`16045ee` 未动
> 样本：**内部系统化走查**（1 名操作者 + 浏览器自动化，2026-07-31 03:50–03:53 UTC）——**非真实用户数据**（M71 Q5 口径）；外部体验者测试材料已就绪（`UX_TEST_MATERIALS.md`），待 PO 组织后补录
> 表述口径：早期探索行为验证 / 体验链路有效性评估 / 为 M72 优化提供依据

---

## 1. 早期假设验证（H1–H3，内部走查口径）

| 假设 | 判定 | 证据（走查记录） |
|---|---|---|
| **H1** 进入包后访问 ≥3 实体 | 🟡 **部分支持（链路可用）** | 走查中进入罗马包→经向导下一步钻入 1 实体即转场；包页 13 实体路径完整可达。单样本不足以判定，**链路可用性成立** |
| **H2** Guide「下一步+原因」被使用且帮助决策 | 🟢 **早期证据支持** | 走查中 `click_guide_next` 真实触发（点"End of the Roman Republic 导致 Roman Empire Established"→ 进入实体页）；**但原因文案为英文**（发现 A，理解障碍） |
| **H3** 走完包后经推荐进入关联内容 | 🟡 **部分支持（入口存在）** | 中国包「推荐下一步探索」区块在位（宋代理学/明代航海技术→）；**但跨包指针指向"规划中"包**（发现 D，无真实包目标） |

## 2. 走查执行记录（T1→T2→T3 全链路）

| 任务 | 结果 | 关键事实 |
|---|---|---|
| T1 自由探索 | ✅ 走通 | 6 主题卡片 + 官方包 3 卡片（带摘要+CTA）+「我的探索空间」占位均在位 |
| T2 定向旅程 | ✅ 走通 | 包页第一屏（标题/摘要/探索目标/开始探索）→ 向导（你现在在/下一步+原因/覆盖度）→ 时间旅程（早于链）→ 关系旅程（导致/参与/关联链）→ 来源链（证据+徽章） |
| T3 跨包迁移 | ✅ 走通 | 「← 返回探索」回首页 → 进中国包 → 推荐下一步（实体指针） |

## 3. 埋点端到端验证（真实事件流，9 事件）

```
open_discover → open_package(roman-empire-exploration) → click_guide_next(roman_empire:event-roman-empire-established) → open_entity ×2 → open_discover → open_package(china-civilization-v1)
```
✅ `open_package` 带 packageSlug；✅ `click_guide_next` 带 entityGlobalId；✅ Guide 位置随事件流实时更新（"你现在在 Roman Empire Established"）

## 4. 体验链路有效性发现（6 项，为 M72 提供依据）

| # | 发现 | 类型 | M72 建议 |
|---|---|---|---|
| A | **向导「下一步原因」为英文模板**（"Roman Republic preceded 27 BC in time."）——`RELATIONSHIP_TEMPLATES` 未随 locale 本地化，中文界面混排英文 | 理解障碍（H2 相关） | 本地化模板（前端 i18n 扩展，低风险） |
| B | **罗马/丝绸包实体名与描述为英文**（数据层现状；中国包为中文） | 理解障碍 | 数据内容本地化或双语展示（数据层，需评估） |
| C | **面包屑「Home」回到包页而非首页**（`packageSlug` state 未随 Home 清除） | 导航闭环瑕疵 | App.tsx 路由语义修正（低风险） |
| D | **recommended_next 跨包指针指向"规划中"包**（无真实包目标） | 跨包路径受限 | M72 内容库扩展（第 4 包）后回填真实指针 |
| E | **`open_entity` 埋点未携带 entityGlobalId**（M43 遗留）→ Depth 实体归因 / Coverage 窗口归因受限 | 指标精度（数据质量） | EntityPageShell 补 gid（改 M43 文件，走 Freeze Gate） |
| F | 「我的探索兴趣」文案暗示"画像"（与无画像红线张力，历史遗留） | 文案一致性 | 文案修正（低风险，不建画像） |

## 5. 四指标基线（详见 METRICS_ANALYSIS.md）

- **Depth**：1 会话，open_entity×2（gid 缺失）/ click_guide_next×1 —— 引擎正确（单测 7/7），真实样本受埋点数据质量限制
- **Coverage**：包窗口归因需 open_entity gid → 当前真实样本无法精确计算（发现 E）
- **Cross Package**：同会话 2 包 → 跨包路径真实存在
- **Guide**：click_guide_next=1，Guide 参与决策（H2 早期证据）

## 6. 局限性声明

1. 样本 = 内部走查（1 名操作者），**不构成用户行为统计结论**；外部体验者材料已就绪，待 PO 组织后补录
2. `view_source` / `complete_package` 未接入（PO 暂缓）→ 来源链行为与完成率无事件证据
3. 指标基线阈值为框架建议，正式校准需真实样本
4. 所有发现基于 5173 预览（HMR 生效的 feat-m71 分支代码）

## 7. 结论（早期验证口径）

**体验链路 T1→T2→T3 全走通、埋点端到端真实触发、Guide 三能力（定位/下一步/覆盖度）在真实事件流下工作**——早期探索行为验证成立；同时 6 项发现明确了体验链路有效性的改进方向，为 M72 提供依据（优先级：A 原因本地化 > E 埋点补 gid > C 导航语义 > D 内容库回填 > B 数据本地化 > F 文案）。
