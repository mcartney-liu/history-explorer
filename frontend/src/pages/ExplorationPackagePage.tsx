import { useMemo, useRef } from 'react'
import { useLocale } from '../data/locale'
import { getPackageBySlug, type ExplorationPackage } from '../data/explorationPackages'
import { visitedFromEvents } from '../data/explorationGuide'
import { getEvents, recordEvent } from '../data/UserBehaviorEvent'
import PackageJourney from '../components/package/PackageJourney'
import GuidePanel from '../components/guide/GuidePanel'
import ExplorationSuggestions from '../components/ai/ExplorationSuggestions'
import { AI_SUGGESTIONS_ENABLED } from '../data/aiFeatureFlag'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import type { CausalStatementData } from '../data/causalStatement'

// M82 P2 — Phase 2 verification: hardcoded CausalStatements for China package.
// These match data/causal_statements.json. When P3.2 connects the real API
// (PathCandidate.causal_statements), this constant is replaced.
const CHINA_CAUSAL_STATEMENTS: readonly CausalStatementData[] = [
  {
    cause_id: 'china_v1:idea-keju',
    effect_id: 'china_v1:idea-wenguan',
    mechanism: '科举制度通过标准化考试选拔文官，取代了魏晋以来门阀世袭的选官方式。考试成绩而非出身成为晋升标准，使得受过儒学教育的士人阶层系统性进入权力核心。经过隋创立、唐定型、宋扩大的数百年演进，以科举出身的士大夫逐步取代了门阀贵族，形成了以文官为主导的官僚体系。',
    consequence: '文官体系的确立使中国形成了世界上最早的职业官僚制度，这一体系持续约1300年（隋至清），深刻塑造了东亚政治文化。与同时期欧洲的封建贵族世袭制度相比，中国文官体系的选拔性和专业性具有显著的制度优势，为中央集权的长期稳定提供了人才基础。',
    confidence: 'high',
    evidence_refs: ['ec-cn-001', 'ec-cn-002'],
  },
  {
    cause_id: 'china_v1:idea-sanxing-liubu',
    effect_id: 'china_v1:idea-neige',
    mechanism: '三省六部制在唐代达到成熟，但其集体决策机制效率较低——中书出令、门下封驳、尚书执行的流程在面对紧急政务时反应迟缓。明初废除丞相后，皇帝直接面对三省六部的庞大政务负担，被迫设立内阁作为咨询机构协助处理奏章。内阁大学士从秘书角色逐渐演变为实际决策者，权力从三省向内阁转移。',
    consequence: '内阁体系在明清两代成为实际上的最高行政中枢，但其权力始终依赖皇帝个人的信任——内阁没有法定的独立权力。这一制度的脆弱性在明代后期暴露无遗：万历怠政时内阁无法独立运作，崇祯朝内阁首辅更换频繁导致政策缺乏连续性。与同时期英国的内阁制不同，中国内阁始终是皇权的附属而非制约。',
    confidence: 'high',
    evidence_refs: ['ec-cn-001', 'ec-cn-002'],
  },
  {
    cause_id: 'china_v1:idea-tangshi',
    effect_id: 'china_v1:idea-songci',
    mechanism: '唐诗在格律、意象和抒情范式上达到了中国古典诗歌的顶峰。宋代文人继承唐诗的语言传统，但面临格律的「影响的焦虑」——唐诗已将格律诗写到极致，宋人难以超越。在此背景下，宋代文人开拓了「词」这一更自由的长短句体裁，将唐诗的抒情传统与民间曲调融合，形成了以苏轼、李清照、辛弃疾为代表的宋词高峰。',
    consequence: '宋词的兴起标志着中国文学从「诗的正统」向「词的新声」的重大转型。词比诗更适合表达细腻的个人情感和日常生活体验，反映了宋代市民文化兴起和文人生活方式的转变。这一转型也影响了后世元曲和明清小说的叙事传统——中国文学从精炼的抒情向更丰富的叙事和情感表达演进。',
    confidence: 'high',
    evidence_refs: ['ec-cn-003'],
  },
  {
    cause_id: 'china_v1:tp-song',
    effect_id: 'china_v1:idea-lixue',
    mechanism: '宋代重文抑武的国策和科举制度的扩大，促使知识分子阶层壮大并开始系统性反思儒学传统。二程（程颢、程颐）和朱熹等人可能受到佛教和道教思想的影响，试图为儒家伦理建立一套形而上学基础——「理」作为宇宙万物的根本原则。然而，理学的兴起是否主要由佛道思想推动，还是宋代政治经济条件（印刷术普及、士人阶层扩大）的产物，在学术界仍有争议。有学者认为理学是对佛道挑战的回应，也有学者认为它是儒学自身内在演化的结果。',
    consequence: '理学在南宋后期被确立为官学，成为此后近千年中国官方意识形态的核心。朱熹的《四书章句集注》成为科举考试的标准教材，理学思想深刻塑造了中国人的伦理观念、教育体系和家庭结构。但理学的「存天理、灭人欲」倾向也在后世引发了批判——特别是五四运动以来，部分学者认为理学压制了个人创造性和社会活力。',
    confidence: 'low',
    evidence_refs: ['ec-cn-001'],
  },
  {
    cause_id: 'china_v1:tp-ming',
    effect_id: 'china_v1:event-zheng-he',
    mechanism: '明成祖朱棣通过靖难之役夺取皇位后，面临政治合法性的挑战——他需要证明自己是一位「天下共主」。永乐年间明朝国力强盛、造船技术成熟（宋代以来积累的航海经验和指南针技术），为大规模远洋航行提供了物质条件。朱棣任命亲信宦官郑和为统帅，组建了当时世界上最大的远洋舰队，七次远航西洋，最远到达非洲东海岸。',
    consequence: '郑和下西洋展示了明初中国的海洋实力和外交影响力，但其影响的复杂性在于——明朝在第七次远航后突然停止官方远洋活动，转向海禁政策。原因包括：朝贡贸易的巨大财政消耗、迁都北京的国防重心北移、儒家士大夫对「宦官干政」的反感、以及永乐朝之后国力的相对衰退。这一「从海洋撤退」的决策使中国缺席了随后开启的欧洲大航海时代——在某种意义上，郑和的辉煌恰恰凸显了中国错失海洋时代的历史转折。',
    confidence: 'high',
    evidence_refs: ['ec-cn-007', 'ec-cn-002'],
  },
]

