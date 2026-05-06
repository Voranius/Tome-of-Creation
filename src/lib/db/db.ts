import Database from '@tauri-apps/plugin-sql'

let _db: Database | null = null

export async function getDb(): Promise<Database> {
  if (!_db) throw new Error('Database not initialized. Open a project first.')
  return _db
}

export async function initDb(dbPath: string): Promise<void> {
  _db = await Database.load(`sqlite:${dbPath}`)
}

export async function checkpointAndCloseDb(): Promise<void> {
  if (!_db) return

  const db = _db
  _db = null

  try {
    await db.execute('PRAGMA wal_checkpoint(TRUNCATE)')
  } catch (error) {
    console.error('Failed to checkpoint project database:', error)
  }

  try {
    await db.close()
  } catch (error) {
    console.error('Failed to close project database:', error)
    throw error
  }
}
