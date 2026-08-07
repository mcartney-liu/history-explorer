# M88 — Exploration Intelligence Layer
### Strategic Direction Review
### 2026-08-06

> 模式声明：严格只读。冻结 M88 战略方向和边界约束。不写代码。

---

## 一、核心声明

> **M88 不是加 AI 功能。是用已成立的 Cognitive Runtime 去验证：用户在这个系统里探索，会比自己搜索历史资料获得更深、更连续、更有方向感的理解。**

---

## 二、M87→M88 的范式转换

```
M85-M87                              M88+
─────────────────────────────────    ─────────────────────────────────
证明系统可以运行                      证明用户愿意使用
建立 Cognitive Runtime               在 Runtime 上运行 Exploration
Architecture correctness              User value validation
四个 Domain Module 共存               五个 Domain 协同（+Exploration）
```

---

## 三、M88 不是

- ❌ 大规模 KG 建设
- ❌ 大规模 AI Agent
- ❌ 大规模推荐系统
- ❌ "猜你喜欢：罗马帝国"
- ❌ 新的 Runtime Kernel 修改

## M88 是

- ✅ 第五个 Domain Module：ExplorationPolicy
- ✅ 复用已有 Runtime（Decision<T> / Policy / Replay / Trace）
- ✅ 理解用户当前探索状态 → 生成认知推动建议
- ✅ 小闭环验证：一次 Session → 系统理解 → 建议 → 用户行动 → Memory Growth → 下一轮
- ✅ 验证 "用户愿意被认知伙伴引导探索"

---

## 四、M88 核心问题

> **已经有认知 Runtime 后，如何让用户感受到"这个系统真的懂我"？**

不是推荐内容，而是：

```
用户当前状态:
  Stage: UNDERSTANDING
  Coverage: 0.45
  Missing: 经济体系
  Relations: 军事✅ 政治✅

系统不是推荐:
  "中国历史"

而是:
  "你已经理解罗马军团如何扩张，但还缺少经济基础这一环。
   如果继续探索，可以看到为什么罗马道路不仅是军事设施，
   也是贸易网络。"
```

这是 Memory + Companion + Exploration 的真正结合。

---

## 五、M88 阶段规划

### M88.0 — Exploration Intelligence Boundary

冻结：
- Exploration Intelligence 不是新的 Runtime，是 Runtime 上的第五个 Domain Module
- 复用 Decision<T> / Policy / Replay / Trace / Persistence
- 输入：UnderstandingProjection + MemoryProjection + CompanionContext
- 输出：Decision<ExplorationAction>

### M88.1 — Exploration State Model

建立 `ExplorationState`：
```
currentUnderstanding    — 当前理解状态（来自 UnderstandingProjection）
growthGraph             — 认知成长图（来自 Memory）
activeQuestions         — 活跃的未解问题
missingConnections      — 缺失的因果连接
curiositySignals        — 好奇心信号（用户行为，非点击指标）
```

### M88.2 — ExplorationPolicy

类似 CompanionPolicy，输出 `Decision<ExplorationAction>`：
```typescript
{
  action: "deep_continue" | "bridge_gap" | "expand_horizon" | "reflect"
  target: "roman_trade_network"
  reason: "missing causal link"
  narrativeHook: "为什么罗马道路也是贸易网络？"
  confidence: 0.87
}
```

### M88.3 — Exploration Experience

把 Decision 变成用户可感知的引导体验：
```
System Decision → ExplorationGuidance → User Action → Memory Growth → 下一轮
```

---

## 六、小闭环优先原则

M88 第一阶段不做大系统。先验证最小闭环：

```
1. 用户进入一次探索 Session
2. 系统理解当前探索状态（ExplorationState）
3. 生成一个探索建议（ExplorationAction）
4. 用户点击继续探索
5. Memory 记录成长（GrowthGraph append）
6. 下一轮建议变化（基于新状态）
```

验证目标：
> **用户在这个系统里探索，会比自己搜索历史资料获得更深、更连续、更有方向感的理解。**

---

## 七、边界约束

| 允许 | 禁止 |
|------|------|
| 基于 ExplorationState 生成建议 | 基于点击率/时长生成推荐 |
| 复用 Runtime Decision<T> | 修改 Runtime Kernel |
| Exploration 作为第五个 Domain | 新的独立推荐系统 |
| 小闭环验证 | 大规模 KG/AI Agent |

---

## 八、当前架构状态

```
M85   Experience Translation           ✅
M86   Cognitive Runtime Foundation     ✅
M87   AI Companion + Explanation       ✅ CLOSED
─────────────────────────────────────────────
      Cognitive Runtime Established
─────────────────────────────────────────────
M88   Exploration Intelligence          ⬜
```

---

## 九、关键风险

- **最大风险**：M88 滑回"推荐算法"模式（猜你喜欢）
- **缓解**：严格约束 ExplorationPolicy 输出 Decision<T>，RuleTrace 可审计
- **第二大风险**：M88 做太大，失去小闭环验证机会
- **缓解**：M88.0-M88.1 只做一个 Exploration Loop 的端到端验证

---

## 十、后续

```
当前：M88 战略方向冻结（本文件）
下一步：M88.0 Exploration Intelligence Boundary（进入前需 Founder 确认方向）
```
