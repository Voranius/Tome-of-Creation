interface TopBarProps {
  title?: string
  actions?: React.ReactNode
}

export function TopBar({ title, actions }: TopBarProps) {
  return (
    <header
      style={{
        height: 48,
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      {title && (
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
          {title}
        </span>
      )}
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div>}
    </header>
  )
}
