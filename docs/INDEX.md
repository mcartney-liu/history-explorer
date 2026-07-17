# History Explorer — 文档索引（INDEX）

> 用途：新人进入项目后，从这里快速定位所有核心文档。
> 维护原则：只索引真实存在的文档；不存在的文档不编造，相关主题指向其实际所在文件。
> 最后更新：2026-07-15（M2-006 Documentation Sync）。

---

## 1. Project（项目总览）

| 文档 | 说明 |
|------|------|
| [README.md](../README.md) | 项目入口、产品定位、当前阶段状态 |
| [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) | 项目背景与当前阶段上下文 |
| [PROJECT_CHARTER.md](../PROJECT_CHARTER.md) | 项目章程（目标 / 边界 / 原则） |
| [PROJECT_ROADMAP.md](../PROJECT_ROADMAP.md) | 里程碑路线图（M1 → M2 → M3） |

## 2. Product Design（产品设计）

| 文档 | 说明 |
|------|------|
| [PRD.md](../PRD.md) | 产品需求文档 |
| [Product_DNA.md](../Product_DNA.md) | 产品基因（核心主张：Everything Connected / AI As Guide） |
| [Product_Constitution.md](../Product_Constitution.md) | 产品宪章 |
| [Product_Architecture.md](../Product_Architecture.md) | 产品结构（含阶段化文档状态） |
| [MVP_Scope.md](../MVP_Scope.md) | MVP 范围（部分能力 defer 到后续阶段） |
| [Information_Architecture.md](../Information_Architecture.md) | 信息架构 |
| [Navigation_Model.md](../Navigation_Model.md) | 导航模型 |
| [User_Journey.md](../User_Journey.md) | 用户旅程 |
| [Discovery_Model.md](../Discovery_Model.md) | 发现模型 |
| [Exploration_Strategy.md](../Exploration_Strategy.md) | 探索策略 |
| [Exploration_Path.md](../Exploration_Path.md) | 探索路径 |
| [Visualization_Principles.md](../Visualization_Principles.md) | 可视化原则（含 Avoid Overload） |
| [Recommendation_Principles.md](../Recommendation_Principles.md) | 推荐原则 |

## 3. Architecture（技术架构）

| 文档 | 说明 |
|------|------|
| [Technical_Architecture.md](../Technical_Architecture.md) | 技术架构（含知识模型与数据层边界，架构已冻结） |
| [System Design](../Technical_Architecture.md) | 系统设计内容并入 Technical_Architecture（未单列 System Design 文档） |

## 4. Data（数据 / 知识模型）

| 文档 | 说明 |
|------|------|
| 知识模型（Knowledge Model） | 定义并入 [Technical_Architecture.md](../Technical_Architecture.md)（实体泛型化 / 关系三元组 / 扁平时间线）；v2 规划见 `docs/SUGGESTIONS.md` §I |
| 数据 Schema / 示例 | `data/examples/{topic}_example.json`（当前示例：`roman_empire_example.json`、`egypt_technology_religion_example.json`）；Schema 定义见 `data/schemas/exploration_schema.md`（已落地 v2：7 实体类型 / 结构化时间 / global_id / 关系元数据 `citation`） |

## 5. API（接口）

| 文档 | 说明 |
|------|------|
| [exploration_api.md](api/exploration_api.md) | 接口契约（v2.1）：`GET /explore/{topic}`、`GET /search`、`GET /entity/{id}`、`GET /health` |

## 6. Review（评审）

| 文档 | 说明 |
|------|------|
| [M1_Final_Assessment.md](../M1_Final_Assessment.md) | M1 收口评估总报告（六轮评审汇总 + Closure 计划） |
| [SUGGESTIONS.md](SUGGESTIONS.md) | AI 建议汇总 Backlog（持续累加，含 M1-001~M1-006 全部建议与 M-H1~M-H9 加固清单） |
| [INTEGRATION.md](INTEGRATION.md) | 集成说明 |

## 7. Development（开发）

| 文档 | 说明 |
|------|------|
| [DEVELOPMENT.md](../DEVELOPMENT.md) | 开发指南（启动前端 / 后端） |
| [DEVELOPMENT_ENVIRONMENT.md](../DEVELOPMENT_ENVIRONMENT.md) | 开发环境说明 |
| Testing（测试） | 后端 `backend/tests/`（pytest：`test_explore.py`、`test_search_entity.py`、`test_search_index.py`、`test_validation.py`，共 50 例）；前端 `frontend/src/__tests__/`（vitest：`App.smoke`、`M2_003`、`SearchEntity`、`navigation`、`searchNav`，共 38 例）；命令见 `DEVELOPMENT.md` 与各 `package.json` / `requirements-dev.txt` |
| Release（发布就绪） | 见 [M1_Final_Assessment.md](../M1_Final_Assessment.md) §4 阻塞项与 §5 Closure 计划；部署/CI 仍为 M1 债（见 `SUGGESTIONS.md` §L4 / M-H6） |

---

## 8. 文档分类目录说明（docs/0x_*）

`docs/00_Project` … `docs/11_Release` … `docs/99_Decisions` 是**预留的分类归档目录**，
目前多数仅含 `.gitkeep` 占位文件。

- 这些目录用于**未来**按主题归档文档。
- **当前核心文档仍位于仓库根目录与 `docs/` 根目录**（即本索引第 1–7 节所引）。
- 请勿删除 `.gitkeep` 占位；未来归档时再按需迁入，并同步更新本索引。
