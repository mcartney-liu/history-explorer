// ============================================================
// M90.3 — ProductIntro (shared landing block)
//
// Renders "History Explorer 能做什么" — the product capability
// showcase. This block appears on the landing page, positioned
// between the search area and the Discover/Landing content, so
// it's visible across all home-page tabs (了解/研究/扩展).
//
// Extracted from DiscoverPage.tsx (M44) to be a shared slot.
// ============================================================

import { Card } from '../ui/Card'
import { Icon, type IconName } from '../ui/Icon'

const PRODUCT_CAPABILITIES = [
  {
    id: 'story',
    icon: 'book' as const,
    title: '历史叙事',
    desc: '从一个人、一条路、一个事件出发，看它如何在历史中展开。手写叙事，不靠 AI 生成。',
  },
  {
    id: 'explore',
    icon: 'link' as const,
    title: '关系探索',
    desc: '穿越实体之间的关联——因果关系、时间顺序、影响传播。每一步都有据可查。',
  },
  {
    id: 'research',
    icon: 'research' as const,
    title: '深度研究',
    desc: '4 维度 AI 分析：政治、军事、经济、文化。支持多实体对比研究，结果可保存回顾。',
  },
  {
    id: 'chat',
    icon: 'scholar' as const,
    title: 'AI 历史学家',
    desc: '随时向 AI 历史学家提问。回答基于知识图谱，不凭空捏造。',
  },
]

export function ProductIntro() {
  return (
    <div className="discover-intro">
      <h3 className="discover-section-heading">History Explorer 能做什么</h3>
      <div className="discover-intro-grid">
        {PRODUCT_CAPABILITIES.map((cap) => (
          <Card key={cap.id} variant="default" className="discover-intro-card">
            <div className="discover-intro-icon">
              <Icon name={cap.icon as IconName} size={24} />
            </div>
            <h4 className="discover-intro-title">{cap.title}</h4>
            <p className="discover-intro-desc">{cap.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
