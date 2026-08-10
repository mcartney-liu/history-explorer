# ADR-0020 — 中英双语切换：数据内容层 i18n 接入（落地 M62.5 / TP-28）

## ADR Number

ADR-0020

## Title

Bilingual (zh/en) switching — data-content-layer i18n wiring (completes M62.5 / TP-28 LanguageSwitcher)

## Status

Accepted (2026-08-09, PO 拍板「按推荐来」：中英双语切换 + 证据原文保留英文不翻)

**Amended 2026-08-09（动工后摸底修订）**：原 Implementation Plan 假设「加 `name_zh` 字段 + 后端关系动词 i18n + 走 Freeze Revision Gate」。实际执行前摸底发现**数据源早已双语、前端已从 `steps` 本地拼双语、后端英文散文前端不消费**，故真实落地为**纯前端渲染接线、零后端变更、零新字段、零 Freeze Gate**。本文件 Decision / Consequences / Implementation Plan / Freeze Gate 已同步为真实落地。

## Context

ADR-0006 (M62.5) 交付了**纯前端** i18n 运行时：`LocaleProvider` + `useLocale`（zh/en/ja 三语），
`locales/{zh,en,ja}/*` 命名空间文案资源，偏好经 `lib/preferences.ts` 持久化到 localStorage。
`LanguageSwitcher.tsx` 实际挂载于 `ExplorerShell` 的 `GlobalBar`（2026-08-09 修正：原 `AppShell.tsx`
是未挂载死组件，其内 `<LanguageSwitcher/>` 永不渲染）。**UI 文案层框架就绪，但各页面硬编码中文文案
需逐组件接入 `useLocale/t` 才生效**——本次先补齐 `LandingPage`（首页），DiscoverPage 等其余页面待排期。

**原始判断（动工前）**：数据内容层未接入双语，切换语言时实体名 / 关系动词仍为英文硬编码。
这是表面现象，但根因判断偏重——见下方「摸底发现」。

**摸底发现（2026-08-09，「动工」后先原型后改码）**：

1. **数据源早已双语**：`data/examples/*.json` 每个实体对象已有 `labels: {en, la, zh}` 结构
   （非 `name_zh`）。脚本 `scripts_audit_labels.py` 审计：**186 个实体全部含 `labels.zh`，缺失 0**。
   原 `name`（英文）保留作内部键，无需新增字段。
2. **前端数据层早已真双语**：`explorationPackages.getEntityDisplayName(global_id, locale='zh')`
   （`frontend/src/data/explorationPackages.ts` ~L221）按 `locale` 读 `e.labels[locale]`，已是数据源驱动的真双语。
3. **关系动词早已可本地拼双语**：`ConnectionExplained` 类型携带结构化 `steps`
   （`from_global_id` / `relationship` / `to_global_id`），`ConnectionsExplainedPanel` 早已从 `steps` 本地
   拼双语，不消费后端英文散文。`getRelationshipLabel(predicate, locale)` 已支持 locale。
4. **后端英文散文前端不消费**：`backend/app/core/exploration_engine.py` 的 `_RELATION_PHRASES` +
   `_explain_path` 拼的英文 `explanation`，在推理链主视图中未被必要消费（前端用 `steps` 本地拼）。
   → 后端无需改动即可规避 Freeze Revision Gate。

PO 决策（2026-08-09，AskUserQuestion 拍板）：
- **路线**：中英双语切换（而非强制单语中文）。
- **证据原文**：保留英文不翻译（citation 不翻译，学术严谨，省 227 条翻译成本）。

## Decision

1. **复用现有 `labels.zh`，不新增 `name_zh` 字段**：数据源已双语（186 实体 `labels.zh` 全覆盖），
   前端 `getEntityDisplayName(global_id, locale)` 已读 `labels[locale]`。原「加 `name_zh`」计划作废，
   #186 工作量归零，**数据文件零改动**。
2. **后端零改动（规避 Freeze Gate）**：前端从 `conn.steps` 本地拼双语 + 按 `global_id` 查 `labels`；
   后端英文 `explanation` 不翻译、不被必要消费。故**不触碰 `backend/app/core/exploration_engine.py` 及
   API 层**，无后端契约变更，无需 Freeze Revision Gate。
3. **证据原文不翻译**：`translateEvidenceText()` 退化为恒返原文（中英文模式均显示英文原文）。
   此前 `EVIDENCE_TEXT_MAP` 整句中文映射**退役**（citation 不翻为有意为之）。
4. **前端渲染链路接 locale（实际改动范围）**：
   - `interpretationFormatter.ts`：`localName` 改 `getEntityDisplayName(conn.global_id, locale)`（按
     `global_id` 查 `labels`，真双语）；新增 `buildBilingualExplanation(conn, locale)` 从 `conn.steps`
     本地拼「A 关系 B」；`toInterpretationViewModel` 等 `locale` 默认 `'zh'` 透传。
   - `TrustDisplay.tsx`：3 处 `getEntityDisplayName(item.label)` →
     `getEntityDisplayName(item.global_id, locale)`（按 `global_id` 查才是真双语路径，测试数据同时带
     `global_id` 与英文 `label`），import 改自 `explorationPackages`。
5. **切换器真正生效**：`LanguageSwitcher` 接于 `GlobalBar` 后一切，实体名 / 关系动词即时切换（数据驱动）；**UI 文案层本次补齐 `LandingPage`**（首页 hero/quick-start/理解模式入口/badge/加载/空状态接 `useLocale/t`），其余页面硬编码文案待排期接入。

## Alternatives

- **强制单语中文（前端硬编码映射）** — rejected：切换器在 en 模式下名存实亡，且映射表随实体增长
  无限膨胀，非数据源驱动。
