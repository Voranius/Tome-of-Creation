export interface Project {
  id: number
  title: string
  author: string | null
  description: string | null
  cover_path: string | null
  created_at: string
  updated_at: string
}

export interface Book {
  id: number
  project_id: number
  title: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Chapter {
  id: number
  book_id: number
  title: string
  sort_order: number
  is_archived: number
  created_at: string
  updated_at: string
}

export interface Scene {
  id: number
  chapter_id: number
  title: string
  content: string
  sort_order: number
  word_count: number
  pov_char_id: number | null
  is_archived: number
  created_at: string
  updated_at: string
}

export interface CodexEntry {
  id: number
  category: 'characters' | 'locations' | 'factions' | 'magic' | 'events' | 'items'
  title: string
  content: string
  summary: string | null
  cover_path: string | null
  tags: string | null
  is_archived: number
  created_at: string
  updated_at: string
}

export interface Note {
  id: number
  title: string
  content: string
  word_count: number
  is_archived: number
  created_at: string
  updated_at: string
}

export interface LoomSession {
  id: number
  title: string
  is_archived: number
  created_at: string
  updated_at: string
}

export interface LoomMessage {
  id: number
  session_id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface AIRule {
  id: number
  category: string
  rule_text: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SeriesBeat {
  id: number
  book_id: number | null
  title: string
  description: string | null
  beat_type: string | null
  position: number
  color: string | null
  created_at: string
  updated_at: string
}

export interface ProjectData {
  title: string
  path: string
  project_id: number
  db_path: string
}
