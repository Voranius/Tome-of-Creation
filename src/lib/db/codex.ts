import { getDb } from './db'
import type { CodexEntry } from './types'

export async function getEntries(category?: string): Promise<CodexEntry[]> {
  const db = await getDb()
  if (category) {
    return db.select<CodexEntry[]>(
      'SELECT * FROM codex_entries WHERE category = ? AND is_archived = 0 ORDER BY title ASC',
      [category]
    )
  }
  return db.select<CodexEntry[]>(
    'SELECT * FROM codex_entries WHERE is_archived = 0 ORDER BY category ASC, title ASC'
  )
}

export async function getEntry(id: number): Promise<CodexEntry> {
  const db = await getDb()
  const rows = await db.select<CodexEntry[]>('SELECT * FROM codex_entries WHERE id = ?', [id])
  if (rows.length === 0) throw new Error(`Codex entry ${id} not found`)
  return rows[0]
}

export async function createEntry(
  data: Pick<CodexEntry, 'category' | 'title'>
): Promise<CodexEntry> {
  const db = await getDb()
  const result = await db.execute(
    'INSERT INTO codex_entries (category, title) VALUES (?, ?)',
    [data.category, data.title]
  )
  const rows = await db.select<CodexEntry[]>(
    'SELECT * FROM codex_entries WHERE id = ?',
    [result.lastInsertId]
  )
  return rows[0]
}

export async function updateEntry(
  id: number,
  data: Partial<Pick<CodexEntry, 'title' | 'content' | 'summary' | 'tags'>>
): Promise<void> {
  const db = await getDb()
  const fields = Object.keys(data) as (keyof typeof data)[]
  if (fields.length === 0) return
  const set = fields.map(f => `${f} = ?`).join(', ')
  const values = [...fields.map(f => data[f]), new Date().toISOString(), id]
  await db.execute(`UPDATE codex_entries SET ${set}, updated_at = ? WHERE id = ?`, values)
}

export async function archiveEntry(id: number): Promise<void> {
  const db = await getDb()
  await db.execute(
    'UPDATE codex_entries SET is_archived = 1, updated_at = ? WHERE id = ?',
    [new Date().toISOString(), id]
  )
}
