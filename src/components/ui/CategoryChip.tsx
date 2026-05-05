export type Category = 'characters' | 'locations' | 'factions' | 'magic' | 'events' | 'items' | 'manuscript'

interface CategoryChipProps {
  category: Category
  label: string
  size?: 'sm' | 'md'
}

const CATEGORY_CSS_VAR: Record<Category, string> = {
  characters: 'var(--color-characters)',
  locations:  'var(--color-locations)',
  factions:   'var(--color-factions)',
  magic:      'var(--color-magic)',
  events:     'var(--color-events)',
  items:      'var(--color-items)',
  manuscript: 'var(--color-manuscript)',
}

// Known RGB values for tint calculations — matches tokens.css exactly
const CATEGORY_RGB: Record<Category, string> = {
  characters: '201,168,76',
  locations:  '61,158,138',
  factions:   '74,179,212',
  magic:      '123,94,167',
  events:     '196,122,138',
  items:      '196,130,74',
  manuscript: '106,158,90',
}

export function CategoryChip({ category, label, size = 'md' }: CategoryChipProps) {
  const rgb = CATEGORY_RGB[category]
  const cssVar = CATEGORY_CSS_VAR[category]

  const padding = size === 'sm' ? '2px 8px' : '3px 10px'
  const fontSize = 11

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding,
        fontSize,
        fontWeight: 500,
        borderRadius: 10,
        background: `rgba(${rgb}, 0.08)`,
        border: `1px solid rgba(${rgb}, 0.20)`,
        color: cssVar,
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          flexShrink: 0,
          background: cssVar,
        }}
      />
      {label}
    </span>
  )
}
