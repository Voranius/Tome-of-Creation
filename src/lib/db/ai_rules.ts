import { getDb } from './db'
import type { AIRule } from './types'

// ─── Writing Style ────────────────────────────────────────────────────────────
// Stored as a single AIRule row with category='writing-style'

export async function getWritingStyle(): Promise<string> {
  const db = await getDb()
  const rows = await db.select<AIRule[]>(
    "SELECT * FROM ai_rules WHERE category = 'writing-style' LIMIT 1"
  )
  return rows[0]?.rule_text ?? ''
}

export async function saveWritingStyle(text: string): Promise<void> {
  const db = await getDb()
  const rows = await db.select<AIRule[]>(
    "SELECT id FROM ai_rules WHERE category = 'writing-style' LIMIT 1"
  )
  if (rows.length > 0) {
    await db.execute(
      'UPDATE ai_rules SET rule_text = ?, updated_at = ? WHERE id = ?',
      [text, new Date().toISOString(), rows[0].id]
    )
  } else {
    await db.execute(
      "INSERT INTO ai_rules (category, rule_text, sort_order) VALUES ('writing-style', ?, 0)",
      [text]
    )
  }
}

// ─── Examples ─────────────────────────────────────────────────────────────────

export async function getExamples(type: 'good-example' | 'bad-example'): Promise<AIRule[]> {
  const db = await getDb()
  return db.select<AIRule[]>(
    'SELECT * FROM ai_rules WHERE category = ? ORDER BY sort_order ASC',
    [type]
  )
}

export async function createExample(
  type: 'good-example' | 'bad-example',
  text: string
): Promise<AIRule> {
  const db = await getDb()
  const existing = await db.select<{ max_order: number | null }[]>(
    'SELECT MAX(sort_order) as max_order FROM ai_rules WHERE category = ?',
    [type]
  )
  const sortOrder = (existing[0].max_order ?? -1) + 1
  const result = await db.execute(
    'INSERT INTO ai_rules (category, rule_text, sort_order) VALUES (?, ?, ?)',
    [type, text, sortOrder]
  )
  const rows = await db.select<AIRule[]>('SELECT * FROM ai_rules WHERE id = ?', [result.lastInsertId])
  return rows[0]
}

export async function updateExample(id: number, text: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    'UPDATE ai_rules SET rule_text = ?, updated_at = ? WHERE id = ?',
    [text, new Date().toISOString(), id]
  )
}

export async function deleteExample(id: number): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM ai_rules WHERE id = ?', [id])
}

// ─── World Summary ────────────────────────────────────────────────────────────

export async function getWorldSummary(): Promise<string> {
  const db = await getDb()
  const rows = await db.select<{ content: string }[]>(
    'SELECT content FROM world_summary WHERE id = 1'
  )
  return rows[0]?.content ?? ''
}

export async function saveWorldSummary(content: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    'INSERT OR REPLACE INTO world_summary (id, content, updated_at) VALUES (1, ?, ?)',
    [content, new Date().toISOString()]
  )
}
