import type { ExplorationPackage, Locale } from '../../data/explorationPackages'
import { Button } from '../ui/Button'

// Design v2: 每个探索包配一张 Unsplash 免费封面图
const PACKAGE_COVERS: Record<string, string> = {
  'roman-empire': 'https://images.unsplash.com/photo-1552832230-c0197cb3c2e1?w=600&q=80',           // 罗马斗兽场/古罗马
  'silk-road':    'https://images.unsplash.com/photo-1547981609-4b6bfe62bdbb?w=600&q=80',           // 丝绸之路/沙漠商队
  'greek-philo':  'https://images.unsplash.com/photo-1555854877-zohrhv5mnkw?w=600&q=80',           // 希腊哲学/帕特农神庙
  'indian-ocean': 'https://images.unsplash.com/photo-1561361518-e3f0c815b3e?w=600&q=80',           // 古印度/泰姬陵风格
}

interface PackageCardProps {
  pkg: ExplorationPackage
  locale?: Locale
  onOpen: (slug: string) => void
}

// Presentational card for the Discover page "官方探索包" block.
// Entrance to an Exploration Journey — not an encyclopedia detail page.
export default function PackageCard({ pkg, locale = 'zh', onOpen }: PackageCardProps) {
  const title = pkg.title[locale] ?? pkg.title.zh
  const summary = pkg.summary[locale] ?? pkg.summary.zh
  const typeLabel = pkg.type === 'official' ? '官方探索包' : pkg.type
  const coverUrl = PACKAGE_COVERS[pkg.slug] || PACKAGE_COVERS['silk-road']

  return (
    <article className="pkg-card" data-testid={`pkg-card-${pkg.slug}`}>
      <div className="pkg-card-cover" style={{ backgroundImage: `url(${coverUrl})` }}>
        <span className="pkg-card-badge">{typeLabel}</span>
      </div>
      <div className="pkg-card-body">
        <h3 className="pkg-card-title">{title}</h3>
        <p className="pkg-card-summary">{summary}</p>
        <Button
          variant="gold"
          className="pkg-card-open"
          ariaLabel={`开始探索 ${title}`}
          onClick={() => onOpen(pkg.slug)}
        >
          开始探索 →
        </Button>
      </div>
    </article>
  )
}
