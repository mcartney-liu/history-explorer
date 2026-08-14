# 实体身份卡配图位 · 方案提案

- **作者**：小梦（代 PO 起草）
- **日期**：2026-08-13
- **状态**：DRAFT — 待 PO 拍板
- **关联**：ADR-0021（Content Configuration Layer）、ADR-0018（持久化与真值字段）
- **拟新增 ADR**：ADR-0022 Entity Identity Image Overlay

---

## 1. 背景与现状

实体页顶部"身份卡"（`frontend/src/components/entity/EntityHero.tsx`）只渲染徽章、名称、时空元信息、AI 历史见解、证据列表、关键事实——**没有任何 `<img>` 元素**。CSS 里 `.eh-ai` 设了 `max-width:580px`，在宽屏上留下大片空白区域，PO 误以为是预留图位。

**代码核查结论**：

| 层 | 现状 |
|---|---|
| 后端 `CONTENT_SLOTS` (`backend/app/content/content_store.py`) | 完全无 entity.hero / entity.identity 槽 |
| 实体数据 JSON (`data/examples/*_example.json`) | 22 个字段，**无 image/cover/hero/任何图片字段**（实查 `roman_empire_example.json` 第一条） |
| 前端 `EntityHero.tsx` | 全部组件代码已读，无 `<img>`，无图相关 prop |
| CSS `.eh-ai` | `max-width:580px` 限宽 → 宽屏右侧大空白是限宽造成的，**不是图位** |
| ADR-0021 边界 | "**展示型内容** = 内容配置层纳管；**知识数据**（实体/关系/证据/来源）= 人工策展，本 ADR 不触碰" |

**核心难点**：PO 想要"罗马文明有罗马文明的图、罗马帝国有罗马帝国的图、100 个实体 100 张图（实体级 1:1）"，但**不能污染实体 JSON**（ADR-0021 边界 + 数据治理要求）。

## 2. 目标与非目标

**目标**：

- 每个实体按 `global_id` 单独配身份卡主图（含可选 `image_focus`）
- 后台能上传、预览、调焦点、删除，零代码改动即可更新
- 实体 JSON 文件（知识数据层）**纹丝不动**
- 不新增外部依赖（DB/ORM/Neo4j/PG/ES/GraphQL/Redis 一律禁止——ADR-0011）

**非目标**：

- 不给"实体类型"配通用图（如"所有文明共享一张图"）—— PO 已明确要 1:1
- 不在实体 JSON 里加字段
- 不动 `EntityHero` 现有渲染（仅追加图渲染）
- 不实现图位 A/B 测试、批量替换、CDN

## 3. 推荐方案：独立覆盖层 + 内容层动态模块（方案 A）

把"实体身份图"视作**展示型内容**（ADR-0021 范畴），用与现有 `image_focus` 完全相同的"内置图 + 用户覆盖图"分离模式：

```
实体 JSON（内置图字段 = null，纹丝不动）
        ↓
  ↓ merge ↓
entity_identity 覆盖层（data/content/entity_identity.json，{global_id → image/image_focus}）
        ↓
EntityHero 渲染：slotEntityImage(global_id)
```

### 3.1 数据模型

**新文件**：`data/content/entity_identity.json`

```json
{
  "_meta": {
    "schema_version": 1,
    "module": "entity_identity",
    "description": "实体身份卡主图覆盖层，按 global_id 索引"
  },
  "overrides": {
    "roman_empire:civ-roman": {
      "image": "civilizations/roman.jpg",
      "image_focus": "52% 20%",
      "_meta": { "uploaded_at": "2026-08-13T02:00:00Z" }
    },
    "roman_empire:event-founding": {
      "image": "events/founding-rome.jpg",
      "image_focus": "50% 50%"
    }
  }
}
```

设计要点：

- `_meta` 仅作存档元信息，**不参与 merge**
- key 用 `global_id`（topic + ':' + local id，唯一识别实体；与实体 JSON 完全一致）
- 值仅含 `image` + `image_focus`（与现有 ContentCard image_focus 字段同 schema，**复用零新字段**）
- 图片文件落 `frontend/public/assets/entities/{image}`（与首页能力卡 `assets/cards/` 同根模式）

### 3.2 后端改动

**`backend/app/content/content_store.py`**：

- `CONTENT_SLOTS` 新增一个**动态模块** `entity_identity`，类似现有的 `_dynamic_slots()` 模式
- 扫描所有实体 JSON，按 `global_id` 生成一个 ContentSlot；初始所有槽 image=null，提示"未上传"
- 加载 `data/content/entity_identity.json` 覆盖层
- merge 逻辑复用现有的 `_merge_with_defaults`（与 image_focus 修复同模式）
- `to_card()` 把覆盖图 + 焦点合并进 ContentCard

