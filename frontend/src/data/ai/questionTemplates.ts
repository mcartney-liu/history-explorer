// ============================================================
// 2026-08-13 (PO) — AI 事实溯源解读：按模式 + 实体名生成示例问题
//
// 解决「输入框不知道问什么」：每个解读模式给 3 个示例问题，
// 用户点击后自动填入输入框。实体名来自当前页面（如「罗马文明」）。
// 纯前端模板，不涉及 AI/后端/数据。
// ============================================================

/**
 * 按解读模式生成 3 个示例问题。
 * @param mode    PROMPT_MODES 的 key（why_important / why_happened / …）
 * @param name    当前实体名（如「罗马文明」）
 */
export function exampleQuestions(mode: string, name: string): string[] {
  const n = name || '这个实体'
  const templates: Record<string, (n: string) => string[]> = {
    why_important: (x) => [
      `${x}为什么在历史上重要？`,
      `${x}对后世产生了哪些影响？`,
      `${x}的历史地位如何评价？`,
    ],
    why_happened: (x) => [
      `${x}是怎样形成/兴起的？`,
      `${x}兴起的关键因素有哪些？`,
      `${x}的源头可以追溯到什么时候？`,
    ],
    historical_impact: (x) => [
      `${x}对后世有什么深远影响？`,
      `${x}的遗产如何延续到今天？`,
      `${x}改变了哪些历史进程？`,
    ],
    multi_civilization_view: (x) => [
      `${x}与其他文明有何交流？`,
      `其他文明如何看待${x}？`,
      `${x}在跨文明视野中的位置是什么？`,
    ],
    timeline_explanation: (x) => [
      `${x}经历了哪些发展阶段？`,
      `${x}的兴衰时间线是怎样的？`,
      `${x}的关键转折点有哪些？`,
    ],
  }
  const pick = templates[mode] ?? templates.why_important
  return pick(n)
}

/**
 * 2026-08-13 (PO)：把「分析角度」拼进问题，让模式在前端问题层也生效
 * （系统层 Focus 保留不动，这里是增强）。
 *
 * 例如：mode=why_happened + question「罗马文明为什么在历史上重要？」
 * → 「请从【发生与成因】的角度分析：罗马文明为什么在历史上重要？」
 *
 * @param mode     PROMPT_MODES 的 key
 * @param question 用户输入的问题
 * @param angle    角度词（PROMPT_MODES 的 angle 字段）
 */
export function withAngle(_mode: string, question: string, angle: string): string {
  const q = (question ?? '').trim()
  if (!q) return q
  const a = (angle ?? '').trim()
  if (!a) return q
  return `请从【${a}】的角度分析：${q}`
}

