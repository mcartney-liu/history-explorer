// ============================================================
// M90.3 — ProductIntro (shared landing block)
//
// Renders "History Explorer 能做什么" — the product capability
// showcase. This block appears on the landing page, positioned
// between the search area and the Discover/Landing content, so
// it's visible across all home-page tabs (了解/研究/扩展).
//
// Extracted from DiscoverPage.tsx (M44) to be a shared slot.
//
// ADR-0021 — copy and artwork are now editable at runtime via the
// Content Configuration Layer (#/admin). The rendering contract is
// unchanged; only the data source moved.
//
//   ① backend value        (GET /api/v1/content)
//   ② compiled-in default  (DEFAULT_CARDS, rendered synchronously)
//   ③ CSS placeholder      (img onError hides, card gradient shows)
//
// Tier ② is the INITIAL state, not a loading fallback: with no
// backend the first paint is already the finished page — no spinner,
// no layout shift, no empty frame. Remote values, when they differ,
// swap in silently afterwards.
// ============================================================

import { useEffect, useState } from 'react'
import { Card } from '../ui/Card'
import {
  DEFAULT_CARDS,
  cardImageSrc,
  cardTheme,
  cardsOfModule,
  fetchContent,
  slotKey,
  type CapabilityCard,
} from '../../data/contentApi'
import { applyContentDocument, slotImageFocus } from '../../data/contentRuntime'

export function ProductIntro() {
  const [cards, setCards] = useState<CapabilityCard[]>(() => DEFAULT_CARDS.map((c) => ({ ...c })))

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    fetchContent(controller.signal).then((document) => {
      // `fetchContent` never rejects — it returns null on any failure, so the
      // compiled-in defaults simply stay in place.
      if (!active || !document) return
      // The document covers every module in the registry; this block owns the
      // landing cards only. Filtering here (rather than trusting order) keeps
      // the component correct as slots are added elsewhere.
      const landing = cardsOfModule(document, 'landing')
      if (landing.length > 0) setCards(landing)
      // Warm the shared overlay while we are here: the landing page is the
      // usual entry point, so entity pages downstream render configured copy
      // on their first paint instead of swapping it in afterwards.
      applyContentDocument(document)
    })

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  return (
    <div className="discover-intro">
      <div className="discover-intro-content">
        <h3 className="discover-section-heading">History Explorer 能做什么</h3>
        <div className="discover-intro-grid">
          {cards.map((cap) => {
            const theme = cardTheme(cap.id)
            // Slot ids are namespaced (`landing.story`); the stylesheet hooks
            // predate that and use the bare key — a dot here would split the
            // class in two.
            const key = slotKey(cap.id)
            const focus = slotImageFocus(cap.id)
            return (
              <Card key={cap.id} variant="default" className={`discover-intro-card intro-theme-${theme} intro-card-${key}`}>
                {/* Photo IS the card: configured artwork, else the drop-in default
                    `public/assets/cards/card-<id>.jpg`, fills the whole card; copy
                    floats on it. No paper panel, no icon medallion — the artwork
                    already carries the label. */}
                <div className="discover-intro-art" aria-hidden="true">
                  <img
                    className="discover-intro-art-img"
                    src={cardImageSrc(cap)}
                    alt=""
                    loading="lazy"
                    style={focus ? { objectPosition: focus } : undefined}
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
                <h4 className="discover-intro-title">{cap.title}</h4>
                <p className="discover-intro-desc">{cap.desc}</p>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
