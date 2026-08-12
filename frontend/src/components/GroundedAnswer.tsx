import type { ReactNode } from 'react'
import type { AIResponse, AIEngine, AIConfidence } from '../data/aiClient'

type GroundedAnswerProps = {
  response: AIResponse
}

// Each engine state gets a distinct, honest label. None of these claim the
// answer is a reliable, self-evident fact — that is the ADR-0003 boundary.
// Engine labels describe PROVENANCE only — they never assert verification.
// The verification verdict lives in the grounded badge, kept strictly separate
// so an `ai` answer that failed validation is never relabeled as "verified".
const ENGINE_LABEL: Record<AIEngine, string> = {
  ai: 'AI 解读',
  ai_unverified: 'AI 解读（引用未通过验证）',
  deterministic: '确定性回退（AI 不可用）',
  synthetic: '本地综合（已验证维度）',
}

// M36.0 server-computed confidence labels — never trust LLM self-rating.
const CONFIDENCE_LABEL: Record<AIConfidence, string> = {
  high: '置信度：高',
  medium: '置信度：中',
  low: '置信度：低',
}

// M36.0 additive: render perspectives (alternative interpretations / caveats)
// from the LLM response. Guarded: only when non-empty.
function Perspectives({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="ga-perspectives">
      <h4 className="ga-perspectives-title">多角度解读</h4>
      <ul className="ga-perspectives-list">
        {items.map((p, i) => (
          <li key={i} className="ga-perspective-item">{p}</li>
        ))}
      </ul>
    </div>
  )
}

