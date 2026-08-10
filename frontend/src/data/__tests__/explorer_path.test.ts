/** M85.9.3 — ExplorerPath instrumentation tests. */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock localStorage
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

import {
  startPath,
  recordVisit,
  recordQuestion,
  completePath,
  discardPath,
  getPaths,
  clearPaths,
  type ExplorerSessionPath,
} from '../ExplorerPath'

beforeEach(() => {
  clearPaths()
})

afterEach(() => {
  clearPaths()
})

describe('ExplorerPath', () => {
  it('startPath creates a current session', () => {
    startPath('institutional_evolution', '一个庞大的国家，如何解决治理千万人的问题？')
    const raw = localStorage.getItem('current_explorer_path')
    expect(raw).not.toBeNull()
    const path: ExplorerSessionPath = JSON.parse(raw!)
    expect(path.seedId).toBe('institutional_evolution')
    expect(path.seedQuestion).toBe('一个庞大的国家，如何解决治理千万人的问题？')
    expect(path.visitedObjects).toEqual([])
    expect(path.depth).toBe(0)
  })

  it('recordVisit appends visited objects and updates depth', () => {
    startPath('civilization_contrast', '为什么有些文明选择法律治理？')
    recordVisit('co-009')
    recordVisit('co-004')
    recordVisit('co-001')

    const raw = localStorage.getItem('current_explorer_path')
    const path: ExplorerSessionPath = JSON.parse(raw!)
    expect(path.visitedObjects).toEqual(['co-009', 'co-004', 'co-001'])
    expect(path.depth).toBe(3)
  })

  it('recordVisit does not duplicate objects', () => {
    startPath('technological_chain', '人类如何保存和传播知识？')
    recordVisit('co-008')
    recordVisit('co-011')
    recordVisit('co-008') // duplicate

    const raw = localStorage.getItem('current_explorer_path')
    const path: ExplorerSessionPath = JSON.parse(raw!)
    expect(path.visitedObjects).toEqual(['co-008', 'co-011'])
    expect(path.depth).toBe(2)
  })

  it('recordQuestion stores explorer question', () => {
    startPath('institutional_evolution', '治理问题')
    recordQuestion('那西方为什么没有走这条路线？')

    const raw = localStorage.getItem('current_explorer_path')
    const path: ExplorerSessionPath = JSON.parse(raw!)
    expect(path.explorerQuestion).toBe('那西方为什么没有走这条路线？')
  })

  it('completePath persists to paths store and clears current', () => {
    startPath('institutional_evolution', '治理问题')
    recordVisit('co-004')
    recordVisit('co-001')
    completePath()

    const paths = getPaths()
    expect(paths).toHaveLength(1)
    expect(paths[0].visitedObjects).toEqual(['co-004', 'co-001'])
    expect(paths[0].depth).toBe(2)
    expect(paths[0].seedQuestion).toBe('治理问题')

    // Current session cleared
    expect(localStorage.getItem('current_explorer_path')).toBeNull()
  })

  it('completePath ignores empty sessions', () => {
    startPath('institutional_evolution', '治理问题')
    completePath()

    const paths = getPaths()
    expect(paths).toHaveLength(0)
  })

  it('discardPath clears current without persisting', () => {
    startPath('institutional_evolution', '治理问题')
    recordVisit('co-004')
    discardPath()

    expect(localStorage.getItem('current_explorer_path')).toBeNull()
    expect(getPaths()).toHaveLength(0)
  })

  it('getPaths returns all completed sessions', () => {
    startPath('institutional_evolution', 'Q1')
    recordVisit('co-004')
    completePath()

    startPath('civilization_contrast', 'Q2')
    recordVisit('co-009')
    recordVisit('co-004')
    completePath()

    const paths = getPaths()
    expect(paths).toHaveLength(2)
    expect(paths[0].seedQuestion).toBe('Q1')
    expect(paths[1].seedQuestion).toBe('Q2')
    expect(paths[1].depth).toBe(2)
  })

  it('version field is present in store', () => {
    startPath('institutional_evolution', 'Q1')
    recordVisit('co-004')
    completePath()

    const raw = localStorage.getItem('explorer_paths')
    const store = JSON.parse(raw!)
    expect(store.version).toBe(1)
  })
})