- **证据原文也全翻译（227 条）** — rejected：citation 翻译成本高、易失真、学术上不严谨；PO 选
  「保留英文不翻」。
- **后端动词 i18n（原方案）** — rejected after 摸底：前端已从 `steps` 本地拼双语，后端改动纯属多余且
  会触发 Freeze Gate，故撤销。

## Consequences

- `LanguageSwitcher` 从「半生效」升级为「真正驱动数据内容」：en 模式实体名+关系显示英文，zh 模式
  显示中文（来自 `labels.zh`）。
- 证据区在中英文模式下**恒显英文原文**（有意，呼应 citation 不翻决策）。
- **后端零改动**：`exploration_engine.py` 与 API 层未触碰，无 Freeze Revision Gate，无后端回归风险。
- **数据文件零改动**：复用现有 `labels.zh`，无 `name_zh` 迁移。
- 前端 `entityLabels.ts`：`translateEvidenceText` 退化恒返原文；`EVIDENCE_TEXT_MAP` 退役；
  `ENTITY_DISPLAY_NAMES` 保留但已非主路径。`interpretationFormatter.ts` 完成 locale 透传 + steps 拼装。
- 549+ 既有测试 + 新增双语断言保持绿；locale 感知断言沿用 ADR-0006 W10 模式。

## Implementation Plan（实际落地清单，2026-08-09 执行）

| # | 文件 / 范围 | 实际改动 | 验证 |
|---|-------------|----------|------|
| 1 | `frontend/src/data/interpretationFormatter.ts` | `localName` 改 `getEntityDisplayName(conn.global_id, loc)`；新增 `buildBilingualExplanation(conn, locale)` 从 `steps` 本地拼；`toInterpretationViewModel` / `toInterpretationViewModels` `locale` 默认 `'zh'` 透传 | `interpretationFormatter.test.ts` 9 passed |
| 2 | `frontend/src/components/ai/TrustDisplay.tsx` | 3 处 `getEntityDisplayName(item.label)`→`getEntityDisplayName(item.global_id, locale)`；import 改自 `explorationPackages` | `TrustDisplay.test.tsx` 12 passed |
| 3 | `frontend/src/data/entity/entityLabels.ts` | `translateEvidenceText` 退化恒返原文；`EVIDENCE_TEXT_MAP` 退役（citation 不翻） | `m62-entity-labels.test.ts` 3 passed（无回归） |
| 4 | `frontend/src/__tests__/interpretationFormatter.test.ts` | 重写 9 个双语断言（zh→'汉朝'/en→'Han Dynasty'/空 steps 回退后端英文） | — |
| 5 | `frontend/src/__tests__/ConnectionsExplainedPanel.test.tsx` | 结构断言（'可解释关联'/'rel-pill'/'rel-chain-note'），不依赖旧英文 explanation | 3 passed |
| 6 | 联调验证 | 5174 新栈切中/英，实体名与关系动词跟随变化、证据区恒英文 | 逻辑层由 39 测试覆盖；建议 PO 在 5174 栈手动切语言确认视觉 |
| 7 | `frontend/src/components/LandingPage.tsx` + `locales/{zh,en,ja}/app.ts` + `scripts/freeze-check.mjs` | LandingPage 接 `useLocale`，hero/sub/understanding*/quickStart(1-4)/loading/emptyTopics 改 `t()` 从 locales 取；三语言补 `landing.*` key（ja 用 en 值兜底防 raw key 泄漏）；`SCOPE_ALLOWLIST` 加 `frontend/src/components/LandingPage.tsx`；测试改包 `LocaleProvider` + `lookup` 验 en/ja | `LandingPage.test.tsx` 10 passed；`tsc` 0 错误 |

**测试汇总（2026-08-09，真实 node 二进制规避 `.bin/node` 垫片后跑通）**：
`6 files, 39 passed (39)` —— interpretationFormatter(9) + TrustDisplay(12) + ConnectionsExplainedPanel(3) +
m62-entity-labels(3) + InterpretationPanel(10) + InterpretationPanel.integration(2)。
`tsc --noEmit` 全仓 **0 错误**（含原 OD-08 DiscoverPage 已清）。

## Related ADRs

- ADR-0006 (M62.5 Global Language Experience System) — 本 ADR 的直接前置，完成 UI 层 i18n。
- ADR-0019 (disputes reinterprets relationship types) — 关系类型语义边界，本 ADR 关系动词 i18n 不改动
  关系类型枚举（RELATIONSHIP_TYPES=18 不变）。
- ADR-0013 (Article 0 终极定位) — 真值层要求证据可证伪；citation 保留原文与此一致。

## Freeze Revision Gate

- **No** — 后端 `exploration_engine.py` 与 API 层**未改动**，无后端契约变更，无需 Freeze Revision Gate。
- 仅 `frontend/src/data/interpretationFormatter.ts` / `TrustDisplay.tsx` / `entityLabels.ts` 渲染层接 locale，
  属 P5 已放行的前端范围（`freeze-check.mjs` SCOPE_ALLOWLIST 覆盖）。
- `LandingPage.tsx` 在 `src/components/` 根（非子目录），原不在白名单，已扩 `SCOPE_ALLOWLIST` 加
  `frontend/src/components/LandingPage.tsx`（前端文案 i18n，同属 P5 放行范围）。
- 数据文件 `data/examples/*.json` **零改动**（复用现有 `labels.zh`）。
- ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 枚举不变；无新依赖；AI/LLM 红线不受影响。
- PO approval record: 2026-08-09 用户拍板「按推荐来」（中英双语切换 + 证据不翻）。
