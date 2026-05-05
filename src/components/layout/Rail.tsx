type Screen = 'writing' | 'codex' | 'planner' | 'loom' | 'notes' | 'search' | 'settings'

interface RailProps {
  activeScreen: Screen
  onNavigate: (screen: Screen) => void
}

interface NavItem {
  screen: Screen
  title: string
  icon: React.ReactNode
}

function WritingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 14l9-9 2 2-9 9H3v-2z" />
      <path d="M11 4l2-2 2 2-2 2-2-2z" />
    </svg>
  )
}

function CodexIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h5a2 2 0 0 1 2 2v10a1.5 1.5 0 0 0-1.5-1.5H3V3z" />
      <path d="M15 3h-5a2 2 0 0 0-2 2v10a1.5 1.5 0 0 1 1.5-1.5H15V3z" />
    </svg>
  )
}

function PlannerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="14" height="13" rx="2" />
      <path d="M6 2v2M12 2v2" />
      <path d="M2 7h14" />
      <path d="M6 11h2M10 11h2M6 14h2" />
    </svg>
  )
}

function LoomIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H9l-4 2v-2H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    </svg>
  )
}

function NotesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M6 6h6M6 9h6M6 12h4" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="5" />
      <path d="M15 15l-3.5-3.5" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="2.5" />
      <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.41 1.41M13.37 13.37l1.41 1.41M3.22 14.78l1.41-1.41M13.37 4.63l1.41-1.41" />
    </svg>
  )
}

export function Rail({ activeScreen, onNavigate }: RailProps) {
  const topItems: NavItem[] = [
    { screen: 'writing', title: 'Writing', icon: <WritingIcon /> },
    { screen: 'codex', title: 'Codex', icon: <CodexIcon /> },
    { screen: 'planner', title: 'Series Planner', icon: <PlannerIcon /> },
  ]

  const bottomItems: NavItem[] = [
    { screen: 'loom', title: 'The Loom', icon: <LoomIcon /> },
    { screen: 'notes', title: 'Notes', icon: <NotesIcon /> },
    { screen: 'search', title: 'Search', icon: <SearchIcon /> },
    { screen: 'settings', title: 'Settings', icon: <SettingsIcon /> },
  ]

  return (
    <nav
      style={{
        width: 52,
        flexShrink: 0,
        background: 'var(--color-rail)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {topItems.map((item) => (
          <RailButton
            key={item.screen}
            item={item}
            active={activeScreen === item.screen}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {bottomItems.map((item) => (
          <RailButton
            key={item.screen}
            item={item}
            active={activeScreen === item.screen}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  )
}

function RailButton({
  item,
  active,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  onNavigate: (screen: Screen) => void
}) {
  return (
    <button
      title={item.title}
      onClick={() => onNavigate(item.screen)}
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        border: 'none',
        background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
        color: active ? 'var(--color-gold)' : 'var(--text-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 150ms, color 150ms',
        flexShrink: 0,
      }}
    >
      {item.icon}
    </button>
  )
}
