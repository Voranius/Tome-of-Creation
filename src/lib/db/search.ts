import { getDb } from './db'

interface TipTapNode {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  content?: TipTapNode[]
}

function tiptapToText(contentJson: string): string {
  try {
    const doc = JSON.parse(contentJson) as TipTapNode
    const parts: string[] = []
    function walk(node: TipTapNode) {
      if (node.type === 'text') {
        parts.push(node.text ?? '')
      } else if (node.type === 'codexMention') {
        parts.push(`@${node.attrs?.label ?? ''}`)
      } else if (node.type === 'hardBreak') {
        parts.push('\n')
      } else {
        const isBlock = ['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList', 'listItem', 'codeBlock'].includes(node.type)
        if (isBlock && parts.length > 0) parts.push('\n')
        node.content?.forEach(walk)
        if (isBlock) parts.push('\n')
      }
    }
    walk(doc)
    return parts.join('').replace(/\n{3,}/g, '\n\n').trim()
  } catch {
    return contentJson
  }
}

export interface SearchResult {
  id: number
  type: 'scene' | 'codex' | 'note' | 'loom_message'
  title: string
  excerpt: string    // may contain <mark>…</mark> tags
  breadcrumb: string
  category?: string  // codex entries only
  sessionId?: number // loom_message only
  chapterId?: number // scene only
  bookId?: number    // scene only
}

function makeExcerpt(content: string, query: string, radius = 80): string {
  if (!content) return ''
  const lower = content.toLowerCase()
  const qLower = query.toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx === -1) {
    return content.slice(0, radius * 2) + (content.length > radius * 2 ? '…' : '')
  }
  const start = Math.max(0, idx - radius)
  const end = Math.min(content.length, idx + qLower.length + radius)
  const pre = start > 0 ? '…' : ''
  const post = end < content.length ? '…' : ''
  const segment = content.slice(start, end)
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return pre + segment.replace(new RegExp(escaped, 'gi'), (m) => `<mark>${m}</mark>`) + post
}

export async function searchAll(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []
  const db = await getDb()
  const qLower = query.toLowerCase()
  const escaped = query.replace(/[\\%_]/g, '\\$&')
  const like = `%${escaped}%`

  const [allScenes, allCodex, allNotes, loom] = await Promise.all([
    db.select<Array<{
      id: number; title: string; content: string
      chap_title: string; book_title: string
      chapter_id: number; book_id: number
    }>>(
      `SELECT s.id, s.title, s.content,
              c.title as chap_title, b.title as book_title,
              c.id as chapter_id, b.id as book_id
       FROM scenes s
       JOIN chapters c ON c.id = s.chapter_id
       JOIN books b ON b.id = c.book_id
       WHERE s.is_archived = 0`
    ).catch(() => [] as Array<{id:number;title:string;content:string;chap_title:string;book_title:string;chapter_id:number;book_id:number}>),

    db.select<Array<{id: number; title: string; content: string; summary: string | null; category: string}>>(
      `SELECT id, title, content, summary, category FROM codex_entries WHERE is_archived = 0`
    ).catch(() => [] as Array<{id:number;title:string;content:string;summary:string|null;category:string}>),

    db.select<Array<{id: number; title: string; content: string}>>(
      `SELECT id, title, content FROM notes WHERE is_archived = 0`
    ).catch(() => [] as Array<{id:number;title:string;content:string}>),

    db.select<Array<{id: number; session_title: string; content: string; session_id: number}>>(
      `SELECT lm.id, ls.title as session_title, lm.content, ls.id as session_id
       FROM loom_messages lm
       JOIN loom_sessions ls ON ls.id = lm.session_id
       WHERE ls.is_archived = 0 AND lm.content LIKE ? ESCAPE '\\'
       LIMIT 20`,
      [like]
    ).catch(() => [] as Array<{id:number;session_title:string;content:string;session_id:number}>),
  ])

  const scenes = allScenes
    .filter(s => s.title.toLowerCase().includes(qLower) || tiptapToText(s.content).toLowerCase().includes(qLower))
    .slice(0, 20)

  const codex = allCodex
    .filter(c => c.title.toLowerCase().includes(qLower) || tiptapToText(c.content).toLowerCase().includes(qLower) || (c.summary ?? '').toLowerCase().includes(qLower))
    .slice(0, 20)

  const notes = allNotes
    .filter(n => n.title.toLowerCase().includes(qLower) || tiptapToText(n.content).toLowerCase().includes(qLower))
    .slice(0, 20)

  const results: SearchResult[] = []

  for (const s of scenes) {
    results.push({
      id: s.id, type: 'scene', title: s.title,
      excerpt: makeExcerpt(tiptapToText(s.content), query),
      breadcrumb: `${s.book_title} · ${s.chap_title}`,
      chapterId: s.chapter_id, bookId: s.book_id,
    })
  }
  for (const c of codex) {
    const cat = c.category.charAt(0).toUpperCase() + c.category.slice(1)
    results.push({
      id: c.id, type: 'codex', title: c.title,
      excerpt: makeExcerpt(tiptapToText(c.content), query),
      breadcrumb: `Codex · ${cat}`,
      category: c.category,
    })
  }
  for (const n of notes) {
    results.push({
      id: n.id, type: 'note', title: n.title,
      excerpt: makeExcerpt(tiptapToText(n.content), query),
      breadcrumb: 'Notes',
    })
  }
  for (const l of loom) {
    results.push({
      id: l.id, type: 'loom_message', title: l.session_title,
      excerpt: makeExcerpt(l.content, query),
      breadcrumb: `Loom · ${l.session_title}`,
      sessionId: l.session_id,
    })
  }

  return results
}
