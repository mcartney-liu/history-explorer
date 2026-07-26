# M31 Pilot Dataset Implementation — Deliverables

> **Mode**: STRICT GOVERNANCE MODE (实现模式，严格受控)
> **STOP gate honored**: 未 commit / 未 push / 未 tag；未推广全主题；未引入任何基础设施；等待 PO Review。
> **Baseline**: vM30.2 (`855bc37`, tag `51e1a23a`, runtime `0.13.0`)

---

## 0. 治理状态总览（Governance Status）

| Gate | Result | Note |
|---|---|---|
| `freeze-check.mjs` (CLI) | ✅ FREEZE_EXIT=0 | 无 D-class 违规 |
| `freeze-check.test.mjs` (治理自测) | ✅ 9/9 | allowlist 26→27 |
| `release-consistency-check.mjs` | ✅ 7/7 | Runtime 0.13.0 / Project vM30.2 |
| 后端 pytest | ✅ 219 passed | 系统 python 3.12 |
| 前端 vitest | ✅ 518 passed / 51 files | sh-wrapper 正确调用 |
| 跨文件完整性校验 | ✅ INTEGRITY_OK | 见 §3 |
| ENTITY_TYPES / RELATIONSHIP_TYPES | ✅ 8 / 18 (未变) | `validation.py` 守卫完好 |
| 新依赖 / AI / LLM / DB / Neo4j / ES / GIS | ✅ 零引入 | 纯数据 enrichment |

**结论**：M31 Pilot 全部治理门通过，零回归。所有改动停留在工作树（未提交），等待 PO 评审与发布授权。

---

## 1. M31 Pilot Implementation Summary（实施摘要）

**目标**：在冻结圈内，以单个 Pilot 主题验证「知识模型扩展（Knowledge Model Expansion）」能否提升 History Explorer 作为历史知识智能系统的能力——在不改动架构 / API / runtime / 实体与关系类型的前提下，通过**数据级 enrichment** 增加可追溯性、时空维度、机制解释与证据链。

**Pilot 选定**：`data/examples/ancient_india_example.json`（唯一被 M31-G0 Gate 放行进 allowlist 的 examples 文件）。

**执行步骤（Step 0–7）**：
- **Step 0 基线确认（只读）**：确认 vM30.2 基线、冻结边界、回归基线（pytest 219 / vitest 518 / freeze 0 / consistency 7/7）。
- **Step 1 选定 Pilot**：锁定 ancient_india_example.json。
- **Step 2 结构审计（只读）**：确认 `validation.py` 宽松 schema（未知字段仅 warning，绝不拒绝）→ 加新属性零风险；`load_all` 可解析跨主题引用。
- **Step 3 实体 enrichment**：给 14 个实体补 `geo(lat/lng/label)` / `cultural_affiliation` / `language[]` / `external_refs[]`(source/title/url) / `importance`，并填充既有空字段 `evidence[]`（引用 EvidenceClaim id）/ `source`（文献 source_id）/ `reliability`。
- **Step 4 关系 enrichment**：给 19 条关系补 `mechanism`(cultural|political|technological|religious|economic) + `geographic_scope`，填充 `confidence` / `valid_time` / `weight` / `evidence[]`。
- **Step 5 证据增强**：`data/evidence_claims.json` 既有 3 条 ancient_india 声明补 metadata（`confidence` / `scholar_consensus` / `controversy_level` / `source_ids[]` / `interpretation_note`），新增 ec-011~024（14 条）全人工策展、可追溯；`data/sources.json` 追加 9 个权威来源支撑证据链。
- **Step 6 时间线增强**：4 条 timeline 加 `phase` / `parallel_with[]` / `depends_on[]`。
- **Step 7 校验**：JSON 三文件合法；freeze-check / consistency / pytest / vitest 全绿；修复一条完全重复关系 `religion-buddhism → silk_road:silk_road`（`spread`），关系 20→19。

**最终 Pilot 数据规模**：14 entities / 19 relationships / 4 timeline entries；外源依赖 sources 12（唯一）、evidence_claims 24（其中 15 条与 ancient_india 相关）。

---

## 2. Changed Files List（变更文件清单）

