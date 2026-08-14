# OPEN-DECISIONS（悬而未决登记册）

> 铁律：只追加 + 就地关闭（OPEN → RESOLVED，补 Resolution 字段）。
> 每次 Phase 开始时，把未决项自动复现到工作上下文最前面，逐条判断能否关闭。
> 已关闭的项可升格为 ADR（架构决策记录）。
> 三类固定 slug：`waiting-on-external-condition` / `design-decision-to-evaluate` / `existing-design-boundary`。

## 当前汇总（2026-08-12 更新：OD-08/09/10 已于 2026-08-08 Wave2 闭环 RESOLVED，自汇总移除）

- **已决（Phase 1 裁决，PO 拍板）**：OD-02、Q-01、Q-03、R5、Q-04、Q-05、OD-06、OD-07 —— 共 8 项 RESOLVED（详见 ADR-0015）。
- **仍 OPEN**：OD-01、OD-03、OD-04、OD-05，及 Phase 0 残留 R2/R3/R4/R7/R8。（OD-08/09/10 已于 2026-08-08 Wave2 闭环 RESOLVED）
- **Phase 2 入口条件**：所有 Phase 1 阻塞项已全部裁决，可进入 Phase 2（Experience Architecture）。

## 登记册

| Date | Source | Open Item | Related Constraints | Current Leaning | Blocked By | Resolves When | Status | Resolution |
|------|--------|-----------|---------------------|-----------------|------------|---------------|--------|------------|
| 2026-08-07 | Phase 1 / C-07 | OD-02 Cognitive Mirror 层归属 | ADR-0013 D3「终点不是中间层」；五层模型未分配层 | L4.5 只读投影出口 | 无 | PO 裁决 | **RESOLVED** | 落 L4.5（Runtime 之上、Experience 之下）只读投影出口；读 Trail/Memory 投影，不向上游供数；遵守 D3。Phase 2 只做出口，不碰上游。 |
| 2026-08-07 | Phase 1 / C-01,C-02 | Q-01 Next Node 决定权 | M88.0 §6/§8；Constitution:120；PRD:28；Product_DNA | 丙·分层共存（M88.0 优先但保留实现） | 无 | PO 裁决 | **RESOLVED** | 取丙：`recommend_next` 降级为内部候选生成器（不对外、不叫 recommendation），上层加 ExplorationPolicy 做认知缺口(coverage/missing)筛选，对外只暴露 `ExplorationAction`。不修订上位文档、不动 15 测试。 |
| 2026-08-07 | Phase 1 / C-01 | Q-03 `/entity/{id}/recommendations` 端点处置 | 随 Q-01 决议；15 测试冻结 | 内部化+下线公开 | 无 | PO 裁决 | **RESOLVED** | 随 Q-01 丙：下线公开 REST 端点，内部化为候选生成器（去 recommendation 命名），保留算法但仅服务 ExplorationPolicy。 |
| 2026-08-07 | Phase 1 / P1-07,R5 | R5 跨文明对比提级 | C14 最强需求零供给（供需倒挂） | 提为 P0 | 无 | PO 裁决 | **RESOLVED** | Cross-civilization Comparison 提为 P0，作为 Phase 2 首批真实能力建设项，直接服务 Article 0 第三句「逼近真相」。 |
| 2026-08-07 | Phase 0 / Article 0 | OD-01 北极星是否增补兴趣/方法/真相度量 | understandingGrowthScore 公式 | 待 Phase 2 度量设计 | Phase 2 度量设计 | Phase 2 度量方案确定 | OPEN | — |
| 2026-08-07 | Phase 0 / P09 | OD-03 P09 前台形态 | Article 0 真值层 | 待 Phase 2 设计 | Phase 2 设计 | Phase 2 体验架构定稿 | OPEN | — |
| 2026-08-07 | Phase 0 | OD-04 PROJECT_CONTEXT/Product_DNA/PRD 旧定位同步 | 与 Article 0 / ADR-0013 对齐 | 同步修订旧文档 | 起草人窗口 | 文档同步 PR 合并 | OPEN | — |
| 2026-08-07 | Phase 0 / ADR-0013 D5 | OD-05 跨学科学原子化粒度与贯通关系模型 | 未来愿景，不阻塞本期 | 独立架构研究 | 无（未来） | 未来里程碑立项 | OPEN | — |
| 2026-08-07 | Phase 1 / C-04 | Q-04 Explanation 权威来源 | 三源并存无仲裁（模板短语/AI Gateway/Causal） | 分层仲裁+优先级 | 无 | PO 裁决 | **RESOLVED** | 分层仲裁：L1 事实语言化（connections_explained）作轻量预览；L2 权威解释走 Causal/AI Gateway；优先级 AI>Causal>模板，定义每源可见范围。短期对外实际仅模板可用，但明确其「事实语言化」身份、不配「解释」标签。 |
| 2026-08-07 | Phase 1 / C-11 | Q-05 Package 归属 | package_context 死参数；data 进前端 bundle | 承认纯前端能力 | 无 | PO 裁决 | **RESOLVED** | 承认 Package 为纯前端能力（data 进 bundle，后端无消费）；Phase 2 按纯前端实现，清理 package_context 死参数与后端空管道；未来个性化需求再评估后端化。 |
| 2026-08-15 | Phase 5 / 站间衔接 | OD-11 包数据站间过渡补全 | 三层衔接策略 UI 已落地（commit 6c2826a）：有中文 claim 讲叙述、有边无 claim 讲关系短句、无边留白；但 10 包扫描全部存在相邻站无直接边断裂点（3~12 个），且中国包 10 段衔接仅 5 段有中文 claim、其他包 claim 为英文；图 grounded 红线禁止编造过渡 | 数据策展专项：为无 claim/无边段补写中文站间过渡句（产品内容资产，与 title/goals 同级，须人工核对历史事实） | 策展人排期（人工核对历史事实） | 专项立项排期 | OPEN | — |
| 2026-08-07 | Phase 1 / C18 | OD-06 持久化策略（Memory 无持久化） | C18 无持久化；continuityScore 不可达 | Phase 2 暂不做，列 v2 | 无 | PO 裁决 | **RESOLVED** | Phase 2 不做持久化，Memory/Trail 作前端会话态；持久化列 v2 里程碑，与 OD-02 Mirror 出口解耦。 |
| 2026-08-07 | Phase 1 / P09 | OD-07 异议叙述范围 | Evidence/Source 无用户出口；P09 承诺异议叙述 | 补用户出口+异议叙述 | 无 | PO 裁决 | **RESOLVED** | Phase 2 给 Evidence/Source 补用户出口：证据强度分级 + 来源分级 + 异议叙述，服务 P09 与 Article 0 第三句。 |
| 2026-08-07 | Phase 0 | R2/R3/R4/R7/R8 残留未决项 | Phase 0 推荐项 R2–R8 中除 R1/R6 外未关闭者 | 待单独复核 | 主持复核 | 单独复核完成 | OPEN | 详见 `docs/FRW-Phase0-ProductDiscovery-v2-2026-08-07.md` 第十节，需后续单独排期裁决。 |
| 2026-08-07 | Phase 5 / M60 | OD-08 DiscoverPage 4 个陈旧测试（ProductIntro 已迁出） | ProductIntro 现由 App.tsx L1340 渲染（`productIntro={!current ? <ProductIntro /> : null}`）；DiscoverPage.test 仍断言 'History Explorer'/'历史叙事'/'关系探索'/'深度研究' 出现在 `<DiscoverPage>` 内 | 维持现状，测试列陈旧待清理（PO 选 A） | 无（不阻塞） | PO 拍板：恢复 DiscoverPage 内 ProductIntro 渲染（B）或同步删改测试 | **RESOLVED** | 4 项：renders entity type exploration cards / renders product introduction section / showcases all four capabilities / records open_discover event。M60 期间确认系与类型债无关的存量失败（基线 159b652 同败）。**2026-08-08 核验：Wave2-#140 已更新断言（`not.toContain('History Explorer 能做什么')`），DiscoverPage.test 18 测试全过，ProductIntro 覆盖迁移至 ProductIntro.test.tsx——实际已闭环，仅登记未更新。** |
| 2026-08-07 | Phase 5 / P5-S2 Batch4 | OD-09 Mirror 主干无独立面板组件（TP-19/22） | FRW 四主干之一 Mirror（C19 成长刻度 / C22 L4.5 只读投影）需专门面板：lock+accent-soft 浅底、**无出边**（X-R5，与 TP-16 绝对视觉隔离）；当前无专门 UI 组件，MemoryProjection 纯逻辑 | 挂账，属**功能缺口**（非视觉合规，新建组件超出 P5-S2 范围） | 无（不阻塞） | 独立能力建设立项（FRW P0 重评） | **RESOLVED** | VS-03 TP-19/22 视觉契约已定义（lock 图标+只读角标+paper-100 底+无 Dock 操作）；UnderstandingStatus「记忆图」块是部分落点；新建 Mirror 面板组件须走能力建设流程。**2026-08-08 Wave2-#145 闭环：新建 MirrorPanel（TP-19/22 只读投影，lock+只读角标+无出边），createMemoryProjection 首个消费者，7 测试全绿。** |
| 2026-08-07 | Phase 5 / P5-S2 Batch5 | OD-10 隐性底层触点无专门载体（TP-17 关系图例 / TP-21 过滤反馈 / TP-09 解释权威标注） | VS-03 契约已定义（TP-17=ink-500 文字+truth-line 色样列出 18 关系类型 / TP-21=accent-soft 激活项+结果计数 / TP-09=truth-* 徽标标权威顺序 AI>Casual>模板）；当前产品无对应 UI 组件 | 挂账，属能力缺口（隐性底层，用户无感知） | 无（不阻塞） | 随相关能力建设 | **RESOLVED** | TP-30 成长度量随 OD-09（Mirror 面板内）；TP-29 骨架已补齐（e77da56 之后）。**2026-08-08 Wave2-#146 闭环：TP-17 关系图例（20 类型全列出）+ TP-21 过滤计数/激活态 + TP-09 权威徽标（truth-strong/moderate/weak），3 新测试全绿。** |
