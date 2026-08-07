# M81b Phase 1 Completion Report

> 阶段：M81b Experience Repair — Phase 1（并行于 M81a）
> 日期：2026-08-04
> 执行原则：不改变 Explorer 探索行为、不改变探索路径、不改变产品能力

---

## 1. 完成项

### A | 向导「下一步原因」本地化 ✅ 已完成

**问题**：GuidePanel 组件中 6 处文案为硬编码中文（"探索向导""你现在在""下一步可以探索""本包入口""查看 X →""已探索 N/M 实体 · X/Y 关系 · Z%"），locale=en 时界面混排中文标签。

**修复**：
- 在 `frontend/src/locales/zh/common.ts` / `en/common.ts` / `ja/common.ts` 新增 8 个 i18n key：
  - `guide.title`（探索向导 / Exploration Guide / 探索ガイド）
  - `guide.subtitle`（副标题）
  - `guide.positionLabel`（你现在在 / You are at / 現在地）
  - `guide.entryHint`（本包入口 / package entry / パッケージ入口）
  - `guide.nextLabel`（下一步可以探索 / Next to explore / 次に探索）
  - `guide.nextCta`（查看 {name} → / View {name} → / {name} を見る →）
  - `guide.coverageText`（已探索覆盖率模板）
  - `guide.doneText`（本包探索已全部完成 / Package exploration complete / パッケージ探索完了）
- `GuidePanel.tsx` 引入 `useLocale().t()`，所有硬编码中文替换为 i18n key 调用
- 测试断言同步更新（renderToStaticMarkup 不走 Context，断言改为匹配 i18n key）

**涉及文件**：
- `frontend/src/locales/zh/common.ts` — 新增 guide.* 键
- `frontend/src/locales/en/common.ts` — 新增 guide.* 键
- `frontend/src/locales/ja/common.ts` — 新增 guide.* 键
- `frontend/src/components/guide/GuidePanel.tsx` — 硬编码中文 → i18n key
- `frontend/src/components/guide/__tests__/GuidePanel.test.tsx` — 断言更新

> 注：关系原因模板（`understandingRules.ts` 的 `RELATIONSHIP_TEMPLATES`）已在此前 M72 Line1 中完成 `ZH_RELATIONSHIP_TEMPLATES` 中文适配，`getRelationshipTemplate` 已按 locale 分发。本次修复的是 GuidePanel 组件的 UI 标签本地化，补全了 M72 Line1 未覆盖的组件层文案。

---

### E | `open_entity` 埋点补 entityGlobalId ✅ 已修复（此前 M72 Line2）

**状态**：`EntityPageShell.tsx` 第 126-129 行已实现 M72 Line2，`open_entity` 事件携带 `entityGlobalId`。代码注释明确标注"M72 Line2 (finding E)"。

**验证**：无需额外修改。此修复在 M72 阶段已完成，本阶段仅确认生效。

---

### C | 面包屑 Home 回到首页 ✅ 已修复（此前 M72 Line1）

**状态**：`App.tsx` 第 351-354 行已实现 M72 Line1，面包屑 Home（index 0）点击后 `onHomeExit → closePackage`，清除包上下文回到首页。代码注释明确标注"M72 Line1 (finding C) preserved"。

**验证**：无需额外修改。此修复在 M72 阶段已完成，本阶段仅确认生效。

---

### F | 「我的探索兴趣」文案修正 ✅ 已完成

**问题**：M71 发现 F 指出"我的探索兴趣"文案暗示系统有用户画像能力，与产品红线（不建画像）存在张力。

**实际状态**：
- 用户可见 UI（`DiscoverPage.tsx` 的 `InterestProfile` 组件）已在此前修复为"我的探索足迹"，空状态文案为"保存研究后，这里会汇总你的探索足迹与关注主题。"
- 但内部审计文档 `UIAudit.ts` 中 `InterestProfile` section 的 `purpose` 仍为"展示用户的探索兴趣画像"

