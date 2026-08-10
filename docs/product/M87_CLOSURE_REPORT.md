# M87 — AI Companion Runtime Closure Report
### 2026-08-06

---

## 一、一句话结论

> **M87 完成了 History Explorer 从 "AI-powered" 到 "Runtime-first" 的架构范式转换。LLM 被证明是 Renderer（表达系统），而非 Reasoner（认知系统）。**

---

## 二、M87 范围

```
M87.0   Companion Runtime Boundary      — 冻结 Companion 作为第四个 Domain Module
M87.1   CompanionPolicy                  — Policy 决定回答策略（不调用 LLM）
M87.2   Companion Decision               — Decision<CompanionResponsePayload>
M87.3   Runtime Integration              — 4 Domain Modules 共存验证
M87.4.0 Explanation Boundary             — LLM = Renderer, not Reasoner
M87.4.1 Explanation Projection           — Decision → ExplanationContext（纯翻译）
M87.4.2 LLM Renderer Adapter             — ExplanationRenderer 接口 + NoopRenderer
M87.4.3 Renderer Version Contract        — RendererIdentity + Registry + 版本演化
M87.4.4 Explanation Replay Validation    — 三个 Case 验证闭环
```

---

## 三、测试覆盖

```
ExplanationProjection.test.ts   43 passed
ExplanationRenderer.test.ts     31 passed
ExplanationReplay.test.ts       19 passed
─────────────────────────────────────
Companion 总计                   93 passed
```

已有 Runtime 测试无回归。

---

## 四、架构成果

### 4.1 四个演化轴分离

| 变化 | 影响 |
|------|------|
| Policy 升级 | 产生新 Decision |
| Runtime 升级 | 改变执行能力 |
| Memory 增长 | 增加认知历史 |
| Renderer 升级 | 改变表达方式 |

互不污染。

### 4.2 完整链路

```
CompanionPolicy.evaluate()
    ↓
Decision<CompanionResponsePayload>
    ↓
ExplanationProjection (纯函数)
    ↓
ExplanationContext
    ↓
ExplanationRenderer (可替换)
    ↓
ExplanationArtifact (含完整元数据)
    ↓
Human Language
```

### 4.3 Replay 闭环

```
DecisionPackage (持久化)
    ↓
replay() → Decision (不变)
    ↓
projectDecisionToExplanation() → Context (重新计算)
    ↓
renderer.render() → Artifact (新表达)
    ↓
sourceDecisionId 相同 ✅
```

---

## 五、关键决策记录

| 决策 | 理由 |
|------|------|
| Companion 是 Domain Module（非 AI 黑盒） | Policy 决定策略，LLM 只表达 |
| ExplanationProjection 是纯函数 | 不访问 MemoryStore/KG/Search/LLM |
| ExplanationArtifact 非裸 string | 8 字段元数据，可追溯到 Decision |
| NoopRenderer 作为默认实现 | 证明系统不依赖 LLM 成立 |
| Renderer 可替换（接口不绑定模型） | 未来可接入 GPT/Qwen/Local Model |
| Renderer Version ≠ Replay 结果 | Decision 不变，表达可演化 |

---

## 六、文档产出

```
docs/product/M87.0_COMPANION_RUNTIME_BOUNDARY.md
docs/product/M87.4.0_AI_EXPLANATION_LAYER_BOUNDARY.md
docs/product/M87.4.1_EXPLANATION_PROJECTION_CONTRACT.md
docs/product/M87.4.2_LLM_RENDERER_ADAPTER_CONTRACT.md
docs/product/M87.4.3_RENDERER_VERSION_CONTRACT.md
docs/product/M87.4.4_EXPLANATION_REPLAY_VALIDATION.md
docs/product/M87_CLOSURE_REPORT.md (本文件)
```

---

## 七、架构分水岭判断

**M87.4.4 是 Runtime 基础设施的架构分水岭。**

理由：
- 四个 Domain Module 共存（Understanding / Memory / Recommendation / Companion）
- Explanation Layer 完整闭环（Projection → Renderer → Artifact → Replay）
- Decision 可审计、可 Replay、可解释、不依赖模型
- 继续堆 Runtime 基础设施的边际收益已经下降

下一阶段建议：**从"证明系统可以运行"进入"证明用户愿意使用"**。

---

## 八、M86-M87 完整里程碑

```
M85   Experience Translation           ✅
M86.0 Implementation Map               ✅
M86.1 Evaluation Runtime Foundation    ✅
M86.2 Understanding Memory             ✅
M86.3 Runtime Stabilization            ✅
M86.4 Runtime Generality Probe         ✅
M87.0 Companion Boundary               ✅
M87.1 CompanionPolicy                  ✅
M87.2 Companion Decision               ✅
M87.3 Runtime Integration              ✅
M87.4.0 Explanation Boundary           ✅
M87.4.1 Explanation Projection         ✅
M87.4.2 Renderer Adapter               ✅
M87.4.3 Renderer Version Contract      ✅
M87.4.4 Explanation Replay Validation  ✅
```

---

## 九、当前系统定位

> **基于 Cognitive Runtime 的历史探索系统**
> 
> A Cognitive Exploration Engine that transforms human curiosity into structured understanding.

不再是 "AI 历史探索平台"，而是 Runtime-first 的认知探索引擎。
