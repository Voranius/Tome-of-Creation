interface PanelProps {
  width?: number
  children: React.ReactNode
  className?: string
}

export function Panel({ width = 260, children, className }: PanelProps) {
  return (
    <aside
      className={className}
      style={{
        width,
        background: 'var(--color-panel)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
      }}
    >
      {children}
    </aside>
  )
}
