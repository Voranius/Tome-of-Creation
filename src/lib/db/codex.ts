import { getDb } from './db'
import type { CodexEntry, CodexRelation, CodexRelationWithEntry } from './types'

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

export async function getArchivedEntries(): Promise<CodexEntry[]> {
  const db = await getDb()
  return db.select<CodexEntry[]>(
    'SELECT * FROM codex_entries WHERE is_archived = 1 ORDER BY category ASC, title ASC'
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

export async function unarchiveEntry(id: number): Promise<void> {
  const db = await getDb()
  await db.execute(
    'UPDATE codex_entries SET is_archived = 0, updated_at = ? WHERE id = ?',
    [new Date().toISOString(), id]
  )
}

export async function searchEntries(query: string): Promise<CodexEntry[]> {
  if (!query.trim()) return getEntries()
  const db = await getDb()
  const like = `%${query}%`
  return db.select<CodexEntry[]>(
    `SELECT * FROM codex_entries WHERE is_archived = 0
     AND (title LIKE ? OR content LIKE ? OR summary LIKE ?)
     ORDER BY title ASC`,
    [like, like, like]
  )
}

export async function getRelations(entryId: number): Promise<CodexRelationWithEntry[]> {
  const db = await getDb()
  const rows = await db.select<(CodexRelation & {
    other_id: number; other_title: string; other_category: string;
    other_summary: string | null; other_tags: string | null;
    other_content: string; other_cover_path: string | null;
    other_is_archived: number; other_created_at: string; other_updated_at: string;
  })[]>(
    `SELECT cr.id, cr.entry_a_id, cr.entry_b_id, cr.relation, cr.created_at,
       CASE WHEN cr.entry_a_id = ? THEN cr.entry_b_id ELSE cr.entry_a_id END as other_id,
       ce.title as other_title, ce.category as other_category,
       ce.summary as other_summary, ce.tags as other_tags,
       ce.content as other_content, ce.cover_path as other_cover_path,
       ce.is_archived as other_is_archived,
       ce.created_at as other_created_at, ce.updated_at as other_updated_at
     FROM codex_relations cr
     JOIN codex_entries ce ON ce.id = CASE WHEN cr.entry_a_id = ? THEN cr.entry_b_id ELSE cr.entry_a_id END
     WHERE (cr.entry_a_id = ? OR cr.entry_b_id = ?) AND ce.is_archived = 0
     ORDER BY ce.title ASC`,
    [entryId, entryId, entryId, entryId]
  )
  return rows.map(r => ({
    relation_id: r.id,
    relation: r.relation,
    entry: {
      id: r.other_id,
      title: r.other_title,
      category: r.other_category as CodexEntry['category'],
      summary: r.other_summary,
      tags: r.other_tags,
      content: r.other_content,
      cover_path: r.other_cover_path,
      is_archived: r.other_is_archived,
      created_at: r.other_created_at,
      updated_at: r.other_updated_at,
    },
  }))
}

export async function addRelation(
  entryAId: number,
  entryBId: number,
  relation?: string
): Promise<void> {
  const db = await getDb()
  await db.execute(
    'INSERT INTO codex_relations (entry_a_id, entry_b_id, relation) VALUES (?, ?, ?)',
    [entryAId, entryBId, relation ?? null]
  )
}

export async function removeRelation(relationId: number): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM codex_relations WHERE id = ?', [relationId])
}