// M36.0 additive: render verified evidence entries with status label.
function Evidence({ items }: { items: AIResponse['evidence'] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="ga-evidence">
      <h4 className="ga-evidence-title">已验证的事实证据</h4>
      <ul className="ga-evidence-list">
        {items.map((ev, i) => (
          <li key={i} className="ga-evidence-item">
            <span className={`ga-evidence-kind ga-ev-kind-${ev.kind}`}>
              {ev.kind}
            </span>
            <span className="ga-evidence-label">{ev.label}</span>
            <span className="ga-evidence-status">{ev.status}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// 2026-08-11 (PO): when the backend returns a STRUCTURED synthesis answer
// (cross-dimensional analysis), render it as a readable view instead of a raw
// JSON/text blob. The backend serializes such answers via json.dumps, so they
// arrive as a JSON string; we only treat it as synthesis when the expected
// keys are present — any other JSON stays as a plain paragraph.
//
// Supports both English keys (cross_dimensional_theme / dimensional_relations /
// conclusion) and Chinese keys returned by the synthesis prompt
// (跨维度主题 / 维度关联 / 结论), plus markdown code-block wrapping.
function tryRenderSynthesis(raw: string): ReactNode | null {
  let text = raw.trim()
  // Strip markdown fenced code block if the LLM wrapped JSON in ```json ... ```
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const obj = parsed as Record<string, unknown>

  const theme =
    (typeof obj.cross_dimensional_theme === 'string' && obj.cross_dimensional_theme) ||
    (typeof obj.跨维度主题 === 'string' && obj.跨维度主题) ||
    null
  const relations =
    (obj.dimensional_relations != null && typeof obj.dimensional_relations === 'object' &&
      !Array.isArray(obj.dimensional_relations) && obj.dimensional_relations) ||
    (obj.维度关联 != null && typeof obj.维度关联 === 'object' && !Array.isArray(obj.维度关联) &&
      obj.维度关联) ||
    null
  const conclusion =
    (typeof obj.conclusion === 'string' && obj.conclusion) ||
    (typeof obj.结论 === 'string' && obj.结论) ||
    null

  if (!theme && !relations && !conclusion) return null

  return (
    <div className="ga-synthesis">
      {theme && (
        <section className="ga-synth-section">
          <h5 className="ga-synth-title">跨维度主题</h5>
          <p className="ga-synth-text">{theme}</p>
        </section>
      )}
      {relations && (
        <section className="ga-synth-section">
          <h5 className="ga-synth-title">维度关联</h5>
          <div className="ga-synth-relations">
            {Object.entries(relations as Record<string, unknown>).map(
              ([k, v]) => (
                <div key={k} className="ga-synth-rel">
                  <span className="ga-synth-rel-key">{k}</span>
                  <span className="ga-synth-rel-val">
                    {typeof v === 'string' ? v : JSON.stringify(v)}
                  </span>
                </div>
              ),
            )}
          </div>
        </section>
      )}
      {conclusion && (
        <section className="ga-synth-section">
          <h5 className="ga-synth-title">结论</h5>
          <p className="ga-synth-text">{conclusion}</p>
        </section>
      )}
    </div>
  )
}

// 已知的 LLM JSON artifact 关键字——出现在 JSON value 中时说明这是结构化数据
// 而非用户可读文本，应被剥离而非展示。
const JSON_ARTifact_KEYS = [
  'global_id', 'kind', 'entity', 'label',   // citation / entity 引用
  'answer', 'citations', 'rejected_citations', // AI 响应包装
  'confidence', 'grounded', 'engine', 'evidence', // AI 元数据
  'perspectives', 'next_exploration', 'mode', 'question', // AI 扩展字段
]

/** 判断一个 JSON 字符串是否像 LLM artifact（含上述关键字） */
function isArtifactJSON(jsonStr: string): boolean {
  // 快速排除：太短不可能是 artifact
  if (jsonStr.length < 20) return false
  const lower = jsonStr.toLowerCase()
  return JSON_ARTifact_KEYS.some((k) => lower.includes(`"${k}"`))
}

/**
 * 从文本中剥离末尾/嵌入/截断的 JSON artifact 块（{...} 或 [...]）。
 * 匹配条件：该块包含已知 artifact 关键字。
 * 保护正常文本中的花括号（如数学公式、代码示例）不被误剥。
 *
 * 三层匹配（由严到松）：
 *   1. 完整 JSON 对象/数组（配对括号，可 JSON.parse 验证）
 *   2. 截断 JSON（{... 开头但无闭合括号，常见于 LLM 输出被截断）
 *   3. 孤立 artifact 关键字片段（连花括号都不全的残留）
 */
function stripJSONArtifacts(text: string): string {
  let result = text
  // 反复剥离（处理多层嵌套 artifact），上限 5 轮防死循环
  for (let round = 0; round < 5; round++) {
    const prev = result

    // === 第 1 层：完整 JSON 对象（非贪婪，优先匹配最内层）===
    result = result.replace(
      /\{[^{}]*(?:"(?:[^"\\]|\\.)*"[^{}]*)*\}/g,
      (match) => {
        try {
          if (isArtifactJSON(match)) return ''
        } catch { /* 不是合法 JSON，保留 */ }
        return match
      },
    )

    // === 第 1 层：完整 JSON 数组 ===
    result = result.replace(
      /\[[^\[\]]*(?:"(?:[^"\\]|\\.)*"[^\[\]]*)*\]/g,
      (match) => {
        try {
          if (isArtifactJSON(match)) return ''
        } catch { /* 保留 */ }
        return match
      },
    )

    // === 第 2 层：截断 JSON（LLM 输出被截断时的常见残留）===
    // 匹配从 { 或 [ 开始、到字符串末尾的不完整 JSON 块
    // 注意：截断 JSON 通常只有 15-25 字符，不能用 isArtifactJSON 的 20 字符门槛
    result = result.replace(
      /(?:^|[\s.…~—\-_]{4,})(\{[^]*$)/gm,
      (match, jsonCandidate) => {
        // 截断 JSON 至少 12 字符才值得检查（比完整 JSON 的 20 更宽松）
        if (jsonCandidate.length < 12) return match
        // 用低阈值版本检查（截断段天然短）
        if (
          jsonCandidate.length >= 12 &&
          JSON_ARTifact_KEYS.some((k) =>
            jsonCandidate.toLowerCase().includes(`"${k}"`),
          )
        )
          return ''
        return match
      },
    )
    // 也处理无前缀的裸截断 JSON（{ 开头直达行尾/串尾）
    result = result.replace(
      /(?<!\w)(\{[^{}"]*"(?:global_id|kind|"answer|"citations)[^}]*$)/gm,
      (match) => {
        if (match.length < 12) return match
        if (
          JSON_ARTifact_KEYS.some((k) =>
            match.toLowerCase().includes(`"${k}"`),
          )
        )
          return ''
        return match
      },
    )

    // === 第 3 层：清理剥离后可能留下的孤立前缀/嵌入垃圾 ===
    // 3a: 末尾垃圾（点号串/省略号串/横线串 ≥4 字符）
    result = result.replace(/[\s.…\-~]{4,}\s*$/g, '').trim()
    // 3b: 嵌入式垃圾（标签/文本 + 点号串 + 引号/括号/末尾）
    //     如 "政治制度....................""" 或 "军事体系..........{"global_id"...
    //     用 \p{P}（标点）+ \p{Z}（空白）+ \p{S}（符号）匹配，避免手写字符类的范围歧义
    result = result.replace(/([^\p{P}\p{Z}\p{S}])([\p{P}\p{Z}\p{S}]{4,})(["']?\s*$)/gu, '$1$3').trim()
    // 3c: 兜底——如果整行/整串只剩垃圾（≥6 字符的纯标点/空白/符号），直接清空
    if (result.length > 6 && /^[\p{P}\p{Z}\p{S}]+$/u.test(result)) result = ''

    if (result === prev) break // 无变化，退出
  }
  return result
}

// 2026-08-11 (PO)：LLM 输出不稳定的最后防线——任何没被 tryRenderSynthesis
// 识别的 JSON 对象，递归提取其中的字符串值拼接展示，绝不让用户看到
// 原始 JSON dump（"像保存文件的内容")。
//
// 2026-08-12 (增强)：新增「混合内容清洗」模式——当 answer 同时包含可读文本和
// JSON artifact（LLM 常把引用数据/响应包装追加在正文后面），自动剥离 JSON 部分，
// 只保留人类可读文本。覆盖三种输入形态：
//   ① 纯 JSON → 提取字符串值（原有逻辑）
//   ② 纯文本 → 原样返回（原有逻辑）
//   ③ 混合内容（文本 + JSON）→ 剥离 JSON artifact，保留文本（新增）
export function humanizeAnswer(raw: string): string {
  const text = (raw ?? '').trim()
  if (!text) return raw ?? ''

  // 先剥 markdown code fence 残留（LLM 有时用 ```json 包裹输出但后端未完全剥离）
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*$/g, '')

  // 模式①：整个字符串是纯 JSON → 提取字符串（原有逻辑）
  const trimmed = cleaned.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      // 以 {/[ 开头但不是合法 JSON → 可能是混合内容的极端情况，
      // 走模式③ 剥离尝试
      cleaned = stripJSONArtifacts(cleaned)
      return cleaned.trim() || raw
    }
    if (parsed === null || typeof parsed !== 'object') return raw

    const parts: string[] = []
    const walk = (v: unknown): void => {
      if (typeof v === 'string') {
        const s = v.trim()
        if (s) parts.push(s)
      } else if (Array.isArray(v)) {
        v.forEach(walk)
      } else if (v && typeof v === 'object') {
        Object.values(v).forEach(walk)
      }
    }
    walk(parsed)
    return parts.length > 0 ? parts.join('\n\n') : raw
  }

  // 模式②：不含 JSON 特征 → 原样返回（快速路径，原有行为）
  // 但仍需清理可能的垃圾残留（纯点号串、截断标记等）
  if (!trimmed.includes('{') && !trimmed.includes('[')) {
    // 仅跑垃圾清理层（L3），不跑 JSON 剥离（已知无 JSON 特征）
    let quick = trimmed
      .replace(/[\s.…\-~]{4,}\s*$/g, '') // 3a: 末尾垃圾
      .replace(/([^\p{P}\p{Z}\p{S}])([\p{P}\p{Z}\p{S}]{4,})(["']?\s*$)/gu, '$1$3') // 3b: 嵌入垃圾（保留标签+尾部，删除中间垃圾）
      .trim()
    // 3c 兜底：纯垃圾串直接清空
    if (quick.length > 6 && /^[\p{P}\p{Z}\p{S}]+$/u.test(quick)) quick = ''
    // 注意：quick 可能为空字符串（垃圾被全清），此时应返回空串而非 fallback 到 raw
    return quick
  }

  // 模式③：混合内容（可读文本 + 嵌入/末尾 JSON artifact）→ 剥离 JSON
  cleaned = stripJSONArtifacts(cleaned)

  // 清理剥离后可能残留的多余空行
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim()

  return cleaned || raw
}

// Pure presentational component: given a fully-grounded backend response, show
// the answer, the engine state, the verification verdict, and (M36.0) the
// confidence, perspectives, and verified evidence. It never decides truthiness
// — it only renders what the backend asserted.
export default function GroundedAnswer({ response }: GroundedAnswerProps) {
  const citations = response.citations ?? []
  const rejected = response.rejected_citations ?? []
  const grounded = Boolean(response.grounded)

  return (
    <div className="grounded-answer">
      <div className="ga-status-row">
        <span className={`ga-engine-badge ga-engine-${response.engine}`}>
          {ENGINE_LABEL[response.engine] ?? response.engine}
        </span>
        <span
          className={`ga-grounded-badge ${grounded ? 'ga-grounded-true' : 'ga-grounded-false'}`}
        >
          {grounded ? '已通过事实溯源验证' : '未完全通过事实溯源验证'}
        </span>
        {/* M36.0 confidence badge — server-computed, never LLM-given */}
        {response.confidence && (
          <span className={`ga-confidence-badge ga-conf-${response.confidence}`}>
            {CONFIDENCE_LABEL[response.confidence] ?? response.confidence}
          </span>
        )}
      </div>

      {!grounded && (
        <p className="ga-warning" role="note">
          {response.engine === 'deterministic'
            ? 'AI 解读层当前不可用，以下为确定性回退说明，并非 AI 生成的解读。'
            : '以下回答未完全通过事实溯源验证，可能包含未被知识图谱佐证的表述，请谨慎参考。'}
        </p>
      )}

      {/* M36.0: show LLM-provided alternative perspectives before the answer */}
      <Perspectives items={response.perspectives ?? []} />

      {tryRenderSynthesis(response.answer) ?? (
        <p className="ga-answer">{humanizeAnswer(response.answer)}</p>
      )}

      {/* M36.0: show server-verified evidence block */}
      <Evidence items={response.evidence} />

      <p className="ga-citation-summary">
        事实引用 {citations.length} 条
        {rejected.length > 0 ? `，未通过验证 ${rejected.length} 条` : ''}
      </p>
    </div>
  )
}
