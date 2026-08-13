import { describe, it, expect } from 'vitest'
import { humanizeAnswer } from './GroundedAnswer'

// ============================================================
// Phase 1 Feedback Loop: Reproduce the EXACT bug from screenshots
//
// Screenshot pattern (2026-08-12): LLM returns answer field that
// contains readable Chinese text followed by SCATTERED JSON fragments:
//   "label": "罗马文明", ["global_id": "罗马文明", "kind": "entity", ...
// These are NOT complete JSON blocks — they are key-value pairs +
// array fragments sprinkled into the text. extractJSONBlocks() only
// catches matched {}/[] pairs, so these slip through.
// ============================================================

describe('humanizeAnswer — scattered JSON artifact cleanup', () => {
  it('should strip scattered label/global_id/kind fragments after readable text', () => {
    // This mimics the EXACT pattern from screenshot 1 (政治制度/文化影响):
    // Normal Chinese answer text, then a wall of scattered JSON artifacts
    const dirty = `罗马文明的政治制度对其发展与扩张产生了深远影响。罗马的政治制度包括共和制和帝制，这两种制度都强调了法律秩序的重要性，这有助于维持国家的稳定和统一。在共和国时期，罗马通过其独特的政治结构，如元老院和执政官的制度，实现了权力的分立与制衡。帝国时期则转向了更为集中的皇权统治。这种政治制度还促进了罗马文明与其他文明的交流和融合，如通过丝绸之路与东方文明进行贸易，从而推动了经济和文化的发展。
"label": "罗马文明", ["global_id": "罗马文明", "kind": "entity", "label":
"entity", "label": "罗马文明", ["global_id": "罗马文明", "kind":
"entity", "label": "经辑"
"entity", "label": "基督教", ["global_id": "Byzantine Empire", "kind": "entity", "label": "拜占庭帝国"],
["global_id": "罗马文明", "kind": "entity", "label": "罗马文明"], ["global_id": "罗
马文明", "kind": "entity", "label": "罗马文明"], ["global_id": "罗马文明", "kind":
"entity", "label": "罗马文明"], ["global_id": "罗马文明", "kind": "entity", "label":
"罗马文明"], ["global_id": "罗马文明", "kind": "entity", "label": "罗马文明"],
["global_id": "罗马文明", "kind": "entity", "label": "罗马文明"], ["global_id": "罗
马文明", "kind": "entity", "label": "罗马文明"], ["global_id": "罗马文明", "kind":
"entity", "label": "罗马文明"], ["global_id": "罗马文明", "kind": "entity", "label":
"罗马文明"], ["global_id": "罗马文明", "kind": "entity", "label": "罗马文明"]`

    const result = humanizeAnswer(dirty)

    // Must NOT contain any JSON artifact keywords in output
    expect(result).not.toContain('"global_id"')
    expect(result).not.toContain('"kind"')
    expect(result).not.toContain('"label"')
    expect(result).not.toContain('"entity"')
    expect(result).not.toContain('"answer"')

    // Must preserve the readable Chinese text
    expect(result).toContain('罗马文明的政治制度')
    expect(result).toContain('共和制和帝制')

    // Must not have scattered bracket fragments
    expect(result).not.toMatch(/\["global_id"/)
  })

  it('should strip answer-wrapped JSON then scattered fragments (screenshot 2 pattern)', () => {
    // Pattern from screenshot 2: {"answer": "...readable text..."} followed by
    // more scattered citation fragments — LLM wrapped the answer in JSON but
    // the answer value itself also has trailing garbage, AND there are more
    // fragments outside the JSON wrapper
    const dirty = `{"answer": "罗马文明的军事能力对其疆域扩张和防御产生了深远影响。罗马军队的强大组织和纪律性使罗马能够征服并统治广阔的领土，包括地中海地区。", "citations": [{"global_id": "Roman Legions", "kind": "entity", "label": "罗马军团"}]}
"label": "罗马文明", ["global_id": "罗马文明", "kind": "entity", "label": "罗马文明"]
["global_id": "Roman Empire", "kind": "entity", "label": "罗马帝国"], ["global_id": "罗马文明", "kind": "entity"]`

    const result = humanizeAnswer(dirty)

    expect(result).not.toContain('"global_id"')
    expect(result).not.toContain('"kind"')
    expect(result).not.toContain('"citations"')
    expect(result).toContain('罗马文明的军事能力')
  })

  it('should handle ResearchReport excerpt use-case (slice after humanize)', () => {
    // ResearchReport.tsx line 70 does: humanizeAnswer(dim.answer).slice(0, 300)
    // If JSON artifacts aren't cleaned, the 300-char slice is ALL garbage
    const dirty = `经济体系与贸易网络如何支撑罗马文明繁荣的答案？罗马文明的繁荣得益于其发达的经济体系和广泛的贸易网络。罗马帝国通过控制地中海，构建了庞大的贸易网络，特别是与丝绸之路的连接，促进了商品和文化的交流。
"label": "罗马文明", ["global_id": "罗马文明", "kind": "entity", "label": "罗马文明"], ["global_id": "Silk Road", "kind": "entity", "label": "丝绸之路"]
事实引用 0 条`

    const result = humanizeAnswer(dirty).slice(0, 200)

    expect(result).not.toContain('"global_id"')
    expect(result).not.toContain('"label"')
    expect(result).toContain('经济体系')
    // First 200 chars should be meaningful Chinese, not JSON garbage
  })
})

describe('humanizeAnswer — answer-wrapped JSON (P-U02 root-cause fix)', () => {
  it('should extract body from array-wrapped answer ["answer", text, "citations", [...]]', () => {
    const raw = JSON.stringify([
      'answer',
      '罗马文明通过征服、贸易和文化交流等方式传播并影响了其他文明和后世。',
      'citations',
      [{ global_id: '罗马文明', kind: 'entity', label: '罗马文明' }],
    ])
    const result = humanizeAnswer(raw)
    expect(result).toBe('罗马文明通过征服、贸易和文化交流等方式传播并影响了其他文明和后世。')
    expect(result).not.toContain('"answer"')
    expect(result).not.toContain('"citations"')
    expect(result).not.toContain('"global_id"')
  })

  it('should extract body from object-wrapped answer {answer, citations}', () => {
    const raw = JSON.stringify({
      answer: '罗马帝国的军事组织是其扩张的基石。',
      citations: [{ global_id: '罗马军团', kind: 'entity', label: '罗马军团' }],
    })
    const result = humanizeAnswer(raw)
    expect(result).toBe('罗马帝国的军事组织是其扩张的基石。')
    expect(result).not.toContain('"citations"')
    expect(result).not.toContain('"global_id"')
  })

  it('should still render plain-text answers verbatim', () => {
    const raw = '罗马文明的政治制度对后世影响深远。'
    expect(humanizeAnswer(raw)).toBe(raw)
  })
})
