import { describe, it, expect } from 'vitest'
import {
  formatTopicLabel,
  formatRelationship,
  type RelatedTopic,
  type CrossTopicRelated,
} from '../components/crossTopic'

describe('formatTopicLabel', () => {
  it('title-cases an underscored topic key', () => {
    expect(formatTopicLabel('roman_empire')).toBe('Roman Empire')
    expect(formatTopicLabel('early_christianity')).toBe('Early Christianity')
  })

  it('also handles hyphenated keys', () => {
    expect(formatTopicLabel('hellenistic-greece')).toBe('Hellenistic Greece')
  })

  it('keeps an already-pretty key intact', () => {
    expect(formatTopicLabel('Roman Empire')).toBe('Roman Empire')
  })
})

describe('formatRelationship', () => {
  it('falls back to "Related" when the relationship is missing', () => {
    expect(formatRelationship(null)).toBe('Related')
    expect(formatRelationship('')).toBe('Related')
  })

  it('title-cases a present relationship token', () => {
    expect(formatRelationship('conquered')).toBe('Conquered')
    expect(formatRelationship('born_in')).toBe('Born In')
  })
})

describe('cross-topic data shapes (regression guard for backend contract)', () => {
  it('RelatedTopic carries a topic + edge count', () => {
    const rt: RelatedTopic = { topic: 'roman_empire', cross_topic_edge_count: 3 }
    expect(rt.cross_topic_edge_count).toBe(3)
  })

  it('CrossTopicRelated exposes the backend-supplied global_id for navigation', () => {
    const ctr: CrossTopicRelated = {
      id: 'person-augustus',
      name: 'Augustus',
      type: 'person',
      global_id: 'roman_empire:person-augustus',
      topic: 'roman_empire',
      relationship: 'conquered',
      direction: 'out',
    }
    expect(ctr.global_id).toBe('roman_empire:person-augustus')
  })

  it('CrossTopicRelated fields may be null (defensive rendering)', () => {
    const ctr: CrossTopicRelated = {
      id: null,
      name: null,
      type: null,
      global_id: null,
      topic: null,
      relationship: null,
      direction: null,
    }
    expect(ctr.global_id).toBeNull()
  })
})
