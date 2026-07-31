# ADR-0011 AI Runtime Architecture

> **ADR 类型：架构决策（Architecture Decision）**
> **问题：History Explorer 的 AI Runtime 应该如何存在？**
>
> 本文档位于文档链：
>
> ```
> M74_AI_ARCHITECTURE_AND_PRODUCT_FREEZE.md   ← 为什么（Freeze，最高约束）
> M74_AI_CAPABILITY_DESIGN.md                 ← 做什么（能力冻结）
> ADR-0011（本文档）                           ← 怎么组织（架构决策）
> （实现/编码计划）                             ← 具体开发（未来，不在本文档）
> ```
>
> 本文档**只回答「怎么组织 AI 系统」**，不进入具体开发。不涉及实现代码、不涉及模型/供应商品牌。
> 本文档**不得违反** Freeze 与 Capability Design 的任何条款；冲突时以上位文档为准。
>
> - 状态：**PROPOSED（待 PO 审核）**——通过后经 Freeze Revision Gate 生效
> - 版本：1.0（draft）
> - 日期：2026-07-31
> - 上位依据：M74 Freeze v1.0 / M74 AI Capability Design v1.0
> - 既有基础：M36 ai_gateway（ADR-0003，grounded AI 解释架构，已批准未激活）

---

## 第一部分 Context（背景）

### 1.1 为什么现在需要 AI Runtime

M74 决定引入 AI 能力（Guidance / Explanation / Conversation / Trust），而这些能力**需要一个统一的运行载体**。Freeze 定义了「AI 是解释层、KG 是事实层、AI 不产生事实」（Freeze §1.2），Capability Design 定义了四类产品能力与输出契约（Capability Design 第三/四部分）——但「能力如何被组织、执行、约束、评价」尚未决策，这就是本 ADR 的回答范围。

### 1.2 必须满足的既有约束

| 约束来源 | 要求 |
|---|---|
| Freeze §4（五层架构） | Runtime（L4）位于 Trust（L5）之下；任何层不得绕过 L5 |
| Freeze §7（Trust Rules） | Rule 1 无 Source 不输出 / Rule 2 无 Claim 不解释 / Rule 3 引用优先 / Rule 4 Grounding 优先 / Rule 5 不确定必须说明 |
| Freeze R1–R8（红线） | 不修改 KG、不生成无引用事实、不绕过 Trust、不引入图外知识、不个性化 |
| Capability Design 第四部分 | 输出契约 4 字段（Explanation / Evidence Reference / Confidence / Next Exploration） |
| Capability Design 第八部分 | 待 ADR 决策的 8 个问题（Model Adapter / Grounding Pipeline / Prompt / Evaluation Dataset / Fallback / Gate / Trust Display 数据流 / 事件度量） |
| M73 Freeze Baseline | 无新增 runtime 依赖；backend 既有 ai_gateway 为 M36 批准模块 |

### 1.3 决策边界

本 ADR 决策「Runtime 如何组织」，**不决策**：

- 具体模型/供应商选择（属 Model Adapter 配置层，实现阶段）
- 具体 UI 布局（属 Capability Design 第五部分，已冻结两触点）
- 具体代码结构（属实现）

---

## 第二部分 Considered Options（备选方案）

### Option A — Frontend 直接调用 LLM API

**流程**：Frontend（浏览器）→ 直接请求 LLM API（Key 在客户端）。

**优点**：
- 架构最简，无后端中间层
- 前端自由度最高，迭代快
- 单轮问答场景实现路径短

**缺点**：
- **Key 暴露**：凭据在客户端，无法安全管理（严重安全缺陷）
- **无强制 Grounding**：Trust Rules 1/2 依赖后端校验，前端无法可信执行 → 违反 Freeze §7（不可降级）
- **无统一评估入口**：输出质量不可度量（Capability Design 第七部分验收无法执行）
- **无 Fallback 编排**：模型失败时前端无法可靠降级到确定性能力
- **绕过 Trust Layer**：直接违反 Freeze R4（不得绕过 Trust Layer）与五层架构（L4/L5 在后端）

**否决理由**：安全缺陷 + Trust 不可执行 + 违反 Freeze 红线。**否决。**

### Option B — Backend AI Gateway（后端网关 + Grounded Generation）

**流程**：

```
Frontend
  ↓ 请求（Topic/Entity/Question）
Backend AI Gateway（复用 M36 ai_gateway）
  ↓ Grounding（上下文仅来自 KG）
  ↓ Prompt（版本化 + 输出契约约束）
  ↓ Model（Adapter 抽象，配置驱动）
  ↓ Response（结构化契约）
Frontend（Trust Display 渲染）
```