**`backend/app/content/content_router.py`**：

- `PUT /api/v1/content/entity-identity/{global_id}` — 上传/更新单个实体的图（沿用现有 content_router 模式）
- `POST /api/v1/content/entity-identity/{global_id}/reset` — 清覆盖回到内置（null）
- `GET /api/v1/content/entity-identity` — 列全部已配图的实体（后台模块用）
- 复用现有 `POST /api/v1/content/media`（base64 图片上传）+ `images_to_delete` 清理机制

### 3.3 前端改动

**`frontend/src/data/contentRuntime.ts`**：

- 新增 `slotEntityImage(globalId): string | null`
- 新增 `slotEntityImageFocus(globalId): string | null`（"x% y%" 格式）
- 与 `slotImageName` / `slotImageFocus` 同风格，**新代码不动既有 API**

**`frontend/src/components/entity/EntityHero.tsx`**：

- 在 `<section className="eh surf-card">` 内、`<div className="eh-badge">` 之前，**条件渲染图位**：
  ```tsx
  {slotEntityImage(globalId) && (
    <div className="eh-hero-image">
      <img src={slotEntityImage(globalId)!} alt="" style={{ objectPosition: slotEntityImageFocus(globalId) ?? '50% 50%' }} />
    </div>
  )}
  ```
- 样式：宽 100%、高 200~240px、`object-fit: cover`、圆角与 surf-card 一致
- 在 `data/examples/*.json` 中**未配置 `globalId`**（罕见但存在）时整块隐藏，**不报错不破图**

**`frontend/src/pages/admin/AdminPage.tsx`**：

- 新增一个**维度 tab 分组**：「实体身份图」（与"图片与焦点"tab 视觉同级）
- 内容渲染：按 `global_id` 分页列出所有实体（先列内置图为空的，再列已配图的），每行：
  - 实体名 + 类型徽章 + global_id（mono 字体）+ 当前 image 缩略图（若有）+ image_focus 坐标
  - 上传控件（复用现有 base64 上传组件）+ 焦点十字编辑器（复用现有 focusPoint 组件）
  - 删除/重置按钮
- 列表性能：实体数量较大（单 topic 16，全库几百），按 topic 分组 + 折叠展开，避免一次渲染几百行
- 分组键：`entity.type`（8 种实体类型）
- 搜索框：按 name/global_id 前缀过滤

### 3.4 文件改动清单（精确 6 文件）

| # | 文件 | 改动量 | 备注 |
|---|---|---|---|
| 1 | `backend/app/content/content_store.py` | +60~80 / -10 | 新动态模块 + merge 覆盖层 + ContentSlot 生成 |
| 2 | `backend/app/content/content_router.py` | +30~40 / -0 | 新增 3 个 endpoint |
| 3 | `frontend/src/data/contentRuntime.ts` | +15~20 / -0 | 新增 slotEntityImage / slotEntityImageFocus |
| 4 | `frontend/src/components/entity/EntityHero.tsx` | +12~15 / -0 | 条件渲染图位 |
| 5 | `frontend/src/styles/components.css` | +15~20 / -0 | `.eh-hero-image` 样式（含未配图占位） |
| 6 | `frontend/src/pages/admin/AdminPage.tsx` | +80~100 / -0 | 新模块维度 tab + 实体列表 + 上传/焦点/删除 UI |
| 7 | `docs/15_DECISIONS/ADR-0022_entity_identity_image_overlay.md` | +60~80 / -0 | ADR 草案 |
| 8 | `data/content/entity_identity.json` | +5 / -0 | 空覆盖层占位文件 |
| 9 | `frontend/src/data/entity/entityLabels.ts`（或 contentApi.ts） | +5~10 / -0 | 列举所有 (global_id, name, type) 三元组供后台用 |

**不在本次改动**：

- 实体 JSON 文件 `data/examples/*.json`（零字节改动）
- 现有 `EntityHero` 组件的其他渲染（仅追加）
- 后台已有模块（landing/entity_tabs/explore 等零改动）
- `ContentCard` schema（复用现有 image/image_focus 字段，**零新字段**）
- 现有 `image_focus` 修复链路（cc05a47 merge 修复模式直接复用）

### 3.5 工作量

- 实施 + 联调 + tsc + freeze + 单测：**~1.5~2 小时**
- ADR-0022 草案撰写：**~15 分钟**
- 验收（含 dev 5174 验证 + 单测 + 后台 UI 走查）：**~20 分钟**

