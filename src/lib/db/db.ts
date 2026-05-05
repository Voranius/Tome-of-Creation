import Database from '@tauri-apps/plugin-sql'

let _db: Database | null = null

export async function getDb(): Promise<Database> {
  if (!_db) throw new Error('Database not initialized. Open a project first.')
  return _db
}

export async function initDb(dbPath: string): Promise<void> {
  _db = await Database.load(`sqlite:${dbPath}`)
}

export function closeDb(): void {
  _db = null
}
