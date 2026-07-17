# M3-002 API & Ops Hardening — Architecture Change Log

> 日期：2026-07-16
> 角色：Principal Software Architect + Staff Backend Engineer + Tech Lead
> 性质：**Ops / API Hardening（非功能新增，守 M3-001 Knowledge Layer 不动）**
> 目标：版本化路由、配置外部化、统一日志、响应硬化、Health/Healthz 分离；保持公共 API 与前端零破坏、无新依赖、无 Neo4j/AI/GIS。

---

## 1. 本轮完成内容

| # | 项 | 落地 | 契约影响 |
|---|----|------|----------|
| 1 | **API Versioning** | 新增 `/api/v1` 路由体系（explore/entity/search/health/healthz）；原无前缀路由作为**冻结兼容层**保留，前端无需改动 | 无（v1 与 legacy 同一处理函数，响应逐字节一致） |
| 2 | **Configuration Externalization** | 新增 `backend/app/config.py`：`APP_NAME`/`APP_VERSION`/`API_V1_PREFIX`/`CORS_ORIGINS`/`DATA_DIR`/`LOG_LEVEL`/`ENVIRONMENT` 全部读环境变量，默认值与 M3-001 完全一致 | 无 |
| 3 | **Logging** | `print()` 升级为标准 `logging`（统一格式 `时间 级别 [history_explorer] 消息`）；启动 dev 报告与就绪日志走 logger；新增异常日志中间件（仅记录未处理 500，含 traceback） | 无 |
| 4 | **API Response Hardening** | 响应中间件注入 `X-API-Version: v1` 与 `X-Content-Type-Options: nosniff`；**未引入**统一信封（守冻结契约，见 §3 决策） | 无（仅加响应头，body 不变） |
| 5 | **Health vs Healthz** | `/health`（readiness，含数据质量报告）+ `/healthz`（liveness，仅 `{"status":"ok"}`，零重活）；两者在 v1 与 legacy 双挂 | 无 |

---

## 2. 架构变化说明

### 2.1 路由体系（双挂，单源）
`main.py` 把每个 handler 定义为**单一函数**，再用 `APIRouter.add_api_route` 挂到两个 router：
- `v1_router`（前缀 `settings.api_v1_prefix` = `/api/v1`）→ `v1_explore`/`v1_entity`/`v1_search`/`v1_health`/`v1_healthz`
- `legacy_router`（无前缀）→ `explore`/`entity`/`search`/`health`/`healthz`

两个 router 都 `app.include_router(...)`。`operation_id` 显式区分（`v1_*` vs 裸名），OpenAPI 文档无重复 id。前端继续打 legacy 路由即可运行；要切 v1 只需前端拼前缀（见 SUGGESTIONS §P1，可选）。

### 2.2 配置外部化（`config.py`）
纯 `os.environ` + 冻结 dataclass，**零新依赖**（仅 stdlib）。`data_dir` 默认值经修正为仓库根 `<repo>/data/examples`（最初误指 `backend/data/examples` 导致加载空仓，已修）。CORS 由 `CORS_ORIGINS`（逗号分隔）驱动，默认 `http://localhost:5173`。新增 `backend/.env.example` 文档。

### 2.3 日志
`configure_logging()` 在进程启动配置 root logger（幂等，测试/uvicorn 不重复初始化）。启动校验报告与就绪行经 `logger.info` 输出，格式统一。中间件捕获未处理异常并用 `logger.exception` 记 traceback——HTTPException(400/404) 由 FastAPI 内部转响应，不会误报。

### 2.4 Health / Healthz 语义分离
- **Readiness `/health`**：返回 `_VALIDATION_REPORT.to_dict()`（topic/entity/relationship/timeline 计数 + warning/error + 逐主题问题）。有数据质量问题也可返回 200（报告而非崩溃），供就绪判断。
- **Liveness `/healthz`**：仅 `{"status":"ok","service":...,"version":...}`，不触碰数据/校验，供 k8s liveness 重启判定。

### 2.5 响应硬化
中间件为**每个**响应（含错误响应）补 `X-API-Version`、`X-Content-Type-Options` 头，body 完全不改。这是"API Response Hardening"的最小安全落地，且向后兼容。

---

## 3. 关于"统一响应信封"的主动决策（请你确认）

你列了 *API Response Hardening*，并明确"如需统一响应结构，必须保证向后兼容，不允许破坏已冻结 API"。

