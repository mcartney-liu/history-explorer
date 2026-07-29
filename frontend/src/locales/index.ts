import type { Locale } from '../lib/preferences'

import zhCommon from './zh/common'
import zhApp from './zh/app'
import zhDiscover from './zh/discover'
import zhEntity from './zh/entity'
import zhRelationship from './zh/relationship'
import zhTimeline from './zh/timeline'
import zhWorkspace from './zh/workspace'
import zhAi from './zh/ai'
import zhErrors from './zh/errors'
import zhPicker from './zh/picker'

import enCommon from './en/common'
import enApp from './en/app'
import enDiscover from './en/discover'
import enEntity from './en/entity'
import enRelationship from './en/relationship'
import enTimeline from './en/timeline'
import enWorkspace from './en/workspace'
import enAi from './en/ai'
import enErrors from './en/errors'
import enPicker from './en/picker'

import jaCommon from './ja/common'
import jaApp from './ja/app'
import jaDiscover from './ja/discover'
import jaEntity from './ja/entity'
import jaRelationship from './ja/relationship'
import jaTimeline from './ja/timeline'
import jaWorkspace from './ja/workspace'
import jaAi from './ja/ai'
import jaErrors from './ja/errors'
import jaPicker from './ja/picker'

type FlatMessages = Record<string, string>

function merge(...parts: FlatMessages[]): FlatMessages {
  return Object.assign({}, ...parts)
}

const zh: FlatMessages = merge(
  zhCommon,
  zhApp,
  zhDiscover,
  zhEntity,
  zhRelationship,
  zhTimeline,
  zhWorkspace,
  zhAi,
  zhErrors,
  zhPicker,
)
const en: FlatMessages = merge(
  enCommon,
  enApp,
  enDiscover,
  enEntity,
  enRelationship,
  enTimeline,
  enWorkspace,
  enAi,
  enErrors,
  enPicker,
)
const ja: FlatMessages = merge(
  jaCommon,
  jaApp,
  jaDiscover,
  jaEntity,
  jaRelationship,
  jaTimeline,
  jaWorkspace,
  jaAi,
  jaErrors,
  jaPicker,
)

const MESSAGES: Record<Locale, FlatMessages> = { zh, en, ja }
const FALLBACK: Locale = 'zh'

// lookup: 精确 locale -> zh fallback -> key 本身（防空白/key 泄漏）
export function lookup(locale: Locale, key: string): string {
  const lm = MESSAGES[locale]
  if (lm && Object.prototype.hasOwnProperty.call(lm, key)) return lm[key]
  const fb = MESSAGES[FALLBACK]
  if (fb && Object.prototype.hasOwnProperty.call(fb, key)) return fb[key]
  return key
}
