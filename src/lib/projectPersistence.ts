import { invoke } from '@tauri-apps/api/core'
import { flushAutosaves } from './autosaveRegistry'
import { checkpointAndCloseDb, initDb } from './db/db'

export async function saveOpenProject(dbPath: string): Promise<void> {
  await flushAutosaves()
  await checkpointAndCloseDb()

  try {
    await invoke('save_project')
  } finally {
    await initDb(dbPath)
  }
}

export async function closeOpenProject(): Promise<void> {
  await flushAutosaves()
  await checkpointAndCloseDb()
  await invoke('close_project')
}
