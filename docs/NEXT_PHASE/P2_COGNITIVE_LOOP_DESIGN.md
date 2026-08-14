# P2 认知闭环设计（Cognitive Loop — the real next-phase product spine）

> 分支：`plan/next-phase`（基于 `30ccff6`）
> 战略定位：Article 0 ②③ 的真落地（找到学习方法 / 无限逼近真相）；盘点 §G/E 反复点名的「下一阶段最重要目标」与「总监最需裁决问题 #3」
> 本质：**不是造新东西，是把已有零件用「持久化 Gap 状态」串成环**
> 性质：设计文档，本轮不写码；施工前置 = P1 ⑤ + 打开 M89 入口

---

## 1. 闭环模型（7 态）

```
Understanding           理解现状（已知什么）
      ↓
Knowledge Gap           认知缺口（还差什么 / 没搞懂什么）
      ↓
Next Exploration        下一步探索（引擎给出的可探索方向）
      ↓
User Action             用户动作（做研究 / 收藏 / 笔记）
      ↓
New Knowledge           新认知（研究产出 + 证据）
      ↓
Understanding Update    理解更新（消费新认知，刷新理解）
      ↓
New Gap                 派生新缺口（从新认知中浮现的下一步疑问）
      ↓
   （回到 Knowledge Gap，闭环）
```

用户离场应能答：**「我更懂了什么？我还差什么？」** —— 这是 Article 0 可证伪判据「你觉得自己变聪明了吗」的具象化。

---

## 2. 引擎落点（关键定性）

**把 `ExplorationPolicy` 升级为「有状态的认知状态机」，而不是复活推荐面板。**

- 线上「下一步探索」**早已不是推荐组件**——它由 `ExplorationPolicy`（纯规则、非 AI）驱动。P2 是把它从「无状态规则」升级为「读取 Gap 状态、产出下一步」的有状态引擎。
- 表面出口**仍是 `NextStepPanel`**（不破 FRW P3 红线：下一步唯一出口）。
- **绝不**引入推荐语汇 / 推荐面板 / 推荐排序。

---

## 3. 各态 ↔ 现有零件映射

| 态 | 现有零件 | 现状 | P2 动作 |
|---|---|---|---|
| Understanding | `UnderstandingStatus` | 纯展示组件，无持久 gap | 复用为呈现层，消费 Gap |
| Knowledge Gap | （新增 `GapState`）| 不存在 | **新增**，持久化（见 §4）|
| Next Exploration | `ExplorationPolicy` | 无状态规则引擎 | 升级为读取 `GapState` 的有状态引擎 |
| User Action | `ResearchPanel` 三阶段（Explore/Verify/Synthesize）| 现有 | 接入 Gap：动作前记录目标 gap，动作后写回新认知 |
| New Knowledge | 研究产出 + `evidence_claims` | 现有 | 经 ADR-0018 sqlite 存档（匿名）|
| Understanding Update | `UnderstandingStatus` | 展示 | 订阅 New Knowledge，刷新 |
| New Gap | （规则派生）| 不存在 | 从 New Knowledge 规则派生下一缺口 |

---

## 4. 持久化 Gap 状态（底座 = ADR-0018 sqlite）

- **唯一合法持久化点**：ADR-0018 批准的 `sqlite3` 匿名研究存档（`/api/v1/research`），**禁** PG/Neo4j/ES。
- **匿名 / 设备本地**：认知账本不绑定身份（守 C8 Mirror 防火墙 / 身份红线）；是「认知结构探索系统」的领域数据，非用户画像。
- **存什么**：当前 `GapState`、理解快照版本、轨迹（可选）、New Knowledge 引用。
- **不碰**：Mirror 不被写入 Gap（Mirror 是终点，禁止回灌 Policy，见 §5）。

---

## 5. FRW Phase 3 红线（复述，施工硬约束）

- 下一步**唯一出口 = `ExplorationAction`（`NextStepPanel`）**
- **禁用「推荐」语汇**、禁用推荐面板、禁用推荐排序
- `Cognitive Mirror` 是终点，**禁止把 Mirror 喂回 `ExplorationPolicy` 当输入**（第七条禁止关系）
- `Relationship Layer = Visualization Only`：禁 edge 创建 / 推断 / 因果
- 引擎升级**只增不改**：现有行为不退化

---

## 6. M89 理解工作区入口（施工前置）

- 现状：`ModeCanvas` 的 `understanding` 分支因 `isDevCatalog` / `hasPackage` 恒 `null` **永不挂载**，用户进不去理解工作区。
- P2 要「可感知的成长轨迹」，须先让入口可达（修复挂载条件 / 提供默认进入路径）。
- 这是 P1 之外独立的「入口 bug」，需在 P2 施工第一步修。

---

## 7. 五个待 PO 拍板的决策（D1–D5）

| # | 决策点 | 选项（推荐置前）|
|---|---|---|
| D1 | Gap 粒度 | **实体级**（某实体没搞懂）/ 主题级 / 关系级 |
| D2 | 持久化范围 | **仅 Gap + 理解快照**（轻）/ Gap+全轨迹 / 全量 |
| D3 | 用户动作集 | **仅研究**（Explore/Verify/Synthesize）/ 含收藏 / 含笔记 |
| D4 | 表面呈现 | **复用 `UnderstandingStatus`**（低成本）/ 开 M89 工作区（重但更完整）|
| D5 | 文案避「推荐」 | 用「下一步」「可探索」「你可能想搞清楚」等，禁用「为你推荐」|

---

## 8. 验收想象（何时算 P2 做成）

1. 用户完成一次研究后，`UnderstandingStatus` 明显变化（「懂了 X」）。
2. `NextStepPanel` 给出的下一步与「刚产生的缺口」相关（非随机规则）。
3. 刷新后 Gap / 理解快照仍在（sqlite 持久化生效）。
4. 用户离场能口述「我更懂了什么、还差什么」。
5. 全程零「推荐」语汇，Mirror 不被用作 Policy 输入。

---

## 9. 实施前置（不可跳过）

- **P1 ⑤ 统一数据入口**：提供前端单一数据源，Gap 存档才有统一存取面。
- **打开 M89 入口**：用户进得去理解工作区，闭环才「可感知」。
- 二者完成后再动 P2 引擎，避免在地基未稳时搭闭环。

> 注：本设计不引入任何新依赖、不新建后端 API、不触碰红线禁项；工程量可控，主要工作在「串零件 + 加 Gap 状态 + 修入口」。
