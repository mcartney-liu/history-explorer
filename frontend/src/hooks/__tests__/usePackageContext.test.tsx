// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useRef } from 'react'
import { usePackageContext, type PackageContextApi } from '../usePackageContext'

function makeHarness(deps: { onOpenPackage?: (slug: string) => void } = {}) {
  const opened: string[] = []
  let api: PackageContextApi | null = null
  function Harness() {
    const ref = useRef<PackageContextApi | null>(null)
    ref.current = usePackageContext({
      onOpenPackage: (slug) => {
        opened.push(slug)
        deps.onOpenPackage?.(slug)
      },
    })
    api = ref.current
    return null
  }
  const root: Root = createRoot(document.createElement('div'))
  act(() => root.render(<Harness />))
  return { api: () => api!, opened, root }
}

beforeEach(() => {
  window.location.hash = ''
})

describe('usePackageContext (M73 package lifecycle + hash ownership)', () => {
  it('starts closed when no package hash is present', () => {
    const { api } = makeHarness()
    expect(api().packageSlug).toBeNull()
  })

  it('restores package from the URL hash on mount (hash restore)', () => {
    window.location.hash = '#/package/china-civilization-v1'
    const { api, opened } = makeHarness()
    expect(api().packageSlug).toBe('china-civilization-v1')
    // restore must NOT re-emit open_package (avoids duplicate telemetry)
    expect(opened).toHaveLength(0)
  })

  it('openPackage sets slug, writes the hash and emits telemetry once', () => {
    const { api, opened } = makeHarness()
    act(() => api().openPackage('roman-empire-exploration'))
    expect(api().packageSlug).toBe('roman-empire-exploration')
    expect(window.location.hash).toBe('#/package/roman-empire-exploration')
    expect(opened).toEqual(['roman-empire-exploration'])
  })

  it('closePackage clears slug + hash (Home / back-to-discover)', () => {
    const { api } = makeHarness()
    act(() => api().openPackage('india-classical-civilization'))
    expect(api().packageSlug).toBe('india-classical-civilization')
    act(() => api().closePackage())
    expect(api().packageSlug).toBeNull()
    expect(window.location.hash).toBe('')
  })

  it('keeps slug in sync with manual hash changes (hashchange listener)', () => {
    const { api } = makeHarness()
    act(() => {
      window.location.hash = '#/package/silk-road-exploration'
      window.dispatchEvent(new Event('hashchange'))
    })
    expect(api().packageSlug).toBe('silk-road-exploration')
    act(() => {
      window.location.hash = ''
      window.dispatchEvent(new Event('hashchange'))
    })
    expect(api().packageSlug).toBeNull()
  })

  it('openPackage with encodeURIComponent round-trips slug with special chars', () => {
    const { api } = makeHarness()
    act(() => api().openPackage('silk-road-2026+v1'))
    expect(api().packageSlug).toBe('silk-road-2026+v1')
  })
})
