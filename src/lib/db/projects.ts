import { getDb } from './db'
import type { Project } from './types'

export async function getProject(id: number): Promise<Project> {
  const db = await getDb()
  const rows = await db.select<Project[]>('SELECT * FROM projects WHERE id = ?', [id])
  if (rows.length === 0) throw new Error(`Project ${id} not found`)
  return rows[0]
}

export async function updateProject(
  id: number,
  data: Partial<Pick<Project, 'title' | 'author' | 'description'>>
): Promise<void> {
  const db = await getDb()
  const fields = Object.keys(data) as (keyof typeof data)[]
  if (fields.length === 0) return
  const set = fields.map(f => `${f} = ?`).join(', ')
  const values = [...fields.map(f => data[f]), new Date().toISOString(), id]
  await db.execute(
    `UPDATE projects SET ${set}, updated_at = ? WHERE id = ?`,
    values
  )
}