**优点**：
- **Key 服务端管理**：凭据不进前端（安全）
- **Grounding 强制在后端**：Trust Rules 1/2/4 在生成与校验位强制执行
- **统一评估入口**：所有 AI 输出过同一校验管道（golden set 可测）
- **Fallback 服务端编排**：模型失败/超时 → 降级确定性能力
- **与 Freeze 完全对齐**：L4 Runtime + L5 Trust 天然落位后端
- **复用 M36 资产**：ai_gateway（grounding_builder / prompt_service / answer_service / fallback_handler / provider / citation_model）为 ADR-0003 批准模块，激活成本低

**缺点**：
- 后端复杂度增加（单点依赖，靠 Fallback 缓解）
- 需要 Freeze Revision Gate（激活 LLM runtime 打破 vM73 冻结语义）
- 非流式、单轮（MVP 范围内的限制，非缺陷）

**结论**：满足全部约束。**采纳为决策基础。**

### Option C — Agent Framework / Multi-Agent

**流程**：引入 Agent 框架，多智能体编排（规划 / 工具调用 / 记忆）。

**优点**：
- 远期能力强（多步任务、工具使用、Research 模式）

**缺点**：
- **复杂度远超 MVP**：编排/记忆/工具调用引入大量新面
- **幻觉面扩大**：多步自主决策降低 grounding 可控性（Freeze §7 不可降级）
- **Freeze §9 明确排除**：Agent / Multi-Agent 定义不属于 M74
- **引入新依赖**：违反 M73 Freeze Baseline「无新增 runtime 依赖」

**否决理由**：与 M74 范围（AI MVP）及 Freeze §9 冲突。**当前阶段否决**（M80+ 重新评估）。

---

## 第三部分 Decision（决策）

> **选择：Backend AI Gateway + Grounded Generation（Option B）。**

**理由（按优先级）**：

1. **Trust 可强制执行**：Grounding 与 Trust 校验在后端单一位置执行（Trust Rule 1/2/4 的 L4/L5 执行位），不存在绕过路径（Freeze R4）。
2. **安全**：凭据仅存服务端，前端零 Key（Option A 的致命缺陷不存在）。
3. **评估可行**：所有 AI 输出过同一校验管道，golden set 与四指标可落地（Capability Design 第七/八部分）。
4. **Fallback 可编排**：模型失败/超时 → 服务端降级确定性能力（Failure Strategy，第七部分）。
5. **复用既有资产**：M36 ai_gateway（ADR-0003）已批准，激活 + 强化，不新增架构、不新增依赖。
6. **与文档链一致**：Freeze 五层（L4/L5）与 Capability Design 全部要求在此架构下自然成立。

**生效前提**：经 **Freeze Revision Gate**（ADR 评审 + allowlist 变更 + PO 批准）——本 ADR 即该 Gate 的决策文档（Freeze 附录 B）。

---

## 第四部分 Architecture Boundary（架构边界）

### 4.1 AI Runtime 负责（✓）

| 职责 | 说明 |
|---|---|
| ✓ **Prompt orchestration** | 提示词组织：版本化、注入白名单（仅 KG）、输出契约约束 |
| ✓ **Context assembly** | 上下文组装：实体邻域（实体/关系/时间/claims/sources）只读提取 |
| ✓ **Grounding** | 证据选择 + 断言绑定 + 绑定校验（Trust Rules 1/2/4） |
| ✓ **Model routing** | 供应商抽象、模型路由、请求归一化（不绑定品牌） |
| ✓ **Fallback** | 失败/超时/低置信的降级编排 |
| ✓ **Evaluation** | 输出度量：grounding 覆盖率、citation 有效性、幻觉率（离线 golden set） |

### 4.2 AI Runtime 不负责（×）

| 职责 | 说明 |
|---|---|
| ✗ **创建历史事实** | 输出空间 ≤ 输入空间（Freeze §3.2） |
| ✗ **修改 KG** | 写权限为零（Freeze R1） |
| ✗ **写入 Timeline** | 时间事实不可变（Freeze §3.2） |
| ✗ **自动生成 Entity** | 实体只来自治理数据（Freeze R6） |
| ✗ **改变 Claim** | 证据声明不可变（Freeze R1/R3） |

> **边界判据：Runtime 是「组织与校验」层，不是「生产与修改」层。**

---

## 第五部分 Grounding Flow（Grounding 流程）

逻辑流程（描述性，非代码）：

