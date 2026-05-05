import { getDb } from './db'
import type { Scene } from './types'

export async function getScenes(chapterId: number): Promise<Scene[]> {
  const db = await getDb()
  return db.select<Scene[]>(
    'SELECT * FROM scenes WHERE chapter_id = ? AND is_archived = 0 ORDER BY sort_order ASC',
    [chapterId]
  )
}

export async function getScene(id: number): Promise<Scene> {
  const db = await getDb()
  const rows = await db.select<Scene[]>('SELECT * FROM scenes WHERE id = ?', [id])
  if (rows.length === 0) throw new Error(`Scene ${id} not found`)
  return rows[0]
}

export async function createScene(chapterId: number, title: string): Promise<Scene> {
  const db = await getDb()
  const existing = await db.select<{ max_order: number | null }[]>(
    'SELECT MAX(sort_order) as max_order FROM scenes WHERE chapter_id = ? AND is_archived = 0',
    [chapterId]
  )
  const sortOrder = (existing[0].max_order ?? -1) + 1
  const result = await db.execute(
    'INSERT INTO scenes (chapter_id, title, sort_order) VALUES (?, ?, ?)',
    [chapterId, title, sortOrder]
  )
  const rows = await db.select<Scene[]>('SELECT * FROM scenes WHERE id = ?', [result.lastInsertId])
  return rows[0]
}

export async function updateScene(
  id: number,
  data: Partial<Pick<Scene, 'title' | 'content' | 'word_count' | 'pov_char_id'>>
): Promise<void> {
  const db = await getDb()
  const fields = Object.keys(data) as (keyof typeof data)[]
  if (fields.length === 0) return
  const set = fields.map(f => `${f} = ?`).join(', ')
  const values = [...fields.map(f => data[f]), new Date().toISOString(), id]
  await db.execute(`UPDATE scenes SET ${set}, updated_at = ? WHERE id = ?`, values)
}

export async function archiveScene(id: number): Promise<void> {
  const db = await getDb()
  await db.execute(
    'UPDATE scenes SET is_archived = 1, updated_at = ? WHERE id = ?',
    [new Date().toISOString(), id]
  )
}

export async function reorderScenes(orderedIds: number[]): Promise<void> {
  const db = await getDb()
  for (let i = 0; i < orderedIds.length; i++) {
    await db.execute(
      'UPDATE scenes SET sort_order = ?, updated_at = ? WHERE id = ?',
      [i, new Date().toISOString(), orderedIds[i]]
    )
  }
}
