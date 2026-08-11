import { getDb } from './db'
import type { SeriesBeat } from './types'

type NewSeriesBeat = Omit<SeriesBeat, 'id' | 'created_at' | 'updated_at'>
type UpdateSeriesBeat = Partial<Omit<SeriesBeat, 'id' | 'created_at' | 'updated_at'>>

export async function getBeats(bookId: number | null): Promise<SeriesBeat[]> {
  const db = await getDb()
  if (bookId === null) {
    return db.select<SeriesBeat[]>('SELECT * FROM series_beats WHERE book_id IS NULL ORDER BY position ASC')
  }
  return db.select<SeriesBeat[]>('SELECT * FROM series_beats WHERE book_id = ? ORDER BY position ASC', [bookId])
}

export async function createBeat(data: NewSeriesBeat): Promise<SeriesBeat> {
  const db = await getDb()
  const result = await db.execute(
    'INSERT INTO series_beats (book_id, title, description, beat_type, position, color) VALUES (?, ?, ?, ?, ?, ?)',
    [data.book_id, data.title, data.description ?? null, data.beat_type ?? null, data.position, data.color ?? null]
  )
  const rows = await db.select<SeriesBeat[]>('SELECT * FROM series_beats WHERE id = ?', [result.lastInsertId])
  return rows[0]
}

export async function updateBeat(id: number, data: UpdateSeriesBeat): Promise<void> {
  const db = await getDb()
  const fields = Object.keys(data) as (keyof UpdateSeriesBeat)[]
  if (fields.length === 0) return
  const set = fields.map(f => `${f} = ?`).join(', ')
  const values = [...fields.map(f => data[f]), new Date().toISOString(), id]
  await db.execute(`UPDATE series_beats SET ${set}, updated_at = ? WHERE id = ?`, values)
}

export async function deleteBeat(id: number): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM series_beats WHERE id = ?', [id])
}