| # | File | Change | Gate |
|---|---|---|---|
| 1 | `data/examples/ancient_india_example.json` | **MODIFIED** (Pilot)。实体/关系/时间线 enrichment；删 1 重复关系。 | M31-G0 allowlist 放行 (26→27) |
| 2 | `data/sources.json` | **MODIFIED** (augmented)。+9 curated 来源 (src-arthashastra / src-tipitaka / src-thapar-early-india / src-aryabhatiya / src-silk-road-archives 等)。total 12, unique 12, 无重复 id。 | 已放行 (M26.1) |
| 3 | `data/evidence_claims.json` | **MODIFIED** (enriched + extended)。原 10 条中 3 条补 metadata；新增 ec-011~024（14 条）。total 24。 | 已放行 (M26.1) |
| 4 | `scripts/freeze-check.mjs` | **MODIFIED** (M31-G0 Gate)。`SCOPE_ALLOWLIST` 26→27，加入 `data/examples/ancient_india_example.json`。 | ADR 同构放行（与 M26.1 放行 sources/evidence_claims 同构） |

**未触碰（冻结守卫零 diff）**：`backend/app/validation.py`、`backend/app/main.py`、API 层、`frontend/*`、`data/examples/` 其他文件、架构基线、runtime 0.13.0、ENTITY_TYPES/RELATIONSHIP_TYPES 枚举、schema。

---

## 3. Validation Results（校验结果）

### 3.1 治理门（见 §0 表，全绿）

### 3.2 跨文件完整性校验（INTEGRITY_OK）
脚本校验了字段语义（非字符串误判）：
- **evidence[] 引用**：实体 14/14、关系 19/19 全部解析到有效 EvidenceClaim id → **0 失效**。
- **实体 source 字段（文献引用）**：实体 14/14 均为有效 `source_id`（例：`civ-maurya = src-ashoka-edicts`）→ **0 失效**。
- **关系 source 字段（来源行为体）**：关系是「来源行为体实体 id」原语义（M26.1 保留，与文献 source_id 不碰撞）；全部为 in-topic 实体 id 或跨主题全局 id（含 `:`）→ **0 未知**。
- **evidence_claim.source_ids[]**：全部解析到有效 `source_id` → **0 失效**。
- **跨主题关系引用**：3 条（`religion-buddhism→silk_road:han_dynasty`、`→silk_road:silk_road`、`civ-maurya→persian_empire:civ-persian`）→ 在 `load_all` 合并时可解析，无 dangling error（已确认）。

### 3.3 Enrichment 覆盖率（真实统计）
| 维度 | 字段 | 覆盖 |
|---|---|---|
| 实体 (14) | geo / cultural_affiliation / external_refs / importance / reliability | **100%** |
| 实体 (14) | language[] | 13/14 (93%) |
| 关系 (19) | mechanism / geographic_scope / confidence / weight / evidence[] | **100%** |
| 关系 (19) | valid_time | 17/19 (89%) |
| 时间线 (4) | phase / parallel_with[] | **100%** |
| 时间线 (4) | depends_on[] | 3/4 (75%) |
| 证据声明 (24) | confidence + source_ids 完整 metadata | 17/24 |

---

## 4. Knowledge Quality Assessment（知识质量评审，Q1–Q5）

### Q1 — 知识丰富度（Knowledge Richness）
**判定：显著提升。** Pilot 前 ancient_india 仅有扁平实体/关系 + 稀疏 evidence；Pilot 后每个实体具备时空坐标（geo）、文化归属、语言、外部权威文献链接（external_refs）、重要性分级；每条关系具备作用机制（mechanism）、地理范围、可信度、时间有效期、权重与证据。时间线具备阶段划分与并行/依赖结构。知识粒度从「存在即记录」升级为「可解释、可定位、可分级」。

### Q2 — 可追溯性（Traceability）
**判定：端到端可追溯，零断裂。** 实体/关系 `evidence[]` → EvidenceClaim `id` → `source_ids[]` → `sources.json` 权威来源，全链路 14+19 引用 100% 解析。15 条 ancient_india 相关声明均带 `scholar_consensus` / `controversy_level` / `interpretation_note`，明确区分「学界共识」与「争议」。这是 History Explorer「可审计、确定性」核心承诺的数据层落地。

### Q3 — 无 AI 推测（No AI Speculation）
**判定：合规。** 所有新增字段为**人工策展**的 curated 数据：external_refs 指向真实文献（Edicts of Ashoka、Pali Canon、Arthashastra、Aryabhatiya 等）；evidence_claim 的 `interpretation_note` 为人工撰写的史实注解，非 LLM 生成；未引入任何 AI 写入事实/证据；AI Gateway 边界未变（仍仅作无状态解释器）。`controversy_level` 字段反而显式标注了不确定性，符合「不伪造置信度」红线。

