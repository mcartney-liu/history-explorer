# ADR-0016 · Icon Library — Zero-Dependency Inline SVG (M62) as Locked Unified SVG Icon Library

> Status: **Accepted** (2026-08-07) · PO-approved (翔哥, via Phase 5 动工 + 图标方案抉择)
> Type: Freeze-baseline interpretation / supersedes literal library-name reading of VS-01 §5.1
> Related: VS-01 §5 (Visual Design System · Icon), P0-1 (禁 emoji 作功能图标), ADR-0013 (冻结基线), ADR-0015 D1 (红线解耦), `scripts/freeze-check.mjs`

---

## Background

FRW Phase 4 的 `VS-01_visual_design_system.md` §5.1 将图标库「库名」锁为 **Lucide**（`lucide-react` npm 包），并在 §5.3 明确："引入 `lucide-react` 属新增前端依赖，须走 Freeze Revision Gate / SCOPE_ALLOWLIST 审查"。

但更早的里程碑 **M62（Canonical Icon System）** 已提交 `frontend/src/components/ui/Icon.tsx`（已在 SCOPE_ALLOWLIST `frontend/src/components/ui/` 内）：一套 **零依赖内联 SVG 语义注册表**，特性为：

- emoji-free（语义名 → 内联 `<svg>` 映射，绝不落 emoji）；
- 单一来源、无多库混用；
- 三档尺寸 16 / 20 / 24px；
- 统一描边、矢量可缩放、`currentColor` 着色（天然 token 化）；
- 零新依赖（inline SVG 不引入任何 npm 包）。

## Conflict

- `VS-01 §5.1` 字面要求 Lucide 库名；
- 冻结基线（`ADR-0013` 上下文，被多次强调为**刻意立场、非疏忽**）将「新依赖」列为**不可改硬红线**；
- 项目最高红线 P0-1 只约束行为（禁 emoji / 一套统一 SVG / 16·20·24 / 统一描边 / 可缩放 / 语义明确），**不约束具体库名**。

即：M62 注册表已**满足 P0-1 全部要求**，而引入 Lucide 需为「零依赖」红线开一次例外缺口。

## Decision

**采用 M62 内联 SVG 注册表作为本产品的「锁定统一 SVG 图标库」。**

1. 不引入 `lucide-react`，不为此修改 `freeze-check.mjs`、不走依赖例外 Gate。
2. 将 `Icon.tsx` 描边由 `1.5px` 对齐至 `VS-01 §5.2` 的 `icon-stroke: 2`（2px），使 M62 与 VS-01 视觉规格完全一致。
3. 本决策**取代 VS-01 §5.1 的库名字面解读**（Lucide）→ 解释为"Lucide 风格的 2px 描边统一 SVG，由 M62 零依赖注册表实现"。VS-01 其余 Token / 红线声明保持不变。
4. 未来新增图标：扩展 M62 `PATHS` 注册表（单一来源、零新库），禁止引入第二套图标库（呼应 P0-1 禁多库混用）。

## Consequences

**正面**
- 尊重冻结基线「零新依赖」硬红线，无需 Freeze Revision Gate / 护栏改动；
- 完全满足 P0-1（emoji-free、一套统一 SVG、16/20/24、2px 描边、可缩放、语义明确）；
- 复用已落盘、已测试的 M62 资产，落地风险最低。

**负面 / 代价**
- 与 VS-01 §5.1 字面库名（Lucide）偏离——本 ADR 为治理裁决，已就地记录，VS-01 §5.1 以本 ADR 解读为准；
- 图标丰富度受 M62 已注册集合约束（扩展成本低，仅增 PATHS 条目）。

## Verification

- `frontend/src/components/ui/Icon.tsx` 描边 `strokeWidth={2}`，尺寸 `SIZES = {16,20,24}`；
- `scripts/freeze-check.mjs` 无需改动；`dependencies` 仍仅 `react` / `react-dom`；
- 全仓 emoji 图标扫描零命中（M62.5 Gate2 机制 + P0-1）。

## Related

- `VS-01_visual_design_system.md` §5（Token 权威，本 ADR 取代其 §5.1 字面库名）
- `VS-04_visual_contract.md` 规则①（禁 emoji，锁 SVG 图标库）
- `ADR-0013` 冻结基线「无新依赖」硬红线
- `ADR-0015` D1（recommend_next 红线降级，与本 ADR 同属 Phase 5 前治理落盘）
- `P0-1` 禁 emoji 作功能图标（仅约束行为，不约束库名）
