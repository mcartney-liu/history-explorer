# ADR-0015: Phase 1 能力验证裁决（Next Node 治理 / Mirror 落层 / 对比提级）

## Status: Accepted (2026-08-07, PO 翔哥拍板)

## Background

FRW Phase 1（Capability Validation）产出 8 份交付物 + 集成文档，交叉校验揭示若干契约级冲突与缺口。其中 4 项直接阻塞 Phase 2 启动（FRW 铁律：未裁决不得进）：

- **红线冲突 C-01/C-02**：后端 `recommend_next()` 以公开端点 `GET /entity/{id}/recommendations` 提供图相似度推荐，被 15 测试冻结，却违反 M88.0 §8.3「认知缺口驱动 + Decision<ExplorationAction> + RuleTrace」；同时上位文档（Constitution:120 / PRD:28 / DNA）明令「AI 建议 Next Node」，与 M88.0「Exploration ≠ Recommendation」直接对撞——契约层自相矛盾，写代码解决不了。
- **C-07/OD-02**：Cognitive Mirror 是已命名能力、却未分配层、且被 ADR-0013 D3 规定「终点不是中间层」，三方互斥，依赖图无法闭合。
- **R5**：跨文明对比（C14）用户需求最强、实现供给为零（供需倒挂最严重），优先级需重定。

## Decision

### D1 — Next Node 决定权与端点处置（取丙·分层共存）
- `recommend_next()` **降级为内部候选生成器**：不对外暴露、不称 recommendation，下线 `GET /entity/{id}/recommendations` 公开端点。
- 上层新增 **ExplorationPolicy**，以认知缺口（`coverageRatio` / `missingDimensions` / `missingConnections`）做筛选，对外只暴露 `ExplorationAction`。
- 不修订上位文档（Constitution/PRD/DNA），不删 15 个测试；保留算法内核，仅改命名与暴露方式。
- 对应 Q-01=丙、Q-03=内部化下线。

### D2 — Cognitive Mirror 落 L4.5 只读投影出口（OD-02 关闭）
- Mirror 置于 **Runtime(L4) 之上、Experience(L5) 之下** 的 L4.5 层，作为**只读投影出口**。
- 严格遵守 ADR-0013 D3「Mirror 是终点不是中间层」：只读 Trail/Memory 投影，不向上游任何能力供数。
- Phase 2 只实现 Mirror 出口（反射用户自身轨迹），不要求 Memory/Trail 后端先持久化。

### D3 — Cross-civilization Comparison 提为 P0（R5 关闭）
- C14 从原优先级提为 **P0**，列入 Phase 2 首批真实能力建设项。
- 直接服务 Article 0 第三句「帮助用户无限逼近真相」。

## Consequences

### 正面
- 红线冲突 C-01/C-02 在契约层获得一致解，Phase 2 前端重构不再把矛盾固化进 UI。
- 依赖图（P1-04）可闭合：Mirror 有确定层位（L4.5 叶子出口）。
- 最强用户需求（对比）进入 P0 队列，产品向 Article 0 第三句收敛。

### 负面 / 待办
- D1 要求**新建 ExplorationPolicy 层**（M88.1 计划此前零落地）——Phase 2 须先补 Policy 规则与 `ExplorationAction` 输出契约，否则 `recommend_next` 降级后「下一步」将暂时无对外出口。
- D1 的端点下线需配套前端调用点收敛（P1-05 §6 硬约束 1 仍有效：在裁决落地前不得为旧端点设计新呈现）。
- D2 的 L4.5 出口依赖 Trail/Memory 有可投影数据；当前后端为零，Phase 2 需先在前端会话态打通投影链路（详见 OD-06 裁决）。

## Addendum — Round 2 裁决（2026-08-07, PO 拍板）

### D4 — Explanation 权威来源（Q-04 关闭）
- 分层仲裁：L1 事实语言化（`connections_explained` 模板短语）作为轻量预览；L2 权威解释走 Causal / AI Gateway。
- 优先级：**AI Gateway > Causal > 模板短语**，并定义每源可见范围。
- 短期因 AI 默认关闭、Causal 零读者，对外实际仅模板可用；但明确其「事实语言化」身份，不配「解释」标签、不配置信度（呼应 P1-05 §6 硬约束 4）。

### D5 — Package 归属（Q-05 关闭）
- 承认 Package 为**纯前端能力**（data 进前端 bundle，后端 `package_context` 为死参数）。
- Phase 2 按纯前端实现，并清理后端空管道（`package_context` 参数链）。未来若有个性化需求再评估后端化。

### D6 — 持久化策略（OD-06 关闭）
- Phase 2 **不做持久化**：Memory / Trail 作为前端会话态。
- 持久化列入 v2 里程碑，与 OD-02 Mirror 出口解耦（Mirror 只读投影不要求后端持久化）。

### D7 — 异议叙述范围（OD-07 关闭）
- Phase 2 给 Evidence / Source 补**用户出口**：证据强度分级 + 来源分级 + 异议叙述。
- 直接服务 P09 与 Article 0 第三句「帮助用户无限逼近真相」，属低成本高价值项。

## Related ADRs
- ADR-0013（产品终极定位，D3 Mirror 防火墙）— D2 的上位约束。
- ADR-0012（FRW 冻结 v1.1）— 六阶段门禁，本裁决解锁 Phase 2 入口条件之一。
- ADR-0014（R1/R6 裁决）— 同属 Phase 0/1 裁决链。
- M88.0（Exploration Intelligence Boundary）— D1 的引用基线；本次未修订，仅通过分层共存绕过 §6/§8 的公开端点冲突。
