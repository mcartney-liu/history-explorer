import { updateResearch } from '../data/ResearchHistory'
import Icon from './ui/Icon'

export type ResearchBookmarkButtonProps = {
  researchId: string
  bookmarked: boolean
  labels?: string[]
  onUpdate?: () => void
}

export function ResearchBookmarkView({
  researchId,
  bookmarked,
  labels,
  onUpdate,
}: ResearchBookmarkButtonProps) {
  return (
    <button
      type="button"
      className={`rbk-btn${bookmarked ? ' rbk-btn--bookmarked' : ''}`}
      aria-label={bookmarked ? '已收藏，点击取消收藏' : '点击收藏该研究'}
      onClick={() => {
        updateResearch(researchId, { bookmarked: !bookmarked })
        onUpdate?.()
      }}
    >
      {bookmarked ? (
        <><Icon name="star" size={16} filled /> 已收藏</>
      ) : (
        <><Icon name="star" size={16} /> 收藏研究</>
      )}
      {labels && labels.length > 0 && (
        <span className="rbk-labels">
          {labels.slice(0, 3).map((l, i) => (
            <span key={i} className="rbk-label-tag">{l}</span>
          ))}
        </span>
      )}
    </button>
  )
}

export default ResearchBookmarkView
