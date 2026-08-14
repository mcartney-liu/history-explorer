# master CI 红排查报告（2026-08-15 凌晨排查）

> 背景：master 从 vM13-2（df506e0）起 CI 持续红，历次发版（vM13-3~6）均红。
> 本报告区分**我引入的**与**仓库既有的**，既有项修复另排。

---

## 1. 我引入的（已修复 ✅）

| 项 | 根因 | 状态 |
|---|---|---|
| NextStepPanel.test "maps every cognitive-action type" | INFO_FOLDING 折叠（CollapsibleList visible={4}）把第 5 种动作（reflect/反思）折叠进「查看全部」，原断言 `toContain('反思')` 失败 | **已修**（commit f5bdf80，测试适配折叠规范：前 4 可见 + 反思折叠 + 「查看全部 5 条」出口） |

教训：改组件结构（ul→CollapsibleList div）后未跑单测，只跑了 tsc/freeze-check。**规则：动组件结构必须跑对应单测**。

## 2. 仓库既有的（非本次改动引入，修复另排）

| 项 | 根因 | 修复建议 |
|---|---|---|
| **Structure Gate (M62)** | `App.tsx` 缺 `data-tier="narrative"` / `"interpretation"` / `"supporting"` 三属性（M62 结构门要求分层标注） | 给 App.tsx 主渲染区补 data-tier 分层属性（涉及 M62 分层语义，需确认各 tier 归属） |
| **explorationPackages.test 2 failed** | silk_road 包**数据漂移**：timeline_slices 引用 `china_v1:tech-zaopi`（测试期望 `silk_road:tech-paper`）；`silk_road:loc-chang-an` 缺 labels.en/zh 双语 | 核对 data/exploration_packages.json + 实体标签数据，修数据（需核对历史事实） |
| **Backend pytest 2 failed** | M82 explain-path 的 path candidate 缺 `causal_statements` 字段（`test_m82_p1_4_explain_path` / `test_m82_p1_8_final_validation` 断言接口契约） | 后端 explain_path 返回补 `causal_statements`（M82 契约对齐） |
| **Release Consistency (advisory)** | advisory 级 | 不阻塞 |

## 3. 建议

- 我引入的已修（f5bdf80），按攒批原则随下次发版合入，届时 NextStepPanel 测试转绿。
- 既有三项属**仓库级健康债**：结构 Gate（App data-tier）、silk_road 数据、后端 M82 契约——每项单独排期修复（涉及架构语义/数据核对），建议纳入下次里程碑。
