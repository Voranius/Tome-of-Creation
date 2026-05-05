import { getDb } from './db'
import type { Chapter } from './types'

export async function getChapters(bookId: number): Promise<Chapter[]> {
  const db = await getDb()
  return db.select<Chapter[]>(
    'SELECT * FROM chapters WHERE book_id = ? AND is_archived = 0 ORDER BY sort_order ASC',
    [bookId]
  )
}

export async function createChapter(bookId: number, title: string): Promise<Chapter> {
  const db = await getDb()
  const existing = await db.select<{ max_order: number | null }[]>(
    'SELECT MAX(sort_order) as max_order FROM chapters WHERE book_id = ? AND is_archived = 0',
    [bookId]
  )
  const sortOrder = (existing[0].max_order ?? -1) + 1
  const result = await db.execute(
    'INSERT INTO chapters (book_id, title, sort_order) VALUES (?, ?, ?)',
    [bookId, title, sortOrder]
  )
  const rows = await db.select<Chapter[]>('SELECT * FROM chapters WHERE id = ?', [result.lastInsertId])
  return rows[0]
}

export async function updateChapterTitle(id: number, title: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    'UPDATE chapters SET title = ?, updated_at = ? WHERE id = ?',
    [title, new Date().toISOString(), id]
  )
}

export async function archiveChapter(id: number): Promise<void> {
  const db = await getDb()
  await db.execute(
    'UPDATE chapters SET is_archived = 1, updated_at = ? WHERE id = ?',
    [new Date().toISOString(), id]
  )
}

export async function reorderChapters(orderedIds: number[]): Promise<void> {
  const db = await getDb()
  for (let i = 0; i < orderedIds.length; i++) {
    await db.execute(
      'UPDATE chapters SET sort_order = ?, updated_at = ? WHERE id = ?',
      [i, new Date().toISOString(), orderedIds[i]]
    )
  }
}
