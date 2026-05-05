import { getDb } from './db'

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb()
  const rows = await db.select<{ value: string }[]>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  )
  return rows.length > 0 ? rows[0].value : null
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = ?',
    [key, value, new Date().toISOString()]
  )
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDb()
  const rows = await db.select<{ key: string; value: string }[]>('SELECT key, value FROM settings')
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}
