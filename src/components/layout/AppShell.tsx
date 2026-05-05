import { useState } from 'react'
import { Rail } from './Rail'
import { WritingScreen } from '../../screens/WritingScreen'
import { CodexScreen } from '../../screens/CodexScreen'
import { SeriesPlannerScreen } from '../../screens/SeriesPlannerScreen'
import { LoomScreen } from '../../screens/LoomScreen'
import { NotesScreen } from '../../screens/NotesScreen'
import { SearchScreen } from '../../screens/SearchScreen'
import { SettingsScreen } from '../../screens/SettingsScreen'

type Screen = 'writing' | 'codex' | 'planner' | 'loom' | 'notes' | 'search' | 'settings'

export function AppShell() {
  const [activeScreen, setActiveScreen] = useState<Screen>('writing')

  const screens: Record<Screen, React.ReactNode> = {
    writing:  <WritingScreen />,
    codex:    <CodexScreen />,
    planner:  <SeriesPlannerScreen />,
    loom:     <LoomScreen />,
    notes:    <NotesScreen />,
    search:   <SearchScreen />,
    settings: <SettingsScreen />,
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Rail activeScreen={activeScreen} onNavigate={setActiveScreen} />
      <main style={{ flex: 1, minWidth: 0, overflow: 'hidden', background: 'var(--color-main)' }}>
        {screens[activeScreen]}
      </main>
    </div>
  )
}
