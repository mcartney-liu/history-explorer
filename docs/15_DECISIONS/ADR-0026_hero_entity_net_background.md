# ADR-0026: 首页 Hero 实体点阵氛围背景（Freeze Revision Gate）

## ADR Number

ADR-0026

## Title

首页"了解"大标题区实体点阵氛围背景 — Frontend Freeze Revision Gate（components/visual/）

## Status

Accepted

## Context

设计冻结期（M3.5 Schema Freeze + Team Operating Spec v1.2）下，首页"了解"大标题区
新增一层**纯视觉氛围背景**：漂浮的实体点阵（点 = 真实实体名，鼠标靠近"探照灯"式点亮显示
名字，无连线）。该功能落在冻结期尚未预见的新目录 `frontend/src/components/visual/` 下，
不在 `scripts/freeze-check.mjs` 的 `SCOPE_ALLOWLIST` 中，因此任何提交都会触发 M3.5 Freeze
Guard 的 D-class scope 违规。

这触及"Current Architecture Freeze Baseline"的前端范围边界（新增前端目录），按仓库治理要求
必须走 Freeze Revision Gate（ADR + PO 批准）。PO 翔哥于 2026-08-16 审阅改动并批准放行。

## Decision

- 在 `scripts/freeze-check.mjs` 的 `SCOPE_ALLOWLIST` 中新增目录前缀
  `"frontend/src/components/visual/"`（单一前缀覆盖该目录全部文件，含未来同类纯视觉组件）。
- 接受该工作树变更，共 5 个文件：
  - `frontend/src/components/visual/EntityNetBackground.tsx`（**新建**，~195 行）：纯 canvas
    视觉组件，零依赖；点 = 真实实体名、无连线、探照灯式点亮、自发浮动、`pointer-events:none`
    不挡下方卡片点击；仅作氛围，不参与任何业务逻辑 / 导航 / 数据读写。
  - `frontend/src/pages/DiscoverPage.tsx`：接入背景层，将真实实体名（主题标题 + 所有探索起点）
    传入，并把大标题文案包一层浮于背景之上。
  - `frontend/src/App.css`：hero 区定位与 z-index 调整，背景层绝对铺满、文案层浮起。
  - `frontend/src/components/shell/ProductIntro.tsx`：整块内容包一层 `discover-intro-content`
    容器，浮于背景层之上（逻辑不变，纯缩进包裹）。
  - `frontend/src/App.tsx`：去掉传给 `ProductIntro` 的 `topics` 属性（背景改用 DiscoverPage
    自行计算的实体名，ProductIntro 不再需要 topics）。
- 守住红线（逐条核验）：
  - **零新依赖**：纯原生 canvas 手写，未引入任何库。
  - **Relationship Layer 仅可视化**：明确"无连线、不建边、不做推理/因果"，点仅作装饰。
  - **Article 0 真相层**：点为真实实体名（取自平台已有数据），不造假。
  - **不参与业务逻辑**：`pointer-events:none`，不读不写数据、不改导航。
  - **不碰禁区技术栈**：Neo4j / PG / ES / RAG / GIS / Flutter / 登录 / 权限 / AI-LLM 全未涉及。
- 无 backend / schema / enum / runtime-version / dependency 变更；`frontend/package.json`
  版本保持不变。

## Alternatives

- **暂缓不提交（保留在工作树）**：rejected —— 该改动是经 PO 审阅、低风险的纯视觉增强，长期
  留在未提交状态无意义，且会持续干扰后续每次提交（误报 scope 违规）。
- **不新建 `visual/` 目录，把组件塞进已 allowlisted 的 `components/discover/` 等子目录**：
  rejected —— "视觉氛围层"在语义上独立于具体业务页面，独立成 `visual/` 更清晰；且"新建目录
  登记进白名单"正是 Freeze Revision Gate 的正当用途，混放反而模糊边界、未来同类组件无处安放。

## Consequences

- `scripts/freeze-check.mjs` 转绿（`components/visual/` 已登记，EntityNetBackground.tsx 匹配
  目录前缀）。
- `CURRENT_ARCHITECTURE_BASELINE.md` **无需修订**：仅 allowlist 枚举变化，不变量
  （ENTITY_TYPES / RELATIONSHIP_TYPES / 零新依赖 / AI runtime 仅限 ai_gateway）不变。
- 今后同类纯视觉组件可直接落入 `frontend/src/components/visual/`，无需再次 Gate。
- 已知非阻塞项：组件当前渲染全部实体名且每帧重绘、未设数量上限；当前首页量级（主题标题 +
  探索起点，几十到一两百）可忽略，若未来实体规模涨至数千再补上限即可。

## Related Freeze Revision

- Freeze Revision Gate: Yes
- Product Owner approval: 2026-08-16（PO：翔哥）
- Linked docs: `scripts/freeze-check.mjs`（SCOPE_ALLOWLIST）、
  `docs/15_DECISIONS/ADR-0026_hero_entity_net_background.md`
