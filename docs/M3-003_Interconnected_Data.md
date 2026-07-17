# M3-003 Interconnected Data — Implementation Report

> 角色：Senior Knowledge Engineer + Historical Data Architect + Full-Stack Engineer
> 日期：2026-07-16
> 目标：把 History Explorer 从「两个孤立历史主题」升级为「一个互相连接的历史世界网络」
> 约束守约：不动 M3-001 Knowledge Layer 架构、不动 Repository、不动 API endpoint、不动前端、不引入 Neo4j/AI/GIS/新依赖、不改 schema 字段形状。

---

## 1. 本轮完成内容（修改文件列表）

### 数据（新增 + 修订，纯数据、不改字段形状）
- **新增** `data/examples/hellenistic_world_example.json` — 希腊化世界主题（8 实体 / 11 关系 / 2 时间线）
- **新增** `data/examples/silk_road_example.json` — 丝绸之路主题（6 实体 / 6 关系 / 2 时间线）
- **修订** `data/examples/roman_empire_example.json` — 新增实体 `roman_egypt`；连接孤立的 `tp-27bc`；新增 2 条跨主题边（→ 希腊、→ 丝路）
- **修订** `data/examples/egypt_technology_religion_example.json` — 修复 `Kemet` 重复别名（从 `loc-ancient-egypt` 移除，仅保留在 `civ-egypt`）

### 代码（唯一非纯数据改动：Validation Layer，非 Knowledge Layer）
- **修订** `backend/app/validation.py` — `validate_cross_references` 增加 `global_id_universe` 参数，`build_validation_report` 现在把**所有主题 global_id 的并集**传入。效果：以 `namespace:id` 形式写在他主题的边，只要目标 global_id 在任何主题存在，即被视为**有效引用**，不再误判 `RELATIONSHIP_DANGLING_*`。
  - 合法性说明：M3-003 禁止清单**未**包含 Validation Layer；且这与 M3-001「Validation 消费 KnowledgeService、跨主题解析」的设计意图一致。Knowledge Layer（`core/`）一字未动。

### 测试（新增）
- **新增** `backend/tests/test_interconnected.py` — 8 个用例：全局 id 跨主题解析、跨主题边存在性、Rome 可达 Egypt/China 的网络遍历、两条 demo 路径、`/health` 计数与零警告。
- **修订** `backend/tests/test_core.py` / `test_validation.py` — 既有硬契约测试的真实数据计数从 `2/11/8/3` 更新为 `4/26/29/7`，并断言两个历史 warning 已消除。

---

## 2. 数据架构变化

| 维度 | M3-002 终态 | M3-003 终态 |
|---|---|---|
| Topics | 2（孤立） | **4（互联）** |
| Entities | 11 | **26** |
| Relationships | 8 | **29** |
| Timeline | 3 | **7** |
| 跨主题边 | 0 | **6** |
| `/health` warnings | 2（Kemet / tp-27bc） | **0** |

数据网络拓扑（用户点击一个文明，可自然走向另一个）：

```
Ancient Egypt ──(conquered/related)──> Hellenistic World ──(influenced)──> Roman Empire
     ▲                                      │  (Ptolemaic Egypt bridge)
     │                                      └──────────(traded_with)──> Silk Road ──> Han China
     └──(part_of)── Ptolemaic Egypt <──(related_to)── Roman Egypt <──(part_of)── Roman Empire
```

---

## 3. 跨主题关系设计（6 条，全部用 `namespace:id`）

| # | 源（global_id） | 关系 | 目标（global_id） | 所在文件 | 历史意义 |
|---|---|---|---|---|---|
| 1 | `hellenistic_world:person-alexander` | influenced | `egypt_technology_religion:civ-egypt` | hellenistic_world | 亚历山大征服埃及，希腊化开始 |
| 2 | `hellenistic_world:civ-ptolemaic-egypt` | related_to | `egypt_technology_religion:civ-egypt` | hellenistic_world | 托勒密埃及继承自法老埃及 |
| 3 | `hellenistic_world:civ-ptolemaic-egypt` | related_to | `roman_empire:roman_egypt` | hellenistic_world | 托勒密埃及 → 罗马埃及（克利奥帕特拉后） |
| 4 | `roman_empire:civ-roman` | influenced | `hellenistic_world:civ-greek` | roman_empire | 罗马文明深受希腊影响 |
| 5 | `roman_empire:civ-roman` | traded_with | `silk_road:silk_road` | roman_empire | 罗马经丝路与东方贸易 |
| 6 | `silk_road:silk_road` | traded_with | `roman_empire:civ-roman` | silk_road | 丝路连通罗马与汉（反向全球引用） |

关系类型**全部复用既有 schema 类型**（`influenced` / `related_to` / `traded_with` / `part_of` / `ruled` / `located_at` …），未新造类型。

