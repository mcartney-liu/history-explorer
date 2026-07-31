import { describe, it, expect } from 'vitest'
import { normalizeQuery, resolveTopic } from './topicResolver'

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
})