```
User Intent（问题 / 实体 / 包）
  ↓ ① 确定性前置：Topic Resolution（问题 → 图内实体/包；失败 → 拒绝 + 引导，不进入 AI）
  ↓ ② Context Retrieval：从 KG 只读提取目标实体邻域
  ↓ ③ KG Evidence Selection：候选 claim/source 按相关性、tier、可信度筛选
  ↓ ④ Claim Binding：确定「断言 ↔ claim」绑定约束（每条断言必须有绑定目标）
  ↓ ⑤ Prompt Assembly：仅注入 KG 上下文 + 输出契约约束（无图外知识）
  ↓ ⑥ LLM Generation：生成（受输出契约约束）
  ↓ ⑦ Trust Validation：绑定校验（断言↔claim 存在且有效）+ citation 有效性 + KG 冲突检查
  ↓ ⑧ Response：结构化输出（4 字段契约）
  （任一步失败 → Fallback，见第七部分）
```

**流程要点**：

- **① 是确定性闸门**：Topic Resolution 失败即拒绝，AI 不猜测（Freeze R5）
- **②③ 只读**：任何环节无 KG 写操作（Freeze R1）
- **④ 先于 ⑤**：绑定约束在 Prompt 组装**前**确定——生成从一开始就受限，而非事后补救
- **⑦ 后置校验**：即使生成端绑定失败，校验端也会拦截（双保险，Trust Rules 4）
- **⑦ 冲突检查**：AI 表述与 KG 冲突（时间/关系方向/身份）→ 撤回该断言或标记「与图数据不一致」

---

## 第六部分 Response Contract（响应契约）

结合 Capability Design 第四部分（Output Contract），冻结 AI Response 结构：

```
1. Explanation        自然语言解释（可含多断言，逐句可绑定）
2. Evidence Reference 证据引用列表（断言 → claim/source id，可点击）
3. Confidence         置信标注（高/中/低 + 低置信原因）
4. Next Exploration   下一步建议（图内可达且未访问，至多 3 条；对话场景可为空但给引导）
```

**契约执行位**：

| 字段 | 生成位 | 校验位 |
|---|---|---|
| Explanation | ⑥ LLM Generation（受 ⑤ Prompt 约束） | ⑦ Trust Validation（逐句绑定） |
| Evidence Reference | ④ Claim Binding（预先确定候选） | ⑦（id 有效性） |
| Confidence | ⑥（模型自评 + 证据强度） | ⑦（低置信强制说明，Trust Rule 5） |
| Next Exploration | ②③（图可达性计算，确定性） | ⑦（仅图内、非个性化） |

**禁止**：任何绕过契约的裸文本输出（Capability Design §4.2 约束 1）。

---

## 第七部分 Failure Strategy（失败策略）

### 7.1 总原则

> **Fallback > Hallucination。** 任何失败路径都不得以「猜测输出」兜底（Freeze R5 / Trust Rule 1）。

### 7.2 失败矩阵

| 失败场景 | 判定 | 处置 |
|---|---|---|
| **无 Source** | 目标实体无任何 source 可达 | 拒绝输出断言；输出「本库暂无该主题证据」+ Next Exploration 引导（确定性） |
| **无 Claim** | 有 source 但无 claim 可绑定 | 同上；引导至该实体的 Source 页 |
| **KG 不足** | 邻域过小（如无关系/时间数据） | 降级为「简短确定性摘要」+ 引导；不强行 AI 解释 |
| **模型失败**（provider 错误） | 调用异常 | Fallback 链：① grounded 缓存（若有）→ ② 确定性 Guide/模板 → ③ 降级提示「AI 暂不可用，已切换确定性引导」，不报错 |
| **模型超时** | 超过阈值 | 同上（Fallback 链）；非流式下阈值建议 <2s 目标，超时即降级 |
| **低置信**（模型自评 + 证据强度低） | Confidence=低 | 输出保留但**强制附加「证据不足/存在争议」说明**（Trust Rule 5）；或经 ⑦ 拦截降级 |

### 7.3 Fallback 链（冻结顺序）

```
LLM 可用 & Trust 校验通过  → 结构化 AI 输出
LLM 失败/超时              → grounded 缓存（命中则复用）
无缓存 / 缓存过期           → 确定性能力（Guide 位置/下一步模板 + SourceChain）
仍不可用                   → 降级提示（用户可见，不报错）
```

> **判据：用户永远看到「有依据的内容」或「明确的降级说明」，绝不看到「看起来合理但无依据的内容」。**

---

## 第八部分 Evaluation Architecture（评估架构）

