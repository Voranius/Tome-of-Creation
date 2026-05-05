import { getDb } from './db'
import type { Note } from './types'

export async function getNotes(): Promise<Note[]> {
  const db = await getDb()
  return db.select<Note[]>(
    'SELECT * FROM notes WHERE is_archived = 0 ORDER BY updated_at DESC'
  )
}

export async function getNote(id: number): Promise<Note> {
  const db = await getDb()
  const rows = await db.select<Note[]>('SELECT * FROM notes WHERE id = ?', [id])
  if (rows.length === 0) throw new Error(`Note ${id} not found`)
  return rows[0]
}

export async function createNote(): Promise<Note> {
  const db = await getDb()
  const result = await db.execute('INSERT INTO notes (title) VALUES (?)', ['Untitled Note'])
  const rows = await db.select<Note[]>('SELECT * FROM notes WHERE id = ?', [result.lastInsertId])
  return rows[0]
}

export async function updateNote(
  id: number,
  data: Partial<Pick<Note, 'title' | 'content' | 'word_count'>>
): Promise<void> {
  const db = await getDb()
  const fields = Object.keys(data) as (keyof typeof data)[]
  if (fields.length === 0) return
  const set = fields.map(f => `${f} = ?`).join(', ')
  const values = [...fields.map(f => data[f]), new Date().toISOString(), id]
  await db.execute(`UPDATE notes SET ${set}, updated_at = ? WHERE id = ?`, values)
}

export async function archiveNote(id: number): Promise<void> {
  const db = await getDb()
  await db.execute(
    'UPDATE notes SET is_archived = 1, updated_at = ? WHERE id = ?',
    [new Date().toISOString(), id]
  )
}
