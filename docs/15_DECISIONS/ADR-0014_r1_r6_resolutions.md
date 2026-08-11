# ADR-0014: Resolution of R1 and R6（Phase 0 阻塞项裁决）

- **Status**: Accepted / Frozen
- **Date**: 2026-08-07
- **Decider**: PO（翔哥）
- **Supersedes**: 无
- **Related**: ADR-0013（产品终极定位）、FRW Phase 0 v2（第十节待裁决清单 / Supplement B）、M89.1（体验阶段与禁项）、M81a（真人观察 N=4）、M88.0（Exploration ≠ Recommendation）

---

## 1. Background

FRW Phase 0 v2 待裁决清单中有两项阻塞 Phase 1 / Phase 2 的未决项 R1、R6，均需 PO 定调。2026-08-07 PO 裁定：「就按推荐来」，即采纳 v2 报告中给出的推荐项。

---

## 2. Decision（两项均采纳推荐项）

### D1. R1 裁决 — 契约 vs 代码落差，以「逐字段对照表」为 Phase 1 首个交付物

- **事实**：`frontend/src/next/` 已编码且接入 App.tsx，但游离 `scripts/freeze-check.mjs` 白名单、PROJECT_CONTEXT.md 未述。
- **Resolution**：Phase 1 Capability Validation 首个交付物 = **「契约 vs 实现」逐字段对照表**（架构师主导），三栏：
  1. 被 App.tsx 实际消费（契约中承诺 / 白名单应含 / 文档应述）
  2. 白名单缺口（`freeze-check.mjs` 未放行部分）
  3. 文档过时（PROJECT_CONTEXT / PRD / 架构基线未同步部分）
- **解除阻塞**：对照表产出即解除 R1 对 Phase 1 的阻塞。
- **后续动作**：对照表结论若要求修订白名单或补述文档，须走 Freeze Revision Gate（ADR + 架构评审 + PO 批准），不在 Phase 0/1 默认授权范围内。

### D2. R6 裁决 — 首屏入口冲突，采纳选项 A（坚持原则 + 强引导）

- **冲突**：M89.1 硬禁搜索框主导入口 vs M81a 四场用户全部第一动作找搜索框且全部失望。
- **Resolution（选项 A）**：
  1. 维持 **M89.1 硬禁搜索框主导首屏**——首屏不以搜索框为焦点/主导心智。
  2. 以**维度/主题探索入口**做「强引导」，把用户好奇翻译为第一次探索起跳（呼应 Phase 0 v2 Supplement B 七问②首页使命）。
  3. 搜索框可作**次级辅助能力**存在，但不得主导首屏。
- **与定位一致性**：Article 0 第二句要求用户「找到」自己的兴趣（系统照见），而搜索框预设「用户已知道自己要什么」——选项 A 在心智层不自相矛盾；选项 B（妥协允许搜索框主导）会直接架空第二句。
- **解除阻塞**：本裁决解除 R6 对 Phase 2 体验架构的阻塞；Phase 2 首页设计须以此为准。

---

## 3. Consequences

### 正面

- Phase 0 两项阻塞项清零，Phase 0 全 closure，可进入 Phase 1。
- R6 裁决与 Article 0 / M89.1 / M88.0 形成一致闭环，Phase 2 体验架构有确定基线。

### 负面 / 风险

- R1 对照表可能暴露更大白名单缺口，须准备 Freeze Revision Gate 流程应对。
- R6 选项 A 下，首页「强引导」的具体形态（维度入口如何呈现、搜索框置于何处）属 Phase 2 设计范畴，须在 Phase 2 明确，避免落到「换个样子仍是搜索框」。

### 影响范围

| 制品 | 处置 |
|------|------|
| `docs/FRW-Phase0-ProductDiscovery-v2-2026-08-07.md` | R1/R6 标记 Resolved + Resolution；新增 Supplement B（七问） |
| `docs/15_DECISIONS/ADR-0014_r1_r6_resolutions.md` | 本文件（新建） |
| 代码 / 冻结边界 / 8-18 枚举 | **零影响**（裁决为治理/设计基线，不触碰实现） |

---

## 4. Compliance（合规自检）

- 未修改任何代码文件
- 未触碰架构冻结边界（ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 / 内存 JSON / 无新依赖 / 排除清单不变）
- 未引入 emoji 功能图标 / 紫粉渐变 / 模板化文案
- 决策由 PO 于 2026-08-07 裁定（两项均采纳推荐项）
