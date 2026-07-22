# M9-000 Planning Baseline

> M9 生命周期唯一规划入口。本文件在 M8.8 Documentation Architecture Governance 完成后建立。
> 本文档为规划基线，仅描述范围、目标与约束；具体实施见后续 M9-001…M9-006 任务文档。

## 1. Milestone Overview

- **Milestone**: M9-000
- **Theme**: Exploration Flow Enhancement
- **Purpose**: 在冻结架构边界内，让 History Explorer 的"无限探索"体验真正形成闭环。
- **Current Version**: v0.10.1
- **Previous Milestone**: M8.8 Documentation Architecture Governance
- **Status**: PLANNING

## 2. Current Product State

### 已完成

- Knowledge Core（内存知识核心）
- Global Graph（全局关系图）
- Deterministic Exploration Engine（确定性探索引擎）
- Four-dimensional scoring（四维评分）
- Five-Zone UI（五区界面）
- Timeline layer（时间轴层）
- Theme layer（主题层）
- Cross-topic relations（跨主题关系）

### 当前数据规模

- 8 topics
- 69 entities
- 104 relations
- 31 cross-topic edges

### 说明

当前系统已经具备历史知识探索基础，但用户探索循环尚未达到产品 DNA 中定义的 "Infinite Exploration"。引擎能够产出可解释的关系与评分，但"从一处出发、连续抵达下一处"的探索闭环在体验层仍未真正落地。

## 3. Problem Statement

当前主要问题不是基础架构，而是探索深度：

1. 用户阅读一个实体后缺少明确下一站。
2. Related Entities 只是列表，不形成探索路径。
3. 跨主题关系价值没有充分释放。
4. 数据规模限制探索网络密度。

## 4. M9 Theme

正式定义：

**M9 = Exploration Flow Enhancement**

核心目标：

让用户从：

**Read One Historical Entity**

进入：

**Discover → Explore → Connect → Continue**

形成连续探索循环。

## 5. Scope

### M9-001 Deterministic Next-Node Recommendation Engine

- **目标**：基于现有 Exploration Engine，提供可解释的下一站推荐。
- **约束**：
  - deterministic only
  - no AI
  - no LLM
  - no new dependency
  - existing schema only

### M9-002 Infinite Exploration Flow UI

- **目标**：增强 Five-Zone UI：
  - Continue Exploration
  - Next Destination
  - Related Path
- **原则**：Click-to-Explore。

### M9-003 Exploration Path Navigator

- **目标**：记录用户探索路径：`A → B → C`。
- **支持**：
  - 当前路径展示
  - 返回探索节点
  - local state

### M9-004 Data Breadth Expansion

- **目标**：扩大历史数据覆盖。
- **限制**：
  - 允许：增加 entity、增加 relation instance
  - 禁止：修改 ENTITY_TYPES、修改 RELATIONSHIP_TYPES、修改 schema

### M9-005 Theme & Cross Topic Enhancement

- **目标**：增强：
  - Themes
  - Civilization connection
  - Cross-topic interpretation

### M9-006 Documentation Freshness Hygiene

- **目标**：修复：
  - README version drift
  - PROJECT_CONTEXT version drift
- **建立** Release checklist：每次 release 必须同步：
  - README
  - PROJECT_CONTEXT
  - CHANGELOG
  - Tag

## 6. Non Goals

M9 不包含、明确禁止：

- AI runtime
- LLM
- RAG
- GIS
- Map rendering
- Neo4j
- PostgreSQL
- Elasticsearch
- Login system
- Account system
- Permission system
- Schema enum changes
- New dependency

上述禁项约束来源见 `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`。

## 7. Freeze Compliance

M9 所有工作必须满足：

- Freeze Baseline unchanged
- Schema unchanged
- Dependency unchanged
- Runtime architecture unchanged

任何违反必须：

**ADR + Freeze Revision Gate**（见 `docs/15_DECISIONS/ADR_TEMPLATE.md` 与 `CURRENT_ARCHITECTURE_BASELINE.md`）。

## 8. Milestone Plan

- **Phase 1**: Recommendation Foundation (M9-001)
- **Phase 2**: Exploration Flow UI (M9-002)
- **Phase 3**: Path Navigation (M9-003)
- **Phase 4**: Data Expansion (M9-004)
- **Phase 5**: Documentation Hygiene (M9-006)

> M9-005（Theme & Cross Topic Enhancement）为可选项，依赖 M9-001 推荐数据，可并入 Phase 2–4 增量交付。

## 9. Success Criteria

### 用户侧

- 可以从任意实体继续探索
- 推荐结果具有解释性
- 探索路径连续
- 跨主题发现增加

### 技术侧

- freeze-check 通过
- tests 通过
- no new dependency

## 10. Risks

1. **推荐算法复杂度增加**
   - Mitigation: 保持 deterministic。
2. **数据扩展导致质量下降**
   - Mitigation: maintain validation（保持 0 warnings 校验）。
3. **UI 复杂度增加**
   - Mitigation: incremental delivery（增量交付）。

## 11. Decision Record

- **方向来源**：M9-000 Planning Baseline Analysis（Phase 0–4 只读分析）
- **Decision**: Exploration Flow Enhancement
- **ADR**: 暂不需要（当前范围完全处于冻结边界内，无架构变更）。

---

*Baseline established: 2026-07-22. Status: PLANNING. Awaiting M9 implementation phase approval.*
