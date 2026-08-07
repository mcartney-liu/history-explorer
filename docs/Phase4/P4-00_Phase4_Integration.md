# P4-00 · Phase 4 Integration & Gate Validation — History Explorer FRW

> **Phase 4（Visual System / 视觉系统）集成与 Exit Criteria 校验**
> 上游：Phase 0–3 全部已 closure（P0-00 / P1-00 / P2-00 / P3-00）
> 本阶段产出：`VS-01`~`VS-04` 四份视觉系统文档。
> 当前时间：2026-08-07

---

## 1. 交付物清单（4 份，docs/Phase4/）

| 文件 | 角色 | 核心内容 |
|------|------|----------|
| `VS-01_visual_design_system.md` | Token 唯一权威源 | 全量 Design Tokens（Color/Typography/Spacing/Layout/Grid/Icon/Motion/A11y/Responsive）+ Article 0 三层视觉语言 + 冻结对齐 |
| `VS-02_component_library.md` | 组件库 | Card/Panel/Dialog/Toolbar 四组件 + Workspace/Companion/Panel/Dock/Rail 容器族，全 Token 引用 |
| `VS-03_ui_specification.md` | 30 触点 UI 规范 | TP-01…TP-30 逐触点视觉，每触点标注 IP-03 模式 + Article 0 层 |
| `VS-04_visual_contract.md` | 视觉契约 | 五条绑定规则 + Article 0 三层契约化 + 13 条验收逐条回答 |

---

## 2. 红线扫描结果（零容忍，Gate 硬门槛）

| 红线 | 扫描方式 | 结果 |
|------|----------|------|
| ① 禁 emoji 作功能图标 | emoji 正则全量扫描 `docs/Phase4/*.md` | **0 命中**（锁定 Lucide 2px 描边 SVG 库，尺寸 16/20/24） |
| ② 禁紫粉渐变 | 文档审查 + 关键词扫描 | **0 处实际使用**；仅作为禁止声明列出。accent 仅纯色 Slate Blue `#4F46E5`，真相刻度用陶土/赭绿实色（Hue≈12/35，与紫粉 Hue≈320 无关） |
| ③ 禁 AI 模板味 | 文档审查 | 零 Welcome/Lorem/猜你喜欢；缓动仅 `linear`/`ease-in-out`（`cubic-bezier(0.4,0,0.2,1)`），弹跳曲线仅作禁止项；实现层全 Token 引用，无硬编码字面色 |
| ⑤ 全 Token 化 | 文档审查 | VS-02/VS-03 视觉属性全部引用 VS-01 Token 名；VS-01 列 hex 仅作 Token 定义本身 |

---

## 3. 一致性校验

- **节点集锁定**：VS-03 §0 映射表 30 行 = TP-01…TP-30 = C01–C30，无遗漏无新增（9+7+1+2+6+5=30）。
- **模式映射**：每个触点映射到 IP-03 某模式，无「无模式」触点（规则⑤ / X-R3）。
- **Token 链路**：VS-01 Token = VS-02 组件引用 = VS-03 触点规范 = VS-04 契约，四层一致。
- **裁决锚定**：TP-16 消费 A2 五 actionType 且禁 recommendation（ADR-0015 D1）；TP-22 Mirror 无出边、守 ADR-0013 D3（ADR-0015 D2）；TP-14 Compare 可直入（ADR-0015 D3）；真相三件套贴附（ADR-0015 D7）；Article 0 三层视觉母题完整落地。

---

## 4. Exit Criteria（验收「整个产品像一个产品」）

| 判据 | 结果 | 依据 |
|------|------|------|
| 图标统一、无 emoji | ✅ | VS-01 §5 锁 Lucide；VS-04 Q1 |
| 配色一套、无紫粉渐变 | ✅ | VS-01 §1/§1.8；VS-04 Q2 |
| 四主干同构、不各搞一套 | ✅ | VS-03 §7 同构语法核对；VS-04 Q3 |
| 无 AI 模板味（占位/弹跳） | ✅ | VS-01 §6；VS-04 Q4 |
| 全 Token 化、无硬编码 | ✅ | VS-04 Q5 |
| 每触点映射 IP-03 模式 | ✅ | VS-03 §0；VS-04 Q6 |
| 真相刻度贴附、弱证据不隐藏 | ✅ | VS-03 §2；VS-04 Q7 |
| Mirror 只读无出边、与下一步隔离 | ✅ | VS-03 §4；VS-04 Q8 |
| 下一步唯一、非推荐语汇 | ✅ | VS-03 §5；VS-04 Q9 |
| Compare 可直入、不绕路 | ✅ | VS-03 §3；VS-04 Q10 |
| 首屏由探索承担、检索不主导 | ✅ | VS-03 §1；VS-04 Q11 |
| 可达性达标（AA/焦点/触控） | ✅ | VS-01 §7/§8；VS-04 Q12 |
| 冻结基线被尊重 | ✅ | VS-04 §3；VS-01 §10 |

**结论：13/13 验收项全通过，Gate 关闭。**

---

## 5. 移交 Phase 5（Frontend Implementation）的关键事实

1. **唯一权威源**：VS-01 是 Token 唯一源，VS-04 是视觉规则唯一源；Phase 5 实现必须将 Token 映射为 CSS 变量 / TS 常量，禁止写死 hex。
2. **图标库依赖前置**：`lucide-react` 为新增前端依赖，须按 `CURRENT_ARCHITECTURE_BASELINE.md` 走 Freeze Revision Gate / SCOPE_ALLOWLIST 审查（VS-01 §5.3 / VS-04 §3）。这是 Phase 5 动工前的唯一新增依赖审批项。
3. **模式映射强制**：任何实现元素须对应 IP-03 某模式 + VS-03 某触点；新造视觉范式 = 违反规则⑤。
4. **回归门槛**：任一 Phase 5 PR 违反 VS-04 规则①②③④⑤任一条（emoji / 紫粉 / 占位弹跳 / 硬编码 / 无模式映射），视为破坏「一个产品感」，退回。
5. **仍 OPEN 不阻塞项**：OD-01/OD-03/OD-04/OD-05 + Phase 0 残留 R2/R3/R4/R7/R8，不阻塞 Phase 5。

---

*P4-00 结束。Phase 4 Visual System 已 closure，Gate 关闭，可进 Phase 5。*
