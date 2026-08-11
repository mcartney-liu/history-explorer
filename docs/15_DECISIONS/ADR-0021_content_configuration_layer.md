# ADR-0021 — Content Configuration Layer (内容配置层)

- **Status**: ACCEPTED — approved 2026-08-10 (PO: 翔哥, via conversation "按你推荐的来吧")
- **Date**: 2026-08-10
- **Branch**: `feature/content-admin` (based on `phase5/reconstruction` @ 61d5870)
- **Supersedes**: none
- **Related**: ADR-0016 (zero-dependency icons), ADR-0018 (sqlite research archive), VS-01/VS-03 (visual system)

---

## 1. Context

前端着陆页的**展示型内容**目前硬编码在源码里：

| 位置 | 内容 | 现状 |
|---|---|---|
| `frontend/src/components/shell/ProductIntro.tsx` | 4 张能力卡的 `title` / `desc` | 写死在 `PRODUCT_CAPABILITIES` 数组 |
| `frontend/public/assets/cards/card-<id>.jpg` | 4 张能力卡配图 | 靠文件名约定 drop-in，无管理界面 |
| `frontend/public/assets/packs/<slug>.(jpg\|webp\|png)` | 主题包封面 | 同上 |

**问题**：PO 每次想换一张配图、改一句文案，都必须走「改代码 → 提交 → 门禁 → 构建」的完整工程链路。这对**展示型内容**是过重的流程负担，也让非工程角色无法自主迭代产品表达。

**注意这不是知识数据问题**。实体、关系、证据、来源等知识资产由 `data/*.json` + 人工策展流程管理（M26.1 Source Registry 等），本 ADR **完全不触碰**它们。

---

## 2. Decision

新增一个**内容配置层（Content Configuration Layer）**，把「展示型内容」从源码中外置为运行时数据，并提供一个最小后台界面进行编辑。

### D1 — 范围：展示型内容，注册表驱动的全模块配置

首批纳管（commit 135d2db）：`ProductIntro` 的 4 张能力卡（`title` / `desc` / `image`）。

经 PO 拍板（选项 A，2026-08 会话）**扩展范围**：采用「注册表驱动 + 运行时覆盖层」，首批接通 4 个模块的 26 个可编辑槽位：

| 模块 | 槽位数 | 槽位 | 说明 |
|---|---|---|---|
| `landing` | 4 | story / explore / research / chat | 首页能力卡（带图） |
| `entity_tabs` | 5 | info / explore / research / analyze / extensions | 实体页标签引导文案 |
| `exploration_flow` | 4 | relationship / evidence / source / historical_context | 探索流步骤文案 |
| `ai_capabilities` | 8 | explain_entity … summarize_research | AI 能力卡名称 / 描述 / 示例问题 |

**明确排除（仍不纳管，需另开 Gate）**：
- 任何知识数据（实体 / 关系 / 证据 / 来源 / 因果对象）
- i18n 语言包（受 ADR-0020 双语数据层约束）
- 行为字段：AI 能力的 `trigger` / `requiredContext` / `requiresModel` 不可配（属引擎契约）；引导的 `userGoal` 等内部标签不可配（不渲染）

**关于 IP-02 契约的兼容性说明**：原 D1 将 `EntityTabGuidance.ts` / `ExplorationFlowGuide.tsx` 标为「受 IP-02 契约约束、不纳管」。实际实现仅**外置展示文案（中文 copy）**，槽位结构（tab key / step key / 字段 schema）与行为契约（IP-02 的 TP-01-30 结构）仍硬编码于源码、未改动。故不违反 IP-02「结构契约」——外置的是表达层，不是方法论结构。此判断经 PO 在选项 A 中确认。

### D2 — 门控：`ADMIN_ENABLED` 环境变量，默认关闭，不引入鉴权

- 读接口 `GET /api/v1/content` **永远开放**（前端渲染依赖它）。
- 写接口（`PUT /api/v1/content`、`POST /api/v1/content/media`）由 `ADMIN_ENABLED=true` 门控，**默认 `false`**，关闭时返回 `403`。
- **不引入登录 / 权限 / 会话** —— 冻结基线明令禁止。本地开发与单机部署场景下，环境变量门控即为边界。生产多用户部署前必须另开 Gate 补鉴权，此约束写入代码注释与本 ADR。