### 8.1 评估方式

**离线 golden set 跑分 + 线上事件度量** 双轨（不新增埋点协议，复用本地事件流）。

### 8.2 Golden Dataset

- 规模：20 条（覆盖 4 官方包）
- 构成：引导 8 / 解释 8 / 问答 4（对齐 Capability Design §7.3）
- 标注：每条含「期望断言集 + 期望引用 id 集 + 期望置信级」人工基线
- 用途：Prompt 变更 / Runtime 变更的回归门禁（变更必须重跑 golden set）

### 8.3 指标（冻结口径）

| 指标 | 定义 | 目标 |
|---|---|---|
| **Grounding Accuracy** | 有有效绑定断言的占比（绑定成功断言 / 总断言） | 100%（硬性） |
| **Citation Accuracy** | 引用 id 存在于 sources/claims 注册表的占比 | 100% |
| **Hallucination Rate** | 图外事实断言占比（人工评审 golden set） | 0 |
| **User Helpfulness** | 建议采纳率（线上事件：引导建议点击 / 展示）+ 人工评审可读性 | 采纳 ≥30%；可读性 ≥80% |

### 8.4 评估执行

- golden set 跑分：离线脚本（复用本地事件/纯函数模式，只读）
- 线上度量：复用 M71 本地事件流（引导建议点击事件），零新增协议
- 结果记录：每轮评估留档（Evaluation System，Freeze §8 Capability E）

---

## 第九部分 Security & Governance（安全与治理）

| 项 | 决策 |
|---|---|
| **API Key 管理** | 仅存服务端（环境变量/受管配置），**永不进入前端代码/仓库**；Key 轮换流程；无 Key 时系统以 Fallback 模式运行（不崩溃） |
| **Rate Limit** | 按端点/会话限流（单用户本地部署早期默认宽松，但机制存在）；防滥用兜底 |
| **Logging** | 匿名日志：记录请求类型、输出指标（grounding 率/耗时/降级次数）；**不记录问题原文之外的敏感信息**；本地日志为主 |
| **Privacy** | 无账户、无用户画像（Freeze R8）；事件流仅本地 localStorage；AI 请求不携带任何个人身份信息 |
| **Cost Control** | 单轮短问答（token 上限）；非流式；缓存命中优先；配额监控 + 超限自动降级 Fallback 模式 |

> **治理判据：任何安全措施不得以降低 Trust Rules 为代价；Key 泄漏风险 > 功能缺失风险。**

---

## 第十部分 Consequences（决策后果）

### 10.1 收益

- Trust 可强制执行（无绕过路径），产品定位（KG 事实 / AI 解释）在架构上成立
- Key 安全、评估可行、Fallback 可靠
- 复用 M36 资产，无新增依赖，符合 Freeze Baseline 精神
- 与 Freeze / Capability Design 全链一致，后续 ADR（Model Adapter 等）有明确归属层

### 10.2 成本

- 后端激活复杂度（Gate 流程 + allowlist 变更 + 配置）
- Gateway 为单点：AI 能力依赖其后端可用性（Fallback 缓解，但确定性兜底体验降级）
- 单轮/非流式限制（MVP 范围，多轮属 M75+）

### 10.3 限制

- 模型能力上限受 Grounding 约束（注入仅 KG，模型自身知识不得作为事实）
- 跨文明/深度问题依赖 KG 覆盖度（43/76/9 规模有限，KG 不足时走 Fallback）
- 不解决「用户想聊任意历史话题」的期望（产品定位非 ChatGPT，Freeze §1.1）

---

## 附录

### A. 文档链位置

```
Freeze v1.0（为什么）→ Capability Design v1.0（做什么）→ ADR-0011（怎么组织，本文）→ 实现计划（具体开发，未来）
```

### B. 待后续 ADR/实现细化（本 ADR 不决策）

- Model Adapter 具体配置（品牌/模型/参数——实现层）
- Prompt 具体模板（版本化——实现层）
- Golden set 具体条目（标注——Evaluation 执行层）
- 前端 Trust Display 渲染细节（Capability Design §5 已冻结触点，细节属实现）

### C. 生效流程

1. PO 审核本 ADR（本文档为 PROPOSED）
2. 批准 → 落位 `docs/15_DECISIONS/ADR-0011_*.md` + freeze-check allowlist 变更（激活 ai_gateway 相关）
3. 实现阶段按 Capability Design 第六部分（MVP Scope）推进

---

*本文档为架构决策（Design Review Mode），不涉及实现代码、不涉及模型/供应商品牌、未修改任何已有文档。*
