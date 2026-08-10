import { describe, it, expect } from 'vitest'
import {
  normalizeQuery,
  resolveTopic,
  searchTopics,
  detectIntent,
  resolveEntryQuery,
} from './topicResolver'

describe('topicResolver (M74 Phase1 — deterministic, no AI)', () => {
  describe('normalizeQuery', () => {
    it('strips full-width and half-width punctuation and whitespace', () => {
      expect(normalizeQuery('凯撒为什么重要？')).toBe('凯撒为什么重要')
      expect(normalizeQuery(' 罗马为什么灭亡? ')).toBe('罗马为什么灭亡')
      expect(normalizeQuery('丝绸之路，改变了什么！')).toBe('丝绸之路改变了什么')
    })

    it('lowercases latin input', () => {
      expect(normalizeQuery('ROMAN_EMPIRE')).toBe('roman_empire')
    })

    it('returns empty string for blank / punctuation-only input', () => {
      expect(normalizeQuery('')).toBe('')
      expect(normalizeQuery('  ')).toBe('')
      expect(normalizeQuery('？？？')).toBe('')
    })
  })

  describe('resolveTopic — QUICK_STARTS explicit mapping', () => {
    it.each([
      ['凯撒为什么重要？', 'roman-empire-exploration'],
      ['秦始皇统一六国以后发生了什么？', 'china-civilization-v1'],
      ['罗马为什么灭亡？', 'roman-empire-exploration'],
      ['丝绸之路改变了什么？', 'silk-road-exploration'],
    ])('maps %s -> %s', (q, slug) => {
      expect(resolveTopic(q)).toEqual({ kind: 'package', slug })
    })

    it('maps with punctuation variations (full/half width, trailing spaces)', () => {
      expect(resolveTopic('凯撒为什么重要')).toEqual({
        kind: 'package',
        slug: 'roman-empire-exploration',
      })
      expect(resolveTopic(' 凯撒为什么重要? ')).toEqual({
        kind: 'package',
        slug: 'roman-empire-exploration',
      })
    })
  })

  describe('resolveTopic — entity exact match (package entities)', () => {
    it('resolves a Chinese label to its entity global id', () => {
      expect(resolveTopic('唐朝')).toEqual({ kind: 'entity', globalId: 'china_v1:tp-tang' })
    })

    it('resolves an alias to its entity global id', () => {
      const r = resolveTopic('奥古斯都')
      expect(r).toEqual({ kind: 'entity', globalId: 'roman_empire:person-augustus' })
    })

    it('resolves an English name too', () => {
      expect(resolveTopic('Augustus')).toEqual({
        kind: 'entity',
        globalId: 'roman_empire:person-augustus',
      })
    })
  })

  describe('resolveTopic — package title match', () => {
    it('resolves a full package title', () => {
      expect(resolveTopic('丝绸之路探索包 V1')).toEqual({
        kind: 'package',
        slug: 'silk-road-exploration',
      })
    })

    it('resolves a partial title via contains fallback', () => {
      expect(resolveTopic('丝绸之路')).toEqual({
        kind: 'package',
        slug: 'silk-road-exploration',
      })
      expect(resolveTopic('罗马帝国')).toEqual({
        kind: 'package',
        slug: 'roman-empire-exploration',
      })
    })
  })

  describe('resolveTopic — no match', () => {
    it('returns null for unknown input', () => {
      expect(resolveTopic('不存在的主题xyz')).toBeNull()
      expect(resolveTopic('zzz-no-such-topic-999')).toBeNull()
    })

    it('returns null for empty / punctuation-only input', () => {
      expect(resolveTopic('')).toBeNull()
      expect(resolveTopic('   ')).toBeNull()
      expect(resolveTopic('？！')).toBeNull()
    })

    it('never throws on arbitrary input', () => {
      expect(() => resolveTopic(null as unknown as string)).not.toThrow()
      expect(() => resolveTopic(undefined as unknown as string)).not.toThrow()
    })
  })

  describe('Wave2-#137 — semantic entry retrieval (searchTopics)', () => {
    it('matches a partial natural question to the right package', () => {
      const r = searchTopics('罗马共和国是怎么建立的')
      expect(r.length).toBeGreaterThan(0)
      // The relevant Exploration Package must surface (a specific event entity
      // may out-rank it; both are valid entry points for this question).
      expect(r.map((c) => c.slug)).toContain('roman-empire-exploration')
    })

    it('surfaces a package via summary/description keywords (not just title)', () => {
      const r = searchTopics('丝绸之路贸易改变了什么')
      expect(r.some((c) => c.kind === 'package' && c.slug === 'silk-road-exploration')).toBe(true)
    })

    it('resolves a question to a specific entity via synonym expansion', () => {
      const r = searchTopics('凯撒之死')
      expect(r[0].kind).toBe('entity')
      expect(r[0].globalId).toBe('roman_empire:person-julius-caesar')
    })

    it('expands Chinese abbreviations (唐 -> 唐朝) into the China package', () => {
      // Many specific Tang entities out-rank the container package, so use a
      // larger limit to confirm the package still surfaces via synonym exp.
      const r = searchTopics('唐的文化成就', 30)
      expect(r.some((c) => c.kind === 'package' && c.slug === 'china-civilization-v1')).toBe(true)
    })

    it('returns an empty list for clearly unrelated input', () => {
      expect(searchTopics('苹果手机最新款')).toEqual([])
      expect(searchTopics('zzz-no-such-topic-999')).toEqual([])
    })

    it('respects the limit argument', () => {
      const r = searchTopics('罗马', 3)
      expect(r.length).toBeLessThanOrEqual(3)
      expect(r.length).toBeGreaterThan(0)
    })

    it('never throws on arbitrary input', () => {
      expect(() => searchTopics(null as unknown as string)).not.toThrow()
      expect(() => searchTopics('')).not.toThrow()
    })
  })

  describe('Wave2-#137 — intent detection (detectIntent)', () => {
    it('routes why/how questions to understanding mode', () => {
      expect(detectIntent('罗马为什么灭亡')).toBe('understanding')
      expect(detectIntent('秦朝是怎么建立的')).toBe('understanding')
    })

    it('treats plain topic input as browse', () => {
      expect(detectIntent('罗马帝国')).toBe('browse')
      expect(detectIntent('丝绸之路')).toBe('browse')
    })
  })

  describe('Wave2-#137 — full entry resolution (resolveEntryQuery)', () => {
    it('resolves a why-question to a package in understanding mode', () => {
      const r = resolveEntryQuery('罗马为什么灭亡')
      expect(r.intent).toBe('understanding')
      expect(r.resolution).toEqual({ kind: 'package', slug: 'roman-empire-exploration' })
    })

    it('routes the French-Revolution question to a soft understanding topic', () => {
      const r = resolveEntryQuery('法国大革命为什么发生')
      expect(r.intent).toBe('understanding')
      expect(r.resolution).toEqual({ kind: 'topic', slug: 'french-revolution' })
    })

    it('falls back to null resolution for unrelated input', () => {
      const r = resolveEntryQuery('苹果手机')
      expect(r.resolution).toBeNull()
      expect(r.intent).toBe('browse')
    })
  })
})
