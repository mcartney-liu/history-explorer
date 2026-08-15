# History Explorer - Product DNA

Version: 1.2 (定位章节按 Article 0 / ADR-0013 同步，2026-08-15)
Status: Active


# 1. Product Essence

History Explorer is not a database of historical facts.

It is a **cognitive-structure exploration system**（帮助人类形成认知结构的探索系统，Article 0）:
an engine that helps users form understanding, discover their own interests and ways of
learning, and get closer to the truth — with history as the current carrier.

The core value is not only providing answers, but enabling **the user to leave smarter
than they came in**（进来好奇，离开更聪明）.

三层缺一不可：
- 对象层：用户脑中长出认知结构（不仅"知道得更多"）。
- 主体层：用户认识自己的兴趣与学习方法（知道自己怎么知道）。
- 真值层：长出来的理解可溯源、可逼近真相（可信度）。


# 2. Core Experience

The fundamental user experience is:

Explore -> Connect -> Understand -> Discover

And every step serves the three Article 0 layers:

- Start from one historical node.
- Discover related people, civilizations, locations, and time periods.
- Understand causes and consequences — **with evidence strength, source tiers, and
  dissenting narratives visible（P09 真相可逼近性）**.
- Continue exploring naturally — **and, via Cognitive Mirror, see your own exploration
  trajectory reflected back: what you keep returning to (interests) and how you tend to
  proceed (methods)**.


# 3. User Mental Model

Users should think:

"Let me explore history — and understand how I explore."

Not:

"Let me search for a fact."

The product encourages curiosity-driven exploration, and **reflects the user's own
curiosity back to them（主体层）**.


# 4. Core Product Principles


## 4.1 Cognitive Structure First（认知结构优先）

All features ultimately serve one question: **did the user's mind grow a transferable
cognitive structure?** Content consumption is a means, never the end.

## 4.2 Cognitive Mirror（认知镜像，主体层）

The system structures the user's own exploration trajectory and reflects it back for
the user to interpret — it does **not** feed content based on that trajectory.

| 维度 | Cognitive Mirror（采纳） | Recommendation（禁止） |
|------|------------------------|----------------------|
| 主体 | 用户自己看见自己 | 系统替用户决定 |
| 数据流向 | 轨迹 → 结构化 → 呈现给用户 | 轨迹 → 模型 → 内容投喂 |
| 兴趣定义 | 用户反复回到的维度 | 系统预测的偏好 |
| 方法定义 | 用户惯用的推进路径 | 系统优化的转化路径 |
| 目标函数 | 用户的自我认识 | 停留时长 / 点击率 |

**防火墙**：Cognitive Mirror 的输出**不得**作为 ExplorationPolicy 的输入参与下一步
权重计算（镜像是终点，不是中间层）。

## 4.3 Truth Approachability（真相可逼近性，真值层）

用户在任一结论处，都能看见该结论的证据强度、来源分级与存在的异议叙述，并能感知
「我离真相更近了」。姿态是进取性的：带你逼近真相，而非防御性的"不承诺答案"。

## 4.4 Graph-first (presentation principle)

Relationships are the primary lens. Any page or feature prioritizes relationship display:

- Relationship lists before prose.
- Related nodes are clickable.
- Timeline events jump between connections.

This is a *presentation* priority, not a ranking of element value (see Section 4.6).


## 4.5 Infinite Exploration (soul)

Infinite exploration is the product's soul.

There is no "reading finished" - only continuous clicking. At any Entity page the user always sees:

- 2-3 Next Node recommendations.
- A clickable relationship list.
- Related timeline events.
- Marked map locations.


## 4.6 Four-Element Synergy (equal dimensions)

Graph, Timeline, Map, and AI are co-equal dimensions that together serve the Exploration Experience:

- **Graph = Relationship Structure**
- **Timeline = Time Dimension**
- **Map = Spatial Dimension**
- **AI = Interpretation & Guidance Layer**

There is no value hierarchy among them; all exist to make exploration deeper and more meaningful —
and, ultimately, to serve the three Article 0 layers.

## 4.7 AI As Guide, not Decider

AI acts as a historical exploration guide. AI should:

- Explain.
- Connect.
- Provide context.
- Suggest exploration paths (Next Node).

AI should not replace the graph structure, historical evidence, or critical thinking —
and **must not decide the exploration direction**（AI 决策红线：ADR-0003 默认关 / M88.0
Exploration ≠ Recommendation）.


# 5. Differentiation

History Explorer is different from traditional history products because it combines:

- Relationship structure.
- AI interpretation (guidance layer, non-deciding).
- Timeline exploration.
- Spatial exploration.
- **Cognitive Mirror（反射用户自己的探索轨迹，而非推荐内容）**.
- **Truth approachability（证据分级前台化，带你逼近真相）**.

Into one interactive discovery experience that makes the user leave smarter.


# 6. User Experience Principles

The product should:

- Encourage curiosity.
- Reduce cognitive barriers.
- Make complex history understandable.
- Create moments of discovery.
- **Reflect the user's own interests and learning methods back to them（主体层）**.
- **Make the reliability of every conclusion visible（真值层）**.


# 7. Non-Negotiable Product Values

The following values must always be preserved:

1. Exploration over searching.
2. Connections over isolated information.
3. Understanding over memorization.
4. Discovery over passive reading.
5. Long-term value over short-term features.
6. **Cognitive structure over content consumption（对象层）**.
7. **User's self-knowledge over system prediction（主体层 / Cognitive Mirror 防火墙）**.
8. **Truth over convenience（真值层：绝不编造、可溯源、异议可见）**.


# 8. Product Evolution Direction

Future development should continuously improve:

- Exploration depth.
- Knowledge connections.
- Historical understanding.
- User discovery experience.
- **User's self-understanding（兴趣与学习方法）**.
- **Truth approachability（离真相更近的可感知刻度）**.

Without violating Section 4.

> 依据：`docs/15_DECISIONS/ADR-0013_product_ultimate_positioning.md`（Article 0，最高位；冲突以 Article 0 为准）