interface ExplorationPackagePageProps {
  slug: string
  onEntityClick: (gid: string) => void
  onOpenPackage: (slug: string) => void
  onBack: () => void
}

// ExplorationPackagePage — a curated EXPLORATION JOURNEY, not an encyclopedia
// detail page. First screen: title + summary + exploration_goals (the "why").
// Second layer: Exploration Guide (deterministic navigation) + PackageJourney
// (traceable path through time, relationships, and sources). Clicking a journey
// node drills into the Knowledge Graph.
export default function ExplorationPackagePage({
  slug,
  onEntityClick,
  onOpenPackage,
  onBack,
}: ExplorationPackagePageProps) {
  const { locale } = useLocale()
  const journeyRef = useRef<HTMLDivElement>(null)
  const pkg: ExplorationPackage | undefined = getPackageBySlug(slug)

  // M70 — visited-entity trail from the behavior event stream (localStorage).
  // Reuses the SAME UserBehaviorEvent stream that powers the deterministic
  // ProductUsageAnalysis — consume-only, no new state source. Falls back to
  // an empty trail when storage is unavailable (e.g. SSR / tests).
  const visited = useMemo<string[]>(() => {
    try {
      return visitedFromEvents(getEvents())
    } catch {
      return []
    }
  }, [])

  if (!pkg) {
    return (
      <section className="package-page package-page--missing" aria-label="探索包未找到">
        <EmptyState title={`未找到探索包：${slug}`} description="请返回首页重新选择一个官方探索包。" />
        <Button variant="ghost" className="package-back" onClick={onBack}>
          ← 返回探索
        </Button>
      </section>
    )
  }

  const title = pkg.title[locale] ?? pkg.title.zh
  const summary = pkg.summary[locale] ?? pkg.summary.zh
  const goals = pkg.exploration_goals[locale] ?? pkg.exploration_goals.zh
  const typeLabel = pkg.type === 'official' ? '官方探索包' : pkg.type

  const scrollToJourney = () => {
    journeyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="package-page" aria-label={`探索包 ${title}`}>
      <Button variant="ghost" className="package-back" onClick={onBack}>
        ← 返回探索
      </Button>

      <header className="package-hero">
        <span className="package-badge">{typeLabel}</span>
        <h1 className="package-title">{title}</h1>
        <p className="package-summary">{summary}</p>

        <div className="package-goals">
          <h2 className="package-goals-title">探索目标</h2>
          <p className="package-goals-text">{goals}</p>
        </div>

        <Button variant="gold" className="package-start" onClick={scrollToJourney}>
          开始探索 ↓
        </Button>
      </header>

      <div ref={journeyRef}>
        {/* M70 — Exploration Guide: deterministic navigation (position / next / reason / coverage).
            M71 — click_guide_next telemetry wired at the page layer (behavior-analysis only;
            view_source / complete_package contract reserved but NOT emitted yet — PO deferral). */}
        <GuidePanel
          pkg={pkg}
          visited={visited}
          locale={locale}
          onEntityClick={onEntityClick}
          onNextClick={(to) => recordEvent({ action: 'click_guide_next', entityGlobalId: to })}
          causalStatements={pkg.slug === 'china-civilization-v1' ? CHINA_CAUSAL_STATEMENTS : undefined}
        />

        {/* M74-003 (C3-2) — AI Exploration Suggestions (T1): evidence-bound
            exploration touchpoint, an ENHANCEMENT LAYER beside (never replacing)
            the deterministic Guide. Flag-gated at the parent so OFF = zero
            render + zero requests (M73 byte-identical). Anchor = first package
            entity reference; every fact comes from the backend response. */}
        {AI_SUGGESTIONS_ENABLED && pkg.entity_references[0] && (
          <ExplorationSuggestions
            anchorGlobalId={pkg.entity_references[0]}
            onEntityClick={onEntityClick}
          />
        )}

        <PackageJourney
          pkg={pkg}
          locale={locale}
          onEntityClick={onEntityClick}
          onOpenPackage={onOpenPackage}
          onSourceClick={(sourceId) =>
            recordEvent({ action: 'view_source', sourceId })
          }
          causalStatements={pkg.slug === 'china-civilization-v1' ? CHINA_CAUSAL_STATEMENTS : undefined}
        />
      </div>
    </section>
  )
}
