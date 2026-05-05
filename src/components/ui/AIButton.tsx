interface AIButtonProps {
  onClick: () => void
  isOpen?: boolean
  disabled?: boolean
}

function LightningIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1L3 7h4l-2 4 6-7H7L9 1z" />
    </svg>
  )
}

export function AIButton({ onClick, isOpen = false, disabled = false }: AIButtonProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={disabled ? 'AI features need an API key — Set up in Settings →' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px',
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 6,
        border: `1px solid ${isOpen ? 'var(--color-gold)' : 'var(--border-medium)'}`,
        background: isOpen ? 'var(--color-gold-bg)' : 'transparent',
        color: isOpen ? 'var(--color-gold)' : disabled ? 'var(--text-muted)' : 'var(--text-dim)',
        cursor: disabled ? 'default' : 'pointer',
        pointerEvents: disabled ? 'none' : 'auto',
        transition: 'border-color 150ms, background 150ms, color 150ms',
      }}
    >
      <LightningIcon />
      AI
    </button>
  )
}
