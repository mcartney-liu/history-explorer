# Curator Relationship Candidates

> **文档类型**：研究记录（非 runtime 数据，非代码）
> **用途**：M85 Entry Evidence（E4/E5）
> **阶段**：M84.5 Evidence Collection
> **日期**：2026-08-05

---

## Candidate #001

| 维度 | 内容 |
| --- | --- |
| **Object A** | co-004：秦制 → 三省六部 |
| **Object B** | co-001：科举 → 文官体系 |
| **表面关系** | 制度演化连续性 — 秦制建立了中央集权的制度框架，科举在数百年后成为该框架下选拔治理人才的核心机制 |
| **分类** | **Semantic Candidate** |
| **KG?** | 否。秦制（china_v1:idea-qinzhi）与科举（china_v1:idea-keju）在 KG 中无直接 Relationship。两者是不同时代的制度，KG 只记录各自的实体关系 |
| **Navigation?** | 否。这不是「你可能还想了解」式的对比推荐，而是 curator 认为理解秦制有助于理解科举为什么出现在中国而非其他地方 |
| **Confidence** | Medium |

**为什么是 Semantic？**

秦制和科举的关系不是 KG 层的事实连接（它们之间没有直接因果关系——秦朝没有科举，科举是隋唐的产物）。但 curator 认为：理解秦制建立的中央集权框架，是理解科举制度为什么在中国成为可能的前提。这种理解关联 KG 不包含，属于 Semantic Layer。

---

## Candidate #002

| 维度 | 内容 |
| --- | --- |
| **Object A** | co-008：印刷术 → 知识传播 |
| **Object B** | co-011：造纸术 → 知识传播 |
| **表面关系** | 技术互补链 — 造纸术降低书写材料成本，印刷术降低复制成本，两者共同推动知识传播 |
| **分类** | **KG Candidate**（不是 Semantic） |
| **KG?** | 是。造纸术（china_v1:tech-zaopi）和印刷术（china_v1:idea-yinshuashu）的 effect 都指向知识传播（china_v1:idea-zhishichuanbo）。KG 已经包含了这种事实关联 |
| **Navigation?** | 可以用于导航（「造纸术之后，印刷术如何进一步改变了知识传播？」），但基础是 KG 事实 |
| **Confidence** | High |

**为什么不是 Semantic？**

两个 CausalObject 的 effect 指向同一个 KG Entity（知识传播）。这种关联 KG 已经提供了——Explorer 可以通过 exploration_paths 从 co-008 导航到 co-011 而不需要 Semantic Layer 的额外关系。在 Semantic Layer 重复 KG 已有关系是 M85 要避免的错误。

---

## Candidate #003

| 维度 | 内容 |
| --- | --- |
| **Object A** | co-004：秦制 → 三省六部 |
| **Object B** | co-010：三省六部 → 内阁 |
| **表面关系** | 制度演化链 — 秦制→三省六部→内阁，一条连续的官僚制度演化路径 |
| **分类** | **KG Candidate**（不是 Semantic） |
| **KG?** | 是。秦制（china_v1:idea-qinzhi）→ 三省六部（china_v1:idea-sanxing-liubu）和 三省六部 → 内阁（china_v1:idea-neige）在 KG 中分别存在因果关系。这本质上是 KG 的事实链 |
| **Navigation?** | 可以用于导航（「秦制之后，三省六部如何演化为内阁？」） |
| **Confidence** | High |

**为什么不是 Semantic？**

这是典型的 KG 层关系——两个 CausalObject 的 cause/effect Entity 在 KG 中已有直接或间接的连接。Explorer 可以通过现有的 exploration_paths 和 KG traversal 自然发现这条路径。不需要 Semantic Layer 额外建立 `related_causal_objects`。

---

## Candidate #004

| 维度 | 内容 |
| --- | --- |
| **Object A** | co-009：罗马法 → 拜占庭（法律体系） |
| **Object B** | co-004：秦制 → 三省六部（官僚制度） |
| **表面关系** | 文明对比 — 罗马法和秦制分别是西方和东方制度文明的两个源头，它们独立发展出法律治理和官僚治理两种不同的制度路径 |
| **分类** | **Semantic Candidate** |
| **KG?** | 否。罗马法（roman_empire:civ-roman）和秦制（china_v1:idea-qinzhi）在 KG 中无任何连接。它们是两个独立文明体系的产物 |
| **Navigation?** | 可能（「你可能还想了解：罗马法体系 vs 中国官僚制度」），但核心不是推荐，而是 curator 的判断：理解这两个制度源头有助于理解东西方文明的不同走向 |
| **Confidence** | Low |

**为什么是 Semantic？**

罗马法和秦制的关系不是 KG 事实（它们没有任何历史连接），也不是简单的导航推荐。curator 认为：将两个 CausalObject 并列理解，有助于 Explorer 形成「制度文明的两种路径」的高阶认知。这种关联 KG 完全不具备，属于 Semantic Layer 的独特价值。

但 Confidence = Low，因为这种对比关联的 Explorer 需求尚未验证。

---

## Candidate #005

