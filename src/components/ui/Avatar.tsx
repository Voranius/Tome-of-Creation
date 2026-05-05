interface AvatarProps {
  name: string
  size?: number
  colorVar?: string
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export function Avatar({ name, size = 28, colorVar = 'var(--color-gold)' }: AvatarProps) {
  const initials = getInitials(name)
  const fontSize = Math.round(size * 0.4)

  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 600,
        color: colorVar,
        border: `1px solid color-mix(in srgb, ${colorVar} 30%, transparent)`,
        background: `color-mix(in srgb, ${colorVar} 15%, transparent)`,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  )
}
