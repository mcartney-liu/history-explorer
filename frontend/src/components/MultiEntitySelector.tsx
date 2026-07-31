import { Icon } from './ui/Icon'
import { useLocale } from '../data/locale'
import { getEntityLabel } from '../data/entity/entityLabels'

export type SelectableEntity = {
  id: string
  globalId?: string
  name: string
  type: string
}

export type MultiEntitySelectorProps = {
  /** Currently selected comparison entities (excluding the primary). */
  selected: SelectableEntity[]
  /** Available entities to select from (e.g., from relationships). */
  available: SelectableEntity[]
  /** Maximum comparison entities allowed (default 3 including primary). */
  maxEntities?: number
  /** Callback when selection changes. */
  onChange: (selected: SelectableEntity[]) => void
}

export function MultiEntitySelectorView({
  selected,
  available,
  maxEntities = 3,
  onChange,
}: MultiEntitySelectorProps) {
  const { locale } = useLocale()
  const remaining = maxEntities - 1 - selected.length
  const candidateEntities = available.filter(
    (a) => !selected.some((s) => s.id === a.id),
  )

  return (
    <div className="mes">
      <span className="mes-label">比较对象：</span>

      {/* Selected entities as tags */}
      {selected.map((e) => (
        <span key={e.id} className="mes-tag">
          <span className="mes-tag-type">{getEntityLabel(e.type, locale)}</span>
          {e.name}
          <button
            type="button"
            className="mes-tag-remove"
            aria-label={`移除 ${e.name}`}
            onClick={() => onChange(selected.filter((s) => s.id !== e.id))}
          >
            <Icon name="close" size={16} className="mes-tag-remove-icon" />
          </button>
        </span>
      ))}

      {/* Add button or limit reached */}
      {remaining > 0 && candidateEntities.length > 0 ? (
        <select
          className="mes-add"
          value=""
          onChange={(e) => {
            const entity = available.find((a) => a.id === e.target.value)
            if (entity) onChange([...selected, entity])
          }}
          aria-label="添加比较对象"
        >
          <option value="">+ 添加比较对象</option>
          {candidateEntities.map((e) => (
            <option key={e.id} value={e.id}>
              {getEntityLabel(e.type, locale)}: {e.name}
            </option>
          ))}
        </select>
      ) : remaining <= 0 ? (
        <span className="mes-limit">最多选择 3 个研究对象</span>
      ) : null}
    </div>
  )
}

export default MultiEntitySelectorView
