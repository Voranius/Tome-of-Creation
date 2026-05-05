import { invoke } from '@tauri-apps/api/core'
import { save, open } from '@tauri-apps/plugin-dialog'
import { initDb } from '../lib/db/db'
import { useProjectStore } from '../store/projectStore'
import type { ProjectData } from '../lib/db/types'

export function WelcomeScreen() {
  const openProject = useProjectStore(s => s.openProject)

  async function handleNewProject() {
    const filePath = await save({
      title: 'Create New Project',
      defaultPath: 'My Project.tome',
      filters: [{ name: 'Tome Project', extensions: ['tome'] }],
    })
    if (!filePath) return

    const title = filePath.split('/').pop()?.replace(/\.tome$/, '') ?? 'Untitled'
    const data = await invoke<ProjectData>('create_project', { path: filePath, title })
    await initDb(data.db_path)
    openProject({ ...data, dbPath: data.db_path })
  }

  async function handleOpenProject() {
    const selected = await open({
      title: 'Open Project',
      multiple: false,
      filters: [{ name: 'Tome Project', extensions: ['tome'] }],
    })
    if (!selected || Array.isArray(selected)) return

    const data = await invoke<ProjectData>('open_project', { path: selected })
    await initDb(data.db_path)
    openProject({ ...data, dbPath: data.db_path })
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      background: 'var(--color-main)',
      gap: 40,
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: 36,
          fontWeight: 700,
          color: 'var(--color-gold)',
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          Tome of Creation
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 14 }}>
          Your world, your story.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 260 }}>
        <button
          onClick={handleNewProject}
          style={{
            padding: '12px 24px',
            background: 'var(--color-gold)',
            color: '#141210',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          New Project
        </button>
        <button
          onClick={handleOpenProject}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            color: 'var(--text-dim)',
            border: '1px solid var(--border-medium)',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Open Project
        </button>
      </div>
    </div>
  )
}