**我的判断**：M2/M3 已冻结四个端点（`/explore`、`/entity`、`/search`、`/health`）的响应形状，且 `/health` 的 `{status,health,topics,issues}` 结构被 `test_validation.py` 断言。现在引入统一 `{data,error,meta}` 信封**必然改变这些 body**，即便客户端忽略未知字段，也违反"不得破坏已冻结 API"的硬约束。

**建议做法（已落地）**：本轮只做"不破坏 body 的硬化"——响应头版本标识 + `nosniff`。统一信封**显式延后**到专门的 API-evolution checkpoint，届时需支持"旧裸体 + 新信封"双读过渡期。已记入 `docs/SUGGESTIONS.md` §P2。

如果你希望这轮就引入信封（接受过渡期双格式），告诉我，我再补一个 non-breaking 的 v1-only 信封（legacy 路由保持裸体），不碰冻结端点。

---

## 4. 风险说明

| 风险 | 等级 | 缓解 |
|------|------|------|
| 配置默认值路径一度误指 `backend/data/examples` | 已修（高，曾导致空仓/全 404） | 修正为仓库根 `data/examples`；pytest 全绿验证 |
| legacy 路由长期保留造成"两套 API"认知 | 低 | 文档标注 legacy=冻结兼容、v1=canonical；前端切 v1 可选（§P1） |
| 兼容 shim（`_ENTITY_INDEX` 等）冗余 | 低（技术债） | 保留以不破坏 60 个既有测试；清理见 §P3 |
| 统一信封未做 | 低（主动延后） | 见 §3 决策 + §P2 |
| 版本号仍 0.1.0 | 低 | `APP_VERSION` 已外部化；bump 到 0.2.0-alpha 留 M3-006（§P4） |
| 未提交 git | — | 延续"统筹考虑"约定，待统一排期 |

---

## 5. 测试结果

- **后端 pytest：68 passed**（原 60 + 新增 `test_api_v1.py` 8 例）：v1 与 legacy 逐字节一致、invalid topic 400、healthz 存活探针、header 硬化。
- **前端 vitest：38 passed**（未减）；`npm run build`：**51 modules 0 errors**（tsc + vite build 通过）。
- **`/health` 契约零变化**：`2 topics / 11 entities / 8 rel / 3 timeline / 2 warning / 0 error / healthy`，与 M2-005 逐字节兼容。
- **OpenAPI 干净**：11 条路径（含 v1 + legacy + root + healthz），11 个 operationId 无重复。

---

## 6. 文档更新

- 新增 `docs/M3-002_Architecture.md`（本文件）。
- `docs/SUGGESTIONS.md`：§O1 标记 🔵 已实现；新增 §P（P1–P5 后续：前端切 v1 / 统一信封延后 / shim 清理 / 版本号 bump / CHANGELOG）。
- 新增 `backend/.env.example`、`frontend/.env.example`、`frontend/src/vite-env.d.ts`（Vite env 类型）。
- `frontend/src/App.tsx`：`API_BASE` 改为 `import.meta.env.VITE_API_BASE || 'http://localhost:8000'`（默认不变）。

---

## 7. 下一 Checkpoint 建议

按依赖与价值，推荐顺序：

1. **M3-003 Interconnected Data**（首选）：架构已原生支持 `global_id` 跨主题解析（`find_related`/`find_by_alias`）；当前数据 0 条跨主题边，补互联示例数据即可让 `_validate_cross_topic` 真正生效，端到端验证"互联探索"主张。
2. **M3-004 Search v2**：`SearchProvider` 已可替换，扩展 `TimelineIndex` 的 year/century/period 查询、分页、模糊检索。
3. **M3-005 UI Depth**：Graph 可视化（核心 `get_graph`/`find_related` 已就绪），把"连接发现"从列表升级为图。
4. **M3-006 Release & CI**：补齐 CI/Docker、`CHANGELOG`+tag、`APP_VERSION` bump 到 0.2.0-alpha、清理 shim、统一排期提交（结束"统筹考虑"未提交债）。

> 明确不提前实现（全 M4+，经 Repository 接口 + KnowledgeService 读模型 + additive 端点扩展）：AI/LLM、Neo4j、GIS/地图、Recommendation、第三方图库。

*附录：所有 M3-002 改动**未提交 git**（延续"统筹考虑"约定）；后端 Python 3.12、前端 Node 22.22.2 运行环境不变。*