> 命名约定：既有主题 `roman_empire` / `egypt_technology_religion` 的 global_id 命名空间沿用其文件名（如 `roman_empire:civ-roman`）；新主题同理（`hellenistic_world:*`、`silk_road:*`）。`namespace` 为不透明唯一串，注册表按精确串解析。

---

## 4. 探索演示路径（已用测试证明可达）

**路径 A — Egypt → Greece → Rome**
```
Roman Empire (roman_empire:civ-roman)
   └─ part_of → Roman Egypt (roman_empire:roman_egypt)        [单主题图内可达]
        └─ related_to → Ptolemaic Egypt (hellenistic_world:civ-ptolemaic-egypt)  [跨主题, 经注册表解析]
             └─ ruled → Cleopatra (hellenistic_world:person-cleopatra)
             └─ related_to → Ancient Egypt (egypt_technology_religion:civ-egypt) [跨主题]
        └─ influenced → Alexander (hellenistic_world:person-alexander) [跨主题]
             └─ related_to → Greek World (hellenistic_world:civ-greek)
```

**路径 B — Rome ↔ China**
```
Roman Empire (roman_empire:civ-roman)
   └─ traded_with → Silk Road (silk_road:silk_road)           [跨主题]
        └─ traded_with → Han Dynasty (silk_road:han_dynasty)  [单主题图内]
```

测试 `test_rome_reaches_egypt_and_china_via_network` 以 BFS 证明：从 `roman_empire` 出发，经由跨主题边可达 `egypt_technology_religion`、`hellenistic_world`、`silk_road` 全部三个其他主题。

---

## 5. 测试结果

| 套件 | 结果 |
|---|---|
| 后端 pytest | **76 passed**（原 68 + 新增 `test_interconnected.py` 8） |
| 前端 vitest | **38 passed**（未改动前端） |
| 前端 build | **51 modules · 0 error** |

`/health` 响应（readiness）：
```
Topics: 4 | Entities: 26 | Relationships: 29 | Timeline: 7
Warnings: 0 | Errors: 0
Status: healthy   ("✓ All checks passed - data is clean.")
```

两个历史 warning 处置：
- **Kemet 重复别名** → 真实数据质量问题，**已修复**（移除 `loc-ancient-egypt` 的 `Kemet` 别名）。
- **tp-27bc 孤立 Time Period** → 合理但易修，已通过 `event-roman-empire-established — related_to — tp-27bc` 接入，消除孤立。

---

## 6. 风险与后续建议

### 6.1 已发现的关键边界（务必知悉）
- **单主题图不跨主题**：`KnowledgeService.find_related` / `get_graph` 是 M3-001 设计的 **per-topic 邻接**；跨主题 `global_id` 边在构图时被跳过（dropped as dangling-by-design）。因此「点击罗马 → 在邻居列表里直接看到埃及」在**图层面**目前做不到。
- **但注册表层已完整互联**：`find_by_global_id` / `resolve_entity` + 关系数据能完整解析跨主题网络（测试已证明 Rome→Egypt、Rome→China 可达）。数据基础已就位。
- **影响**：前端若要在 UI 上展示「跨主题邻居」，需在 Knowledge Layer 新增 **GlobalGraph**（`core/` 内，基于现有 per-topic 图 + `resolve_entity` 合并跨主题边）与 `find_related_global(...)`，保持 Additive、不改公共 API 形状、不动 Repository。建议作为 **M3-004 / M3-005** 的 Knowledge Layer 增强。已记入 `docs/SUGGESTIONS.md` §O7。

### 6.2 其它
- 数据量与关系均为「真实历史连接、非为测试编造」，规模克制（满足 ≥3 topic / ≥20 entity / ≥5 跨主题边，未过度扩张）。
- 未提交 git（延续「统筹考虑」约定）；所有 M2/M3 改动待统一排期。
- 版本号仍 `0.1.0`（bump 至 `0.2.0-alpha` 留待 M3-006 Release）。

---

## 7. 验收标准对照

- ✅ Topics ≥ 3 → **4**
- ✅ Entities ≥ 20 → **26**
- ✅ Cross-topic edges ≥ 5 → **6**
- ✅ 跨主题关系用 `global_id`，禁止裸本地 id 跨主题引用
- ✅ `find_by_global_id` 跨主题解析（测试 1）
- ✅ 跨主题可达性（测试 2/3）
- ✅ 跨主题边不被判 dangling（`/health` 0 error，测试 4）
- ✅ 探索演示路径（路径 A / B，测试 3/4）
- ✅ 文档更新（`M3-003_Interconnected_Data.md` + `SUGGESTIONS.md` G4=Implemented / O2=Implemented / O7=新增）
- ✅ 全部测试通过
- ✅ 未提交 git

M3-003 成功标准已达成：**用户点击一个文明，可以自然走向另一个文明**的数据基础与解析能力已经建立；「原来世界是连接的」的探索感，待 M3-005 Graph UI 在视觉上闭环。
