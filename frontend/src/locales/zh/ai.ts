export default {
  'entity.ai_insight': '历史洞察',
  'workspace.ai': 'AI 历史学家',
  'workspace.ai_subtitle': '你的历史研究伙伴',
  // M74-003 (C3): Trust Display copy — evidence-based, never "AI-generated"
  // for deterministic output (PO Condition 2).
  'ai.trust_title': '基于知识库证据的探索建议',
  'ai.trust_aria_label': '基于知识库证据的探索建议',
  'ai.trust_perspective': '顺着它，推荐你下一步探索谁',
  'ai.trust_evidence_label': '证据依据',
  // INFO_FOLDING UX SPEC (2026-08-15, PO): 证据折叠——默认 2 条 + 查看全部
  'ai.trust_evidence_more': '查看全部 {count} 条 →',
  'ai.trust_evidence_collapse': '收起',
  // M74-004-003 (G2): section label differentiated from GuidePanel's
  // "下一步可以探索" — two suggestion sources must not share the same copy.
  'ai.trust_next_label': '推荐探索',
  'ai.trust_engine_deterministic': '确定性输出',
  'ai.trust_engine_ai': 'AI 生成',
  // 2026-08-11 (PO): 推荐列表为确定性 Planner 产物（图谱+证据模板），
  // 徽标显式标"知识库推荐"而非"AI 生成"（AI 仅生成 answer，前端不渲染）。
  'ai.trust_engine_knowledge': '知识库推荐',
  'ai.trust_verified': '已校验',
  'ai.trust_no_evidence': '该主题暂无可用知识库证据。',
  // M74-004-002 (Commit 2B): Evidence Card — per-recommendation trust detail.
  'ai.evidence_reason': '推荐原因',
  'ai.evidence_claim': '证据原文',
  // 2026-08-11 (PO)：历史见解支撑证据的原文标签（引用格式对齐）
  'ai.evidence_summary': '原文/摘要',
  'ai.evidence_source': '来源',
  'ai.evidence_confidence': '可信度',
  // M74-004-003 (G3): confidence localisation (zh never shows English).
  'ai.confidence_high': '高',
  'ai.confidence_medium': '中',
  'ai.confidence_low': '低',
  'ai.tier_primary': '一手史料',
  'ai.tier_academic': '学术文献',
  'ai.tier_reference': '参考资料',
  'ai.tier_unknown': '来源等级未知',
  // M74-004-002 (Commit 2A): Journey Trail — exploration path visualization.
  'ai.journey_trail_title': '探索足迹',
  'ai.trust_no_next': '暂无推荐探索路径——可基于上方证据继续探索，或打开相邻实体。',
  // 2026-08-11 (PO): 叙事卡片链重构——关系彩色 Badge + 折叠详情 + 查看更多
  'ai.trust_expand': '展开',
  'ai.trust_collapse': '收起',
  'ai.trust_show_more': '查看更多 {count} 条关系',
  'ai.trust_show_less': '收起',
  'ai.trust_node_aria': '探索 {name}',
}
