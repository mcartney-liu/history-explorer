import { useMemo } from 'react'
import { useLocale } from '../data/locale'
import { getRelationshipLabel, getEntityDisplayName } from '../data/entity/entityLabels'

export type ConnectionItem = {
  type: string
  name: string
}

type ConnectionsPanelProps = {
  connections: ConnectionItem[]
  // 当前主题名（如「罗马帝国建立」），作为句子主语拼进每条关系
  subject?: string
}

// Humanize a raw entity name for display:
// - Already Chinese (contains CJK) → keep as-is
// - Known backend name / global_id → map via ENTITY_DISPLAY_NAMES
// - Otherwise strip topic prefix + type prefix + underscores
//   (e.g. hellenistic_world:civ-greek → greek, silk_road:silk_road → silk road)
function humanizeEntityName(rawName: string, locale: string): string {
  if (/[一-鿿]/.test(rawName)) return rawName
  const mapped = getEntityDisplayName(rawName, locale)
  if (mapped !== rawName) return mapped
  const entityPart = rawName.includes(':') ? rawName.split(':').slice(1).join(':') : rawName
  const stripped = entityPart.replace(
    /^(civ|person|event|loc|place|tp|technology|tech|religion|idea|org)-/,
    '',
  )
  return stripped.replace(/_/g, ' ')
}

// 关系类型 → 人话句子模板（主谓宾）。{s}=当前主题，{o}=目标实体。
const REL_PHRASE_ZH: Record<string, string> = {
  caused: '{s} 导致了 {o} 的发生',
  influenced: '{s} 推动了 {o} 的发展',
  participated_in: '{s} 参与 / 牵涉了 {o}',
  located_at: '{s} 的重心在 {o}',
  related_to: '{s} 与 {o} 相关联',
  before: '{s} 早于 {o}',
  after: '{s} 晚于 {o}',
  contemporary_with: '{s} 与 {o} 处于同一时代',
  part_of: '{s} 是 {o} 的一部分',
  ruled: '{s} 统治了 {o}',
  traded_with: '{s} 与 {o} 之间有贸易往来',
  invented: '{s} 发明了 {o}',
  discovered: '{s} 发现了 {o}',
  practiced: '{s} 实践了 {o}',
  spoke: '{s} 使用 {o} 作为语言',
  inherited: '{s} 后来演变为 {o}',
  conquered: '{s} 征服了 {o}',
  spread: '{s} 把 {o} 传播到了更广的范围',
  disputes: '{s} 与 {o} 之间的关系在史料中存在争议',
  reinterprets: '{s} 重新解释了 {o}',
}

// 关系类型 → 悬停释义（一句话说清热词到底什么意思）
const REL_GLOSS_ZH: Record<string, string> = {
  caused: '导致：前者是后者发生的直接原因',
  influenced: '影响：前者对后者的形成或发展起了推动作用',
  participated_in: '参与：前者是后者的促成者或关键组成部分',
  located_at: '位于：前者的地理或政治重心在后者',
  related_to: '关联：两者存在直接但较宽泛的联系',
  before: '早于：前者在时间上发生在后者之前',
  after: '晚于：前者在时间上发生在后者之后',
  contemporary_with: '同时代：两者在时间上重叠共存',
  part_of: '属于：前者是后者范围或体系内的一部分',
  ruled: '统治：前者掌控了后者的政权',
  traded_with: '贸易往来：两者之间存在物资或商路的往来',
  invented: '发明：前者创造了后者（技术或事物）',
  discovered: '发现：前者找到了后者（新大陆或事物）',
  practiced: '实践：前者奉行或使用了后者',
  spoke: '使用语言：前者以后者作为交流语言',
  inherited: '继承为：前者之后被后者接续或取代',
  conquered: '征服：前者以军事手段控制了后者',
  spread: '传播：前者把后者扩散到更广的范围',
  disputes: '存在争议：关于两者之间的关系，史料有不同说法',
  reinterprets: '重新解释：前者对后者给出了新的解读',
}

type ConnRow = {
  key: string
  verb: string
  gloss: string
  pre: string
  target: string
  post: string
  plain?: string
}

function ConnectionsPanel({ connections, subject }: ConnectionsPanelProps) {
  const { t, locale } = useLocale()

  const rows = useMemo<ConnRow[]>(() => {
    const out: ConnRow[] = []
    const seen = new Set<string>()
    for (const item of connections) {
      const target = humanizeEntityName(item.name, locale)
      const verb = getRelationshipLabel(item.type, locale)
      const gloss = REL_GLOSS_ZH[item.type] || `${verb}：两者之间存在这种关系`

      if (subject) {
        if (target === subject) continue // 自引用（如「罗马帝国建立 参与 罗马帝国建立」）跳过
        const tmpl = REL_PHRASE_ZH[item.type]
        if (tmpl) {
          const [rawPre, rawPost = ''] = tmpl.split('{o}')
          const pre = rawPre.replace('{s}', subject)
          const sentenceKey = pre + target + rawPost
          if (seen.has(sentenceKey)) continue
          seen.add(sentenceKey)
          out.push({ key: sentenceKey, verb, gloss, pre, target, post: rawPost })
        } else {
          // 未知关系类型兜底：主语 + 动词 + 宾语
          const plain = `${subject} ${verb} ${target}`
          if (seen.has(plain)) continue
          seen.add(plain)
          out.push({ key: plain, verb, gloss, pre: '', target: '', post: '', plain })
        }
      } else {
        const plain = `${verb}：${target}`
        if (seen.has(plain)) continue
        seen.add(plain)
        out.push({ key: plain, verb, gloss, pre: '', target: '', post: '', plain })
      }
    }
    return out
  }, [connections, subject, locale])

  return (
    <div className="result-section">
      <h3>{t('common.connectionsHeading')}</h3>
      {rows.length > 0 ? (
        <div className="conn-list">
          {rows.map((r) => (
            <div className="conn-row" key={r.key}>
              <span className="conn-tag" title={r.gloss}>
                {r.verb}
              </span>
              {r.plain ? (
                <span className="conn-sentence">{r.plain}</span>
              ) : (
                <span className="conn-sentence">
                  {r.pre}
                  <b>{r.target}</b>
                  {r.post}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">{t('common.connectionsEmpty')}</p>
      )}
    </div>
  )
}

export default ConnectionsPanel