总计：**~2 小时到中间状态**

## 4. 风险与对策

| 风险 | 对策 |
|---|---|
| 实体数量大（几百），后台列表性能 | 按 topic 分组折叠 + 类型 chip 过滤 + 名称搜索；首屏只渲染当前 topic |
| 覆盖层 JSON 文件冲突（多人编辑） | 与 `site-content.json` 同样的 atomic write + 临时文件模式（已有） |
| 上传/删除图与 `images_to_delete` 协调 | 复用现有 `POST /content/reset` + `image_focus` 修复链路 |
| dynamic slot 数量爆炸（每个实体一个槽） | `CONTENT_SLOTS` 已支持 `where` 文案 + `module_label` 分组，AdminPage 按 module 分 tab 渲染，渲染上限取决于单 tab 渲染量（几百行 vitest 验证过） |
| 实体 `globalId` 为空字符串的边界 | EntityHero 已 `if (!globalId) return` 跳过图渲染，不报错 |
| 旧 `image_focus` merge 修复（cc05a47）扩展到 entity_identity | 同 merge 模式，零额外风险 |
| 用户改 global_id 重命名实体 → 覆盖图孤立 | 删除实体时联动清理覆盖层（未来扩展，本次先记 TODO） |

## 5. 验证标准

- tsc `--noEmit` 0 错
- freeze-check[M3.5] PASSED
- 新单测：`backend/tests/test_entity_identity.py`（合并/覆盖/重置 3 用例）、`frontend/src/components/entity/EntityHero.test.tsx` 加 1 个用例（有图/无图两态）
- 后端：`uvicorn --port 8001` 启动后 `GET /content/entity-identity` 返回 `{modules:..., cards:...}`，counts 合理
- 前端：dev 5174 访问 `/entity/roman_empire:civ-roman`，看到主图；访问 `event-founding`，看到不同图；访问无图实体，**不显示空白占位**（整块隐藏）
- 后台：`/admin` 切到"实体身份图"tab，能上传、调焦点、删除；后端 GET 同步更新
- 端到端：后台改 → 5174 刷新看到（vite 热更新 + /content GET 命中）

## 6. 不推荐的替代方案

### 方案 B：直接改实体 JSON 加 image 字段

- 给 `data/examples/*_example.json` 每个实体加 `image + image_focus`
- 后台扫文件树生成 entity_image 表，POST 写回文件
- **不推荐**：① 污染知识数据层（违反 ADR-0021 边界）② 写回文件有并发风险 ③ 实体 JSON 是 Git 追踪的固化资产，写回会污染 git 历史 ④ 工作量比方案 A 更大

### 方案 C：只把空白收掉，不做图位

- 把 `.eh-ai` 的 `max-width:580px` 去掉或放宽，让历史见解占满
- 零代码改动，10 分钟可做完
- **不推荐**：用户明确要图位功能

### 方案 D：暂缓

- 在 `docs/15_DECISIONS/OPEN-DECISIONS.md` 挂 OD-11 留待排期
- **凌晨 3 点推荐**

## 7. 待 PO 决策项

1. **走方案 A 还是 B/C/D**？
2. **后台 UI 分组方式**：按 entity.type 分组（8 类） vs 按 topic 分组（每文件一个） vs 扁平列表+搜索？推荐按 type 分组（产品感更好）
3. **未配图时的占位**：完全不显示（图位整块隐藏） vs 占位灰框（"未上传"提示）？推荐前者（产品感干净）
4. **图床大小限制**：复用现有 base64 单图 ≤ 5MB？还是单独放宽？建议复用，不另立限制
5. **是否同步起草 ADR-0022 草案并提交 Freeze Revision Gate**：建议同步提交，作为本次动工的前置

---

## 8. 落地建议（PO 拍板后）

| 阶段 | 内容 | 估时 |
|---|---|---|
| 1 | ADR-0022 草案 → Freeze Revision Gate 评审 | ~20 分钟 |
| 2 | 后端：content_store.py 动态模块 + merge + 3 个 endpoint + 单测 | ~45 分钟 |
| 3 | 前端：contentRuntime 新 API + EntityHero 渲染 + 单测 | ~25 分钟 |
| 4 | 后台：AdminPage 新 tab + 实体列表 + 上传/焦点/删除 UI | ~50 分钟 |
| 5 | 端到端：5174 验证 + 后台走查 + tsc + freeze + 全量测试 | ~20 分钟 |
| **合计** | | **~2.5~3 小时** |