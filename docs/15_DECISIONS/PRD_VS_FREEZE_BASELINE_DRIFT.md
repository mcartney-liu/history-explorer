# PRD vs Freeze Baseline 差异登记

> M80 Gate B Decision 4（DB-B11 / DB-B12）— 采纳 A：Gate E 产品侧判定前先补"差异登记"，只记录事实与决策状态，不做取舍。
> 日期：2026-08-14 ｜ 整理：小梦（执行引擎）｜ 依据：HEALTH_AUDIT_v1.1_GATE_B §2.9 / §5 B-11/B-12 / §8 DB-B11/DB-B12

## 0. 目的

登记 PRD 原始设计与 Freeze Baseline 之间的两处断层（空间维度、时间轴深度），**仅记录事实 + 当前决策状态**，不替产品侧做取舍。产品决策（Gate E）前此登记为唯一权威事实源。

## 1. 断层一：空间（GIS）维度

| 维度 | PRD 原文（行号） | Freeze Baseline 事实 | 当前状态 |
|---|---|---|---|
| 核心理念 | §1.3 L28「知识图谱 + AI + 时间 + **空间**」 | — | PRD 列为四大支柱之一 |
| 疆域地图 | §7.4 L287 | `CURRENT_ARCHITECTURE_BASELINE.md:35`「**No GIS**」 | 显式排除边界 |
| 战争地图 | §7.4 L288 | 同上 + :17/:51/:93/:100/:116 四处重申 | 显式排除 |
| 城池地图 | §7.4 L289 | 后端 GIS 代码零命中；前端 deps 仅 react/react-dom，无 leaflet/mapbox/d3-geo | 显式排除 |
| 热力地图 | §7.4 L290 | 同上 | 显式排除 |
| 架构图 | §5 L155 `[Map Service]` | 与 No GIS 冲突，无第三份文档调和 | 未登记调和 |

**决策状态**：空间维度 = **推迟至 Freeze Revision Gate 之后**（非放弃、非当前目标）。此前无任何文档记录此推迟，本登记补齐该治理空白。产品侧（Gate E）须就「永久放弃 / 推迟 / 降级为非目标」三选一正式拍板。

## 2. 断层二：时间轴深度

| PRD 条目 | PRD 原文 | 当前真实状态 |
|---|---|---|
| 个人时间轴 | §7.3 L282 | **部分** — `TimelineIndex.get_by_year` / `get_range` 可支撑 |
| 世界同步时间轴（跨文明对比） | §7.3 L283 | **缺失** — 后端无跨 topic 时间聚合结构 |
| 朝代时间轴 | §7.3 L284 | **缺失** |
| 时间导航滑块（同步更新地图与 Entity） | §7.3 L285 | **缺失**（且依赖已排除的 GIS） |

**架构事实**：`TimelineIndex` 仅 46 行，按 topic 单独构造（`KnowledgeService.get_timeline_index(topic)`），无跨 topic 聚合 API；前端 `MultiEntityTimeline` 数据来源待 Gate D 核验（前端自聚合 vs 单实体渲染）。
**决策状态**：世界同步 / 朝代 / 时间导航三类属**架构级新增**（非小改），是否仍是产品目标待 Gate E 判定。

## 3. 引用

- `docs/00_VISION/original/History_Explorer_PRD_v1.0.docx`
- `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`
- HEALTH_AUDIT_v1.1_GATE_B §2.9 / §5 B-11/B-12 / §8 DB-B11/DB-B12
- PO_DECISIONS_2026-08-08 §3 D4
