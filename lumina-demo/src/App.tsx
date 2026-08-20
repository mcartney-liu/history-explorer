import { motion } from 'motion/react'
import { ScrollText, BookOpen, Atom, Brain, ArrowRight } from 'lucide-react'
import KineticGrid from './components/originkit/ui/kineticgrid'

// 动态隧道地址：重启 cloudflared 后会变化，需同步替换此处
const HEP_TUNNEL_URL =
  'https://prostores-counted-everything-proposals.trycloudflare.com'

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260429_114316_1c7889ad-2885-410e-b493-98119fee0ddb.mp4'

type Wing = {
  key: string
  title: string
  subtitle: string
  desc: string
  Icon: typeof ScrollText
  ready: boolean
  href?: string
}

// 门户分类：历史已上线（深链进现有 HEP 隧道），其余为占位 wing 证明模式可扩展
const WINGS: Wing[] = [
  {
    key: 'history',
    title: '历史',
    subtitle: 'History',
    desc: '重走丝绸之路，看见文明如何在时间长河里彼此连接。',
    Icon: ScrollText,
    ready: true,
    href: HEP_TUNNEL_URL,
  },
  {
    key: 'literature',
    title: '文学',
    subtitle: 'Literature',
    desc: '在故事与诗行间，理解人何以成为人。',
    Icon: BookOpen,
    ready: false,
  },
  {
    key: 'science',
    title: '科学',
    subtitle: 'Science',
    desc: '从宇宙到微观，追问万物运行的原理。',
    Icon: Atom,
    ready: false,
  },
  {
    key: 'psychology',
    title: '心理学',
    subtitle: 'Psychology',
    desc: '读懂自己与他人，绘制内在心智的地图。',
    Icon: Brain,
    ready: false,
  },
]

function WingCard({ wing, index }: { wing: Wing; index: number }) {
  const { Icon } = wing
  return (
    <motion.a
      href={wing.ready ? wing.href : undefined}
      target={wing.ready ? '_blank' : undefined}
      rel={wing.ready ? 'noreferrer' : undefined}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15 * index, ease: [0.16, 1, 0.3, 1] }}
      className={`portal-card liquid-glass group relative flex flex-col rounded-3xl p-7 text-white/80 ${
        wing.ready ? 'cursor-pointer' : 'cursor-default opacity-80'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white transition-colors group-hover:bg-white/20">
          <Icon size={22} />
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-widest ${
            wing.ready
              ? 'bg-emerald-400/15 text-emerald-300'
              : 'bg-white/10 text-white/50'
          }`}
        >
          {wing.ready ? '已上线' : '即将开放'}
        </span>
      </div>
      <h3 className="mt-6 text-2xl font-medium text-white">{wing.title}</h3>
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">
        {wing.subtitle}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-white/60">{wing.desc}</p>
      <div className="mt-6 flex items-center gap-2 text-sm text-white/70">
        {wing.ready ? (
          <>
            进入探索
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-1"
            />
          </>
        ) : (
          <span className="text-white/40">敬请期待</span>
        )}
      </div>
    </motion.a>
  )
}

function App() {
  return (
    <main className="relative w-full min-h-screen overflow-x-hidden flex flex-col items-center font-sans selection:bg-white/20 selection:text-white">
      {/* Background video */}
      <video
        className="fixed inset-0 w-full h-full object-cover z-[0]"
        src={VIDEO_SRC}
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Originkit Kinetic Grid — interactive dot-mesh overlay */}
      <div className="fixed inset-0 z-[1]">
        <KineticGrid
          background="transparent"
          dotColor="#FFFFFF"
          lineColor="#80ACFF"
          trailColor="#FFFFFF"
          spacing={36}
          radius={320}
          strength={4}
          trail
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl flex-1 flex flex-col items-center px-6 md:px-10 py-20">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="flex flex-col items-center text-center pt-10"
        >
          <h1 className="text-5xl md:text-7xl font-medium text-white tracking-tight drop-shadow-lg">
            Explorer
          </h1>
          <p className="mt-5 text-lg md:text-xl text-white/80">
            一个认知探索平台
          </p>
          <p className="mt-3 max-w-xl text-sm md:text-base leading-relaxed text-white/55">
            进来好奇，离开更聪明 ——
            从历史出发，走向文学、科学、心理学，在每一片领域里重新理解世界与自己。
          </p>
        </motion.section>

        {/* Wings grid */}
        <section className="mt-16 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {WINGS.map((wing, i) => (
            <WingCard key={wing.key} wing={wing} index={i} />
          ))}
        </section>

        {/* Footer note */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-24 text-center text-xs text-white/35"
        >
          <p>Explorer · 认知探索平台（原型）</p>
          <p className="mt-2">
            历史 wing 已接入线上探索器 · 更多领域即将开放
          </p>
        </motion.footer>
      </div>
    </main>
  )
}

export default App