### D3 — 持久化：JSON 文件，非数据库

内容存 `data/content/site-content.json`（stdlib `json`）。
**不引入 PG / Neo4j / ES / ORM**。ADR-0018 对 sqlite 的例外授权仅限匿名研究存档，不扩展到本层。

写入采用 **atomic replace**（写临时文件 → `os.replace`），避免半写状态。

### D4 — 图片：base64 JSON 上传 + 运行时目录，零新依赖

- **不使用 multipart**：FastAPI 的 `UploadFile` 需要 `python-multipart`，属新依赖，撞冻结红线。改由前端 `FileReader` 读成 base64，走普通 JSON `POST`，后端 stdlib `base64` 解码落盘。
- 存储位置：`data/content/uploads/`，经 `GET /api/v1/content/media/{filename}` 提供。
- **不写入 `frontend/public/`**：那里被 git 追踪，切分支会丢失/冲突，且会持续撑大代码仓库。运行时目录与分支解耦 —— 切任何分支，图片都在。
- `data/content/` 加入 `.gitignore`（`uploads/` 与 `site-content.json` 均不入库）。
- 安全约束：白名单扩展名（`.jpg/.jpeg/.png/.webp`）、大小上限 4 MB、文件名由服务端生成（`sha256[:16] + ext`），**绝不采信客户端文件名**，杜绝路径穿越。

### D5 — 三级回退：后端不可用时界面零退化

前端渲染顺序严格为：

```
① 后台配置值（GET /api/v1/content 成功且字段非空）
      ↓ 缺失 / 请求失败 / 后端未启动
② 编译期内置默认值（现有 PRODUCT_CAPABILITIES 文案 + public/assets/cards/card-<id>.jpg）
      ↓ 图片 404
③ CSS 渐变占位（现有 onError 隐藏逻辑保留）
```

**验收判据**：后端完全不启动时，着陆页表现与本 ADR 落地前**逐像素一致**。这是本层的核心安全属性 —— 内容配置层是增强，不是依赖。

### D6 — 注册表驱动：新增槽位 = 后端加 1 行

可编辑表面由 `CONTENT_SLOTS`（`backend/app/content/content_store.py`）统一声明，API 契约 / 校验 / 后台布局 / 「恢复默认」全部从中派生。新增模块的卡片 = 后端注册表加 1 行 + 前端消费面接入覆盖层，无需改端点 / 后台代码 / 测试。

槽位寻址采用 `<module>.<slot>`（如 `landing.story`、`entity_tabs.info`）；DOM class 名与资产文件名沿用裸 key（`story`），由 `slotKey()` 拆点号映射。注册表版本号 `CONTENT_VERSION = 2`；v1 裸 id（`story`）在 `load_content` 时经 `_LEGACY_IDS` 读时迁移为 namespaced id。

### D7 — 运行时覆盖层：同步消费面零退化

针对**同步渲染**的消费组件（`guidanceFor` / `ALL_CAPABILITIES` / `STEPS`），不改其为异步、不改既有单元测试，而是新增 `frontend/src/data/contentRuntime.ts`：内存 overlay + `useSyncExternalStore`，读取时用 `slotTitle / slotDesc / slotItems(slotId, fallback)` 同步取「配置值否则编译期默认」，首调用 `primeContent()` 拉取一次并 re-render 订阅者。

新增 `GET /api/v1/content/defaults` 端点返回纯出厂文档，供「逐卡改回默认」区分「等于默认」与「从未编辑」。三级回退（D5）升级为：① 后台配置值 → ② 编译期注册表默认（`CONTENT_SLOTS` 即出厂值）→ ③ CSS 占位。`primeContent()` 失败静默回退编译期默认，故后端不启动时页面零退化（D5 核心判据保持）。

---

## 3. Consequences