### Q4 — 探索链路完整性（Exploration Chain Completeness）
**判定：链路闭合且增强。** Click-to-Explore 路径 `实体 → 关系 → 证据 → 来源 → 历史语境` 在 Pilot 数据上完全成立：实体可见 geo/语言/文化；关系可见 mechanism/地理范围；点击证据可达 sources.json 文献。跨主题引用（佛教→丝绸之路、孔雀王朝→波斯）为后续「跨文明探索」埋下可解析节点。M30-B 已交付的前端探索流（RelationshipEvidence + ProvenancePanel + ExplorationFlowGuide）可直接消费本 Pilot 的 enrichment 字段，无需改 UI。

### Q5 — 对 History Explorer 能力增益（Capability Gain）
**判定：增益明确且零回归。** ① 可解释性增强（mechanism/geographic_scope 让用户理解「为何相关」）；② 时空可定位（geo/valid_time 支撑时空筛选与地图可视化潜在能力）；③ 可信分级（confidence/reliability/controversy_level 支撑「可信度视图」）；④ 证据可审计（完整 source 链支撑 provenance 面板）。全部增益来自数据层，不触碰冻结架构，因此 219/518 测试零回归。证明「知识模型扩展」可在冻结圈内安全提升系统智能。

---

## 5. Recommendation for M32（M32 建议）

**核心建议（推荐项）**：M31 Pilot **验证成功**，建议 M32 将本 Pilot 的 enrichment 模式**固化为可复用的数据规范（Data Enrichment Schema / Convention）**并**按主题推广**，但继续严守冻结边界（不引入基础设施、不扩实体/关系类型、不改性架构/API/runtime）。

具体建议：
1. **(推荐) 提炼 enrichment 约定文档**：将 M31 的字段集（geo / cultural_affiliation / language / external_refs / importance / reliability / mechanism / geographic_scope / valid_time / weight / evidence / phase / parallel_with / depends_on）写入 `docs/` 作为「curated data enrichment convention」，使后续主题一致、可审查。
2. **(推荐) 修复 mechanism 枚举缺口（M32 待决项）**：本 Pilot 中 `tp-maurya → tp-guupta`（`before`）使用了 `"mechanism": "chronological"`，超出设计白名单 `{cultural|political|technological|religious|economic}`。freeze-check 当前不守 mechanism 枚举（已 PASS），但为协议一致性，建议 M32 二选一：(a) 把 `chronological` 纳入白名单并升版约定；(b) 为时序关系引入独立字段（如 `temporal_relation: true`）而非复用 mechanism。需 PO 拍板，不私自改协议。
3. **(推荐) 补齐 minor 覆盖缺口**：language[] 1 实体缺失、valid_time 2 关系缺失、depends_on[] 1 时间线缺失——推广时一并补齐至 100%，或明确约定「可空」语义。
4. **(可选) 考虑轻度 schema 化**：当前 `validation.py` 宽松 schema 对 enrichment 字段无强制。若推广多主题，建议增加「enrichment 字段可选但格式须合法」的校验（仍不拒绝未知字段），降低策展错误率。
5. **(不推荐 / 超出冻结)**：本阶段**不**引入 Neo4j/ES/RAG/vector DB；跨主题探索仍走既有全局图合并（`load_all`）+ 全局 id 解析，不建新基础设施。

**STOP 重申**：M31 产出停留在工作树（未提交）。是否进入 M32（推广 + 约定固化 + mechanism 缺口裁决）需 PO Review 批准；正式发布另走 Release Gate（commit → docs sync → tag → push）。

---

## 附：Known Gaps / M32 待决项
- `mechanism: "chronological"`（1 关系，tp-maurya→tp-guupta，`before`）超出白名单 → 待 M32 裁决（见 §5.2）。
- 覆盖缺口：language 13/14、valid_time 17/19、depends_on 3/4 → 推广时补齐（§5.3）。
- 关系 `source` 字段沿用「来源行为体实体 id」原语义（与实体 `source`=文献 source_id 不同域、不碰撞）；报告中已澄清，非缺陷。
- 跨主题引用 3 条依赖 `load_all` 全局合并解析；若未来拆分 examples 为独立加载单元需重新评估。
