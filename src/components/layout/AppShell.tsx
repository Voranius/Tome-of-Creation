import { useEffect, useRef } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { closeOpenProject, saveOpenProject } from '../../lib/projectPersistence'
import { Rail } from './Rail'
import { WritingScreen } from '../../screens/WritingScreen'
import { CodexScreen } from '../../screens/CodexScreen'
import { SeriesPlannerScreen } from '../../screens/SeriesPlannerScreen'
import { LoomScreen } from '../../screens/LoomScreen'
import { NotesScreen } from '../../screens/NotesScreen'
import { SearchScreen } from '../../screens/SearchScreen'
import { SettingsScreen } from '../../screens/SettingsScreen'
import { useProjectStore } from '../../store/projectStore'
import { useUIStore } from '../../store/uiStore'
import type { Screen } from '../../store/uiStore'

export function AppShell() {
  const setLastSaved = useProjectStore(s => s.setLastSaved)
  const isProjectOpen = useProjectStore(s => s.isOpen)
  const dbPath = useProjectStore(s => s.dbPath)
  const activeScreen = useUIStore(s => s.activeScreen)
  const navigate = useUIStore(s => s.navigate)
  const isClosingRef = useRef(false)

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && dbPath) {
        e.preventDefault()
        await saveOpenProject(dbPath)
        setLastSaved(new Date())
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dbPath, setLastSaved])

  useEffect(() => {
    const currentWindow = getCurrentWindow()
    let isMounted = true

    const teardownPromise = currentWindow.onCloseRequested(async event => {
      if (isClosingRef.current || !isProjectOpen) {
        return
      }

      event.preventDefault()
      isClosingRef.current = true

      try {
        await closeOpenProject()
        if (isMounted) {
          setLastSaved(new Date())
        }
        await currentWindow.close()
      } catch (error) {
        isClosingRef.current = false
        console.error('Failed to close project cleanly:', error)
      }
    })

    return () => {
      isMounted = false
      void teardownPromise.then(unlisten => unlisten())
    }
  }, [isProjectOpen, setLastSaved])

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
      <Rail activeScreen={activeScreen} onNavigate={navigate} />
      <main style={{ flex: 1, minWidth: 0, overflow: 'hidden', background: 'var(--color-main)' }}>
        {screens[activeScreen]}
      </main>
    </div>
  )
}