### 正面
- PO 可自主替换配图与文案，无需工程介入，产品表达迭代周期从「小时」降到「秒」。
- 图片脱离 git，仓库体积不再随内容迭代增长。
- 与分支解耦，切换分支不影响已配置内容。
- 零新依赖，冻结基线的依赖红线完好。

### 负面 / 已接受的成本
- 着陆页新增一次 `GET /api/v1/content` 网络往返（已用 D5 回退把失败代价降为零，且可缓存）。
- 无鉴权 —— 明确限定为本地/单机场景，生产多用户部署前须另开 Gate。
- 内容不入 git，无版本历史。首版接受（`updated_at` 字段留追溯锚点），后续若需版本化再另议。

### 对冻结基线的影响

| 红线 | 是否触碰 | 说明 |
|---|---|---|
| 无 DB（PG/Neo4j/ES/ORM） | ❌ 未触碰 | 纯 JSON 文件 |
| 无新依赖 | ❌ 未触碰 | 仅 stdlib `json` / `base64` / `hashlib` / `os` |
| 无登录/权限 | ❌ 未触碰 | 环境变量门控，非鉴权系统 |
| AI/LLM 仅限 ai_gateway | ❌ 未触碰 | 本层无任何 AI 调用 |
| ENTITY=8 / RELATIONSHIP=20 | ❌ 未触碰 | 不涉及枚举 |
| API 向后兼容 | ✅ 保持 | 纯新增端点，既有契约零改动 |
| 改动只增不改 | ✅ 保持 | `ProductIntro.tsx` 为唯一改造点，默认值原样保留 |

---

## 4. Freeze Revision Gate — 白名单申请

```
backend/app/content/                        (新目录：内容配置模块)
backend/tests/test_content_config.py        (其单元测试)
backend/app/main.py                         (已在白名单：仅新增一行 include_router)
frontend/src/data/contentApi.ts             (新：内容 API 客户端)
frontend/src/pages/admin/                   (新目录：后台界面)
frontend/src/components/shell/ProductIntro.tsx  (改造：接内容源 + 三级回退)
frontend/src/main.tsx                       (新增 #/admin 分流，App.tsx 零侵入)
frontend/src/styles/admin.css               (新：后台样式)
```

`main.tsx` 分流而非改 `App.tsx`，是为了**把与 `phase5/reconstruction` 并行开发的冲突面降到最小** —— 他人正在 `App.tsx` 上持续提交。

---

## 5. Verification

- [x] `node scripts/freeze-check.mjs` 全绿（本 ADR 14 个文件零新增违规；另有 1 条 `backend/app/core/exploration.py` 历史遗留 D 级违规，非本 ADR 引入、待 PO 定夺）
- [x] `tsc --noEmit` 零错误
- [x] `pytest backend/tests/test_content_config.py` 全绿（28 passed，含 namespaced id / modules / items / legacy 迁移 / defaults 端点覆盖）
- [x] 前端 16 测试全过（EntityTabGuidance / AICapabilities / ExplorationFlowGuide）
- [x] 后端**不启动**时着陆页与改造前一致（D5 核心判据，`contentRuntime` 静默回退编译期默认）
- [x] `ADMIN_ENABLED` 未设置时写接口返回 403
- [x] 上传非白名单扩展名 / 超限文件被拒（`test_upload_*` 覆盖）
- [x] 视觉合规：零 emoji、Lucide 风格 2px 描边图标、无紫粉渐变（VS-04）

---

## 6. Open Questions

- **OQ-1**：主题包封面（`assets/packs/`）是否纳入第二批？倾向纳入，但需先确认包 slug 与封面的绑定关系是否稳定。→ 挂账，未决。
- **OQ-2**：是否需要「重置为默认值」按钮？→ 已实现：全局「恢复出厂」+ 逐卡「改回默认」（diff `/content/defaults`）。
- **OQ-3**：内容是否需要双语（对齐 ADR-0020）？首版仅中文；纳入 i18n 需与 ADR-0020 数据层协同，另开条目。

---

**PO 签署**：翔哥（经对话授权 "按你推荐的来吧"，2026-08-10）  **日期**：2026-08-10
