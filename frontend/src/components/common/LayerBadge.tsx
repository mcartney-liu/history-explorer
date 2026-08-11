/** M82 P3 — LayerBadge: Information Trust Presentation component.

 *  Pure presentational.  Does NOT read any data source.
 *  The parent component decides which layer to display based on its
 *  data context (CausalStatement → "causal", Signal → "inference",
 *  Evidence → "evidence").
 *
 *  M85+ will extend this with onClick for traceability.
 */
import { useLocale } from '../../data/locale'

export type LayerType = 'causal' | 'inference' | 'evidence'

interface LayerBadgeProps {
  layer: LayerType
}

const LAYER_I18N: Record<LayerType, string> = {
  causal: 'layer.causal',
  inference: 'layer.inference',
  evidence: 'layer.evidence',
}

export default function LayerBadge({ layer }: LayerBadgeProps) {
  const { t } = useLocale()
  const key = LAYER_I18N[layer]

  return (
    <span
      className={`layer-badge layer-badge--${layer}`}
      aria-label={key ? t(key) : layer}
    >
      {key ? t(key) : layer}
    </span>
  )
}
