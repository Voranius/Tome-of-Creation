import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Rail } from './Rail'
import { WritingScreen } from '../../screens/WritingScreen'
import { CodexScreen } from '../../screens/CodexScreen'
import { SeriesPlannerScreen } from '../../screens/SeriesPlannerScreen'
import { LoomScreen } from '../../screens/LoomScreen'
import { NotesScreen } from '../../screens/NotesScreen'
import { SearchScreen } from '../../screens/SearchScreen'
import { SettingsScreen } from '../../screens/SettingsScreen'
import { useProjectStore } from '../../store/projectStore'

type Screen = 'writing' | 'codex' | 'planner' | 'loom' | 'notes' | 'search' | 'settings'

interface AppShellProps {
  onClose?: () => void
}

export function AppShell(_props: AppShellProps = {}) {
  const [activeScreen, setActiveScreen] = useState<Screen>('writing')
  const setLastSaved = useProjectStore(s => s.setLastSaved)

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        await invoke('save_project')
        setLastSaved(new Date())
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setLastSaved])

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