**修复**：
- `UIAudit.ts`：`name: 'InterestProfile'` → `'ExplorationTrail'`，`purpose: '展示用户的探索兴趣画像'` → `'展示用户的探索足迹'`
- `UIAudit.test.ts`：断言 `InterestProfile` → `ExplorationTrail`

**涉及文件**：
- `frontend/src/data/UIAudit.ts`
- `frontend/src/data/UIAudit.test.ts`

---

### B | 罗马/丝路包中文本地化 ⚠️ 包级文案已完成，KG 数据层暂缓

**包级文案状态**：`data/exploration_packages.json` 中 4 个包的 `title.zh`、`summary.zh`、`exploration_goals.zh` 均已完整中文化。

**KG 数据层状态**：`data/examples/roman_empire_example.json` 和 `silk_road_example.json` 中实体 `name` 字段仍为英文（如 "Roman Empire Established""Silk Road""Augustus"）。这是 M71 发现 B 的真正来源——实体名在 KG 数据文件中。

**暂缓原因**：
1. KG 实体名修改会影响后端数据返回，进而影响前端所有依赖实体名显示的组件——属于数据内容层变更
2. 实体名也是 `global_id` 的一部分（如 `roman_empire:event-roman-empire-established`），改名需同时更新 GID 索引
3. 按照 B → D 的顺序（M81b 最后），可在 M81a 验证结束后与 D（跨包指针回填）一起处理

---

## 2. 未完成项

### D | `recommended_next` 跨包指针回填 🔴 暂缓

**原因**：跨包指针修改可能改变 Explorer 的实际探索路径，属于可感知行为变化。按照 PO 决策，应在第一轮 M81a Explorer Validation 完成后，根据真实验证结果统一评估是否调整。

---

## 3. Freeze Boundary 检查

| 边界 | 状态 |
|---|---|
| Runtime Freeze | ✅ 未触 — 仅修改前端 i18n 资源文件和 UI 组件文案，不涉及运行时行为 |
| Trust Boundary (M74) | ✅ 未触 — KG=fact layer, AI=explanation layer 不变 |
| Ontology | ✅ 未触 — 未修改任何 entity/relationship schema |
| ENTITY=8 / RELATIONSHIP=18 | ✅ 未触 — 未增删任何类型定义 |
| M80.5 产品定义 | ✅ 未触 — 不修改 First 5 Minutes / Loop / Object Model / Shell / AI Role |
| M81a 验证对象 | ✅ 未触 — 不修改原型功能、不修改探索路径、不修改数据内容 |

---

## 4. 是否影响 M81a Explorer Validation

**不会影响 Explorer 当前验证对象。**

所有修改均为：
- UI 文案本地化（GuidePanel i18n）— 仅影响标签语言，不改功能
- 内部审计文档修正（UIAudit name/purpose）— 用户不可见
- 已完成的埋点/面包屑修复（E/C）— 已在 M72 阶段生效，本次仅确认

Explorer 在 M81a 原型中看到的探索路径、交互行为、数据内容与修改前完全一致。

---

## 5. 修改文件清单

| 文件 | 操作 | 内容 |
|---|---|---|
| `frontend/src/locales/zh/common.ts` | 修改 | 新增 8 个 guide.* i18n key |
| `frontend/src/locales/en/common.ts` | 修改 | 新增 8 个 guide.* i18n key |
| `frontend/src/locales/ja/common.ts` | 修改 | 新增 8 个 guide.* i18n key |
| `frontend/src/components/guide/GuidePanel.tsx` | 修改 | 硬编码中文 → useLocale().t() |
| `frontend/src/components/guide/__tests__/GuidePanel.test.tsx` | 修改 | 断言适配 i18n key |
| `frontend/src/data/UIAudit.ts` | 修改 | InterestProfile → ExplorationTrail + purpose 修正 |
| `frontend/src/data/UIAudit.test.ts` | 修改 | 断言同步更新 |

---

## 6. 测试结果

```
Test Files  2 passed (2)
     Tests  13 passed (13)
  Duration  1.75s
```

- `GuidePanel.test.tsx` — 6/6 passed
- `UIAudit.test.ts` — 7/7 passed
