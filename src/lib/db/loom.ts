import { getDb } from './db'
import type { LoomSession, LoomMessage, CodexEntry } from './types'

export async function getSessions(): Promise<LoomSession[]> {
  const db = await getDb()
  return db.select<LoomSession[]>(
    'SELECT * FROM loom_sessions WHERE is_archived = 0 ORDER BY updated_at DESC'
  )
}

export async function createSession(): Promise<LoomSession> {
  const db = await getDb()
  const result = await db.execute(
    "INSERT INTO loom_sessions (title) VALUES ('New Session')"
  )
  const rows = await db.select<LoomSession[]>(
    'SELECT * FROM loom_sessions WHERE id = ?',
    [result.lastInsertId]
  )
  return rows[0]
}

export async function updateSession(id: number, title: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    'UPDATE loom_sessions SET title = ?, updated_at = ? WHERE id = ?',
    [title, new Date().toISOString(), id]
  )
}

export async function archiveSession(id: number): Promise<void> {
  const db = await getDb()
  await db.execute(
    'UPDATE loom_sessions SET is_archived = 1, updated_at = ? WHERE id = ?',
    [new Date().toISOString(), id]
  )
}

export async function getMessages(sessionId: number): Promise<LoomMessage[]> {
  const db = await getDb()
  return db.select<LoomMessage[]>(
    'SELECT * FROM loom_messages WHERE session_id = ? ORDER BY created_at ASC',
    [sessionId]
  )
}

export async function addMessage(
  sessionId: number,
  role: 'user' | 'assistant',
  content: string
): Promise<LoomMessage> {
  const db = await getDb()
  const result = await db.execute(
    'INSERT INTO loom_messages (session_id, role, content) VALUES (?, ?, ?)',
    [sessionId, role, content]
  )
  const rows = await db.select<LoomMessage[]>(
    'SELECT * FROM loom_messages WHERE id = ?',
    [result.lastInsertId]
  )
  return rows[0]
}

export async function getPinnedEntries(sessionId: number): Promise<CodexEntry[]> {
  const db = await getDb()
  return db.select<CodexEntry[]>(
    `SELECT ce.* FROM codex_entries ce
     JOIN loom_pinned_entries lpe ON lpe.entry_id = ce.id
     WHERE lpe.session_id = ? AND ce.is_archived = 0
     ORDER BY ce.title ASC`,
    [sessionId]
  )
}

export async function pinEntry(sessionId: number, entryId: number): Promise<void> {
  const db = await getDb()
  await db.execute(
    'INSERT OR IGNORE INTO loom_pinned_entries (session_id, entry_id) VALUES (?, ?)',
    [sessionId, entryId]
  )
}

export async function unpinEntry(sessionId: number, entryId: number): Promise<void> {
  const db = await getDb()
  await db.execute(
    'DELETE FROM loom_pinned_entries WHERE session_id = ? AND entry_id = ?',
    [sessionId, entryId]
  )
}
