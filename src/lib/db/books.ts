import { getDb } from './db'
import type { Book } from './types'

export async function getBooks(projectId: number): Promise<Book[]> {
  const db = await getDb()
  return db.select<Book[]>(
    'SELECT * FROM books WHERE project_id = ? ORDER BY sort_order ASC',
    [projectId]
  )
}

export async function createBook(projectId: number, title: string): Promise<Book> {
  const db = await getDb()
  const existing = await db.select<{ max_order: number | null }[]>(
    'SELECT MAX(sort_order) as max_order FROM books WHERE project_id = ?',
    [projectId]
  )
  const sortOrder = (existing[0].max_order ?? -1) + 1
  const result = await db.execute(
    'INSERT INTO books (project_id, title, sort_order) VALUES (?, ?, ?)',
    [projectId, title, sortOrder]
  )
  const rows = await db.select<Book[]>('SELECT * FROM books WHERE id = ?', [result.lastInsertId])
  return rows[0]
}

export async function updateBook(id: number, title: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    'UPDATE books SET title = ?, updated_at = ? WHERE id = ?',
    [title, new Date().toISOString(), id]
  )
}