| 维度 | 内容 |
| --- | --- |
| **Object A** | co-013：佛教传播 → 东亚思想交流 |
| **Object B** | co-016：丝绸之路 → 宗教融合 |
| **表面关系** | 因果链 — 丝绸之路是佛教传播的通道，佛教传播是丝绸之路文化交流的结果 |
| **分类** | **Semantic Candidate** |
| **KG?** | 部分。丝绸之路（silk_road:silk_road）和佛教（ancient_india:religion-buddhism）在 KG 中存在关联（丝绸之路是佛教传入中国的通道），但两个 CausalObject 的解释逻辑不同——co-013 解释佛教如何适应中国，co-016 解释丝绸之路如何促成多元宗教共存。解释之间的关联 KG 不包含 |
| **Navigation?** | 否。这不是「你可能还想了解」——co-013 和 co-016 是同一个历史过程的两个解释角度 |
| **Confidence** | Medium |

**为什么是 Semantic？**

co-013 和 co-016 的 cause/effect Entity 在 KG 中存在关联，但它们的 explanation 处于不同层面：co-013 聚焦佛教的本地化适应，co-016 聚焦丝绸之路的多元宗教共存格局。Curator 认为：理解这两个解释的关系，有助于 Explorer 形成「传播通道 vs 文化适应」的双层认知。这种解释层的关系 KG 不包含。

---

## Candidate #006

| 维度 | 内容 |
| --- | --- |
| **Object A** | co-014：理学 → 心学 |
| **Object B** | co-001：科举 → 文官体系 |
| **表面关系** | 制度与思想的互动 — 理学通过科举成为官学，科举制度为理学的传播提供了制度渠道 |
| **分类** | **Navigation Candidate**（不是 Semantic） |
| **KG?** | 部分。理学（china_v1:idea-lixue）和科举（china_v1:idea-keju）在 KG 中可能存在关联（理学是科举考试内容），但这属于 KG 事实 |
| **Navigation?** | 是。curator 认为 Explorer 可能对「理学如何通过科举影响官僚体系」感兴趣，但这是 Explorer 的探索兴趣问题，不是 Semantic Layer 的结构性关联 |
| **Confidence** | Medium |

**为什么不是 Semantic？**

理学和科举的关系本质上是 KG 事实——理学是科举考试的标准内容。虽然两个 CausalObject 的解释角度不同（co-014 解释思想演化，co-001 解释制度形成），但 curator 认为这种关联更适合作为 Explorer 导航提示，而非 Semantic Layer 的结构性关系。

---

## Candidate #007

| 维度 | 内容 |
| --- | --- |
| **Object A** | co-015：希腊逻辑学 → 罗马文明 |
| **Object B** | co-009：罗马法 → 法律体系 |
| **表面关系** | 思想→制度的转化 — 希腊逻辑学为罗马法的体系化编纂提供了方法论基础 |
| **分类** | **Semantic Candidate** |
| **KG?** | 否。希腊逻辑学（greek_philosophy:idea-logic）和罗马法（roman_empire:civ-roman）在 KG 中无直接连接。希腊哲学和罗马法是不同文明体系的知识产物 |
| **Navigation?** | 否。这是 curator 的理解判断：罗马法的体系化特征（公法与私法区分、物权与债权概念）受益于希腊逻辑学的分类和推理方法。这种解释层关联 KG 不具备 |
| **Confidence** | Low |

**为什么是 Semantic？**

希腊逻辑学和罗马法的关系是典型的「思想影响制度」的案例——逻辑学提供了形式化思维工具，罗马法学家用这些工具系统化编纂了法律。这种关联在 KG 中不存在（希腊哲学和罗马法属于不同的知识域），但 curator 认为理解这种关联有助于 Explorer 形成「思想→制度」的因果认知模式。

Confidence = Low，因为这是学术假设而非公认历史事实。

---

## 汇总

| # | Object A | Object B | 分类 | Confidence |
| --- | --- | --- | --- | --- |
| 1 | co-004 秦制→三省六部 | co-001 科举→文官 | **Semantic** | Medium |
| 2 | co-008 印刷术→知识传播 | co-011 造纸术→知识传播 | KG | High |
| 3 | co-004 秦制→三省六部 | co-010 三省六部→内阁 | KG | High |
| 4 | co-009 罗马法→法律 | co-004 秦制→三省六部 | **Semantic** | Low |
| 5 | co-013 佛教→思想交流 | co-016 丝路→宗教融合 | **Semantic** | Medium |
| 6 | co-014 理学→心学 | co-001 科举→文官 | Navigation | Medium |
| 7 | co-015 希腊逻辑→罗马 | co-009 罗马法→法律 | **Semantic** | Low |

### M85 Entry Evidence 评估

| Criteria | 状态 |
| --- | --- |
| E4：Curator 确认 ≥3 个 Semantic 关系模式 | ✅ 4 个 Semantic（#1/#4/#5/#7），满足 |
| E5：证明关系属于 Semantic Layer 而非 KG Layer | ✅ 3 个 KG / 1 个 Navigation 已正确排除 |

### 观察

1. **Semantic 类型占 4/7（57%）**——说明 CausalObject 之间确实存在 KG 无法表达的关联。这是 M85 存在的初步证据。
2. **KG 类型占 2/7（29%）**——如果 M85 不加区分地建立 `related_causal_objects`，这两个会被错误纳入 Semantic Layer，造成 KG 重复。
3. **Confidence 分布**：Medium 2 + Low 2。说明 curator 对 Semantic 关系的判断需要更多数据验证，不应在 M85 中过度自信。
