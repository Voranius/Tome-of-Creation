import { useState, useEffect, useRef } from 'react'
import { useLoomStore } from '../store/loomStore'
import { useAIStore } from '../store/aiStore'
import { useProjectStore } from '../store/projectStore'
import {
  getSessions, createSession, updateSession, archiveSession,
  getMessages, addMessage,
  getPinnedEntries, pinEntry, unpinEntry,
  getPinnedSessions, pinSession, unpinSession,
} from '../lib/db/loom'
import { getEntries, createEntry, updateEntry } from '../lib/db/codex'
import { getWritingStyle, getWorldSummary } from '../lib/db/ai_rules'
import { getActiveProvider } from '../lib/ai/getActiveProvider'
import { PROVIDER_MODELS } from '../lib/ai/types'
import type { LoomMessage, LoomSessionWithCount, CodexEntry } from '../lib/db/types'
import type { ProviderKey } from '../lib/ai/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  characters: '#c9a84c',
  locations:  '#3d9e8a',
  factions:   '#4ab3d4',
  magic:      '#7b5ea7',
  events:     '#c47a8a',
  items:      '#c4824a',
}

const CODEX_CATEGORIES = ['characters', 'locations', 'factions', 'magic', 'events', 'items'] as const
type CodexCategory = typeof CODEX_CATEGORIES[number]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateBucket(dateStr: string): 'today' | 'this-week' | 'earlier' {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  if (date >= today) return 'today'
  if (date >= weekAgo) return 'this-week'
  return 'earlier'
}

async function assembleLoomPrompt(
  pinnedSessions: LoomSessionWithCount[],
  pinnedEntries: CodexEntry[],
  mentionedEntries: CodexEntry[],
): Promise<string> {
  const [writingStyle, worldSummary] = await Promise.all([getWritingStyle(), getWorldSummary()])
  const parts: string[] = []

  if (writingStyle.trim()) parts.push(`[WRITING STYLE]\n${writingStyle}`)
  if (worldSummary.trim()) parts.push(`[WORLD SUMMARY]\n${worldSummary}`)

  if (pinnedSessions.length > 0) {
    const transcripts = await Promise.all(
      pinnedSessions.map(async (sess) => {
        const msgs = await getMessages(sess.id)
        const body = msgs.map((m) => `${m.role === 'user' ? 'Writer' : 'AI'}: ${m.content}`).join('\n')
        return `--- ${sess.title} ---\n${body}`
      })
    )
    parts.push(`[PINNED CONVERSATIONS]\n${transcripts.join('\n\n')}`)
  }

  if (pinnedEntries.length > 0) {
    const text = pinnedEntries
      .map((e) => `${e.title} (${e.category}):\n${e.content || 'No content yet.'}`)
      .join('\n\n')
    parts.push(`[PINNED CODEX ENTRIES]\n${text}`)
  }

  const pinnedIds = new Set(pinnedEntries.map((e) => e.id))
  const uniqueMentioned = mentionedEntries.filter((e) => !pinnedIds.has(e.id))
  if (uniqueMentioned.length > 0) {
    const text = uniqueMentioned
      .map((e) => `${e.title} (${e.category}):\n${e.content || 'No content yet.'}`)
      .join('\n\n')
    parts.push(`[MENTIONED ENTITIES]\n${text}`)
  }

  return parts.join('\n\n') || 'You are a helpful worldbuilding assistant for a fantasy fiction writer.'
}

// ─── Sessions Panel ───────────────────────────────────────────────────────────

function SessionRow({
  session,
  isActive,
  onSelect,
  onRename,
  onArchive,
}: {
  session: LoomSessionWithCount
  isActive: boolean
  onSelect: () => void
  onRename: (title: string) => void
  onArchive: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [renameVal, setRenameVal] = useState(session.title)

  function handleDoubleClick() {
    setEditing(true)
    setRenameVal(session.title)
  }

  function handleRenameBlur() {
    setEditing(false)
    const trimmed = renameVal.trim() || 'New Session'
    onRename(trimmed)
  }

  const msgLabel = session.message_count === 0
    ? 'No messages'
    : `${session.message_count} message${session.message_count !== 1 ? 's' : ''}`

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '8px 12px',
        cursor: 'pointer',
        borderLeft: isActive ? '2px solid var(--color-gold)' : '2px solid transparent',
        background: isActive ? 'rgba(201,168,76,0.06)' : 'transparent',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        position: 'relative',
      }}
    >
      {editing ? (
        <input
          autoFocus
          value={renameVal}
          onChange={(e) => setRenameVal(e.target.value)}
          onBlur={handleRenameBlur}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--color-panel)',
            border: '1px solid var(--color-gold)',
            borderRadius: 3,
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            fontSize: 12,
            padding: '2px 4px',
            outline: 'none',
            width: '100%',
          }}
        />
      ) : (
        <div
          onDoubleClick={handleDoubleClick}
          style={{ fontSize: 12, color: isActive ? 'var(--text-primary)' : 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: hovered ? 20 : 0 }}
        >
          {session.title}
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{msgLabel}</div>

      {hovered && !editing && (
        <button
          onClick={(e) => { e.stopPropagation(); onArchive() }}
          title="Archive session"
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            width: 18, height: 18, borderRadius: 3, border: 'none',
            background: 'rgba(240,230,210,0.08)', color: 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, lineHeight: 1,
          }}
        >×</button>
      )}
    </div>
  )
}

function SessionsPanel() {
  const { sessions, selectedSessionId, selectSession, updateSessionTitle, archiveSessionInStore, addSession, searchQuery, setSearchQuery } = useLoomStore()

  async function handleNew() {
    try {
      const session = await createSession()
      addSession(session)
      selectSession(session.id)
    } catch (err) { console.error(err) }
  }

  async function handleRename(id: number, title: string) {
    try {
      await updateSession(id, title)
      updateSessionTitle(id, title)
    } catch (err) { console.error(err) }
  }

  async function handleArchive(id: number) {
    try {
      await archiveSession(id)
      archiveSessionInStore(id)
    } catch (err) { console.error(err) }
  }

  const filtered = searchQuery
    ? sessions.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : sessions

  const groups: { label: string; bucket: string; sessions: LoomSessionWithCount[] }[] = [
    { label: 'Today', bucket: 'today', sessions: filtered.filter((s) => getDateBucket(s.updated_at) === 'today') },
    { label: 'This week', bucket: 'this-week', sessions: filtered.filter((s) => getDateBucket(s.updated_at) === 'this-week') },
    { label: 'Earlier', bucket: 'earlier', sessions: filtered.filter((s) => getDateBucket(s.updated_at) === 'earlier') },
  ].filter((g) => g.sessions.length > 0)

  return (
    <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>The Loom</span>
        <button
          onClick={handleNew}
          style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 5,
            background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)',
            color: 'var(--color-gold)', fontFamily: 'inherit', cursor: 'pointer',
          }}
        >+ New</button>
      </div>

      <div style={{ padding: '8px 10px' }}>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search sessions…"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(240,230,210,0.05)', border: '1px solid var(--border-subtle)',
            borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit',
            fontSize: 11, padding: '5px 8px', outline: 'none',
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {groups.length === 0 && (
          <div style={{ padding: '20px 12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            {searchQuery ? 'No sessions found.' : 'No sessions yet.'}
          </div>
        )}
        {groups.map((g) => (
          <div key={g.bucket}>
            <div style={{ padding: '6px 12px 3px', fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {g.label}
            </div>
            {g.sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                isActive={session.id === selectedSessionId}
                onSelect={() => selectSession(session.id)}
                onRename={(title) => handleRename(session.id, title)}
                onArchive={() => handleArchive(session.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Message Bubbles ──────────────────────────────────────────────────────────

function UserBubble({ msg }: { msg: LoomMessage }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
      <div style={{
        maxWidth: '72%',
        background: 'rgba(201,168,76,0.12)',
        border: '1px solid rgba(201,168,76,0.18)',
        borderRadius: '12px 12px 2px 12px',
        padding: '10px 14px',
        fontSize: 13,
        color: 'var(--text-primary)',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>
    </div>
  )
}

function AIBubble({ msg, onSave, onCopy }: { msg: LoomMessage; onSave: (msg: LoomMessage) => void; onCopy: (text: string) => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: '80%' }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%', background: 'rgba(201,168,76,0.15)',
          border: '1px solid rgba(201,168,76,0.25)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4h8a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H6l-3 2V9H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
          </svg>
        </div>
        <div style={{
          background: 'var(--color-panel)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px 12px 12px 2px',
          padding: '10px 14px',
          fontSize: 13,
          color: 'var(--text-primary)',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
      </div>

      {hovered && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6, marginLeft: 32 }}>
          <button
            onClick={() => onSave(msg)}
            style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 4,
              background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)',
              color: 'var(--color-gold)', fontFamily: 'inherit', cursor: 'pointer',
            }}
          >Save to Codex</button>
          <button
            onClick={() => onCopy(msg.content)}
            style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 4,
              background: 'rgba(240,230,210,0.05)', border: '1px solid var(--border-subtle)',
              color: 'var(--text-dim)', fontFamily: 'inherit', cursor: 'pointer',
            }}
          >Copy</button>
        </div>
      )}
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%', background: 'rgba(201,168,76,0.15)',
        border: '1px solid rgba(201,168,76,0.25)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4h8a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H6l-3 2V9H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
        </svg>
      </div>
      <div style={{
        background: 'var(--color-panel)', border: '1px solid var(--border-subtle)',
        borderRadius: '12px 12px 12px 2px', padding: '12px 16px',
        fontSize: 13, color: 'var(--text-muted)',
      }}>
        <span style={{ animation: 'loom-pulse 1.2s ease-in-out infinite' }}>Thinking…</span>
        <style>{`@keyframes loom-pulse { 0%,100%{opacity:.4} 50%{opacity:1} }`}</style>
      </div>
    </div>
  )
}

function MessageList({ onSaveToCodex }: { onSaveToCodex: (msg: LoomMessage) => void }) {
  const { messages, isGenerating } = useLoomStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isGenerating])

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).catch(console.error)
  }

  if (messages.length === 0 && !isGenerating) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Ask anything about your world…
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
      {messages.map((msg) =>
        msg.role === 'user'
          ? <UserBubble key={msg.id} msg={msg} />
          : <AIBubble key={msg.id} msg={msg} onSave={onSaveToCodex} onCopy={handleCopy} />
      )}
      {isGenerating && <ThinkingBubble />}
      <div ref={bottomRef} />
    </div>
  )
}

// ─── Chat Header ──────────────────────────────────────────────────────────────

function ChatHeader() {
  const { sessions, selectedSessionId, updateSessionTitle } = useLoomStore()
  const { defaultProvider, connectedProviders, selectedModels, ollamaModels, setSelectedModel } = useAIStore()

  const session = sessions.find((s) => s.id === selectedSessionId) ?? null
  const [editing, setEditing] = useState(false)
  const [titleVal, setTitleVal] = useState(session?.title ?? '')

  useEffect(() => {
    setTitleVal(session?.title ?? '')
    setEditing(false)
  }, [selectedSessionId, session?.title])

  async function handleTitleBlur() {
    if (!session) return
    setEditing(false)
    const trimmed = titleVal.trim() || 'New Session'
    if (trimmed === session.title) return
    try {
      await updateSession(session.id, trimmed)
      updateSessionTitle(session.id, trimmed)
    } catch (err) { console.error(err) }
  }

  const providerKey: ProviderKey | null = defaultProvider ?? connectedProviders[0] ?? null
  const availableModels: string[] = providerKey === 'ollama'
    ? ollamaModels
    : (providerKey ? PROVIDER_MODELS[providerKey] : [])
  const currentModel = providerKey ? selectedModels[providerKey] : ''

  if (!session) return <div style={{ height: 48, borderBottom: '1px solid var(--border-subtle)' }} />

  return (
    <div style={{ height: 48, borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0 }}>
      {editing ? (
        <input
          autoFocus
          value={titleVal}
          onChange={(e) => setTitleVal(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          style={{
            flex: 1, background: 'transparent', border: 'none',
            borderBottom: '1px solid rgba(201,168,76,0.4)',
            color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
            outline: 'none', padding: '2px 0',
          }}
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title="Click to rename"
        >
          {session.title}
        </div>
      )}

      {providerKey && availableModels.length > 0 && (
        <select
          value={currentModel}
          onChange={(e) => setSelectedModel(providerKey, e.target.value)}
          style={{
            background: 'rgba(240,230,210,0.05)', border: '1px solid var(--border-medium)',
            borderRadius: 6, color: 'var(--text-dim)', fontFamily: 'inherit',
            fontSize: 11, padding: '3px 6px', cursor: 'pointer', flexShrink: 0,
          }}
        >
          {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      )}
      {!providerKey && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No AI provider — Settings →</span>
      )}
    </div>
  )
}

// ─── Input Bar ────────────────────────────────────────────────────────────────

function MentionPicker({
  filter,
  entries,
  onSelect,
  onClose,
}: {
  filter: string
  entries: CodexEntry[]
  onSelect: (entry: CodexEntry) => void
  onClose: () => void
}) {
  const filtered = filter
    ? entries.filter((e) => e.title.toLowerCase().includes(filter.toLowerCase()))
    : entries

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
      <div style={{
        position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 10,
        background: 'var(--color-panel)', border: '1px solid var(--border-medium)',
        borderRadius: 8, marginBottom: 4, maxHeight: 220, overflowY: 'auto',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}>
        {filtered.length === 0 && (
          <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>No entries found</div>
        )}
        {filtered.map((entry) => (
          <div
            key={entry.id}
            onClick={() => onSelect(entry)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
              cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(240,230,210,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[entry.category] ?? '#c9a84c', flexShrink: 0 }} />
            {entry.title}
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{entry.category}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function InputBar() {
  const { selectedSessionId, pinnedSessions, pinnedEntries, mentionedEntries, isGenerating, appendMessage, setIsGenerating, addMentionedEntry } = useLoomStore()
  const { defaultProvider, connectedProviders } = useAIStore()

  const [inputText, setInputText] = useState('')
  const [showMentionPicker, setShowMentionPicker] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [allEntries, setAllEntries] = useState<CodexEntry[]>([])
  const [localError, setLocalError] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const hasProvider = !!(defaultProvider ?? connectedProviders[0])

  function showError(msg: string) {
    setLocalError(msg)
    setTimeout(() => setLocalError(''), 4000)
  }

  async function openMentionPicker() {
    if (allEntries.length === 0) {
      const entries = await getEntries().catch(() => [])
      setAllEntries(entries)
    }
    setMentionFilter('')
    setShowMentionPicker(true)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setInputText(val)

    // Auto-grow (max 4 lines ≈ 96px)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'

    // @ detection
    const cursor = e.target.selectionStart ?? val.length
    const textBeforeCursor = val.slice(0, cursor)
    const atMatch = textBeforeCursor.match(/@(\w*)$/)
    if (atMatch) {
      setMentionFilter(atMatch[1])
      openMentionPicker()
    } else {
      setShowMentionPicker(false)
    }
  }

  function handleMentionSelect(entry: CodexEntry) {
    const cursor = inputRef.current?.selectionStart ?? inputText.length
    const textBeforeCursor = inputText.slice(0, cursor)
    const atIndex = textBeforeCursor.lastIndexOf('@')
    const newText = inputText.slice(0, atIndex) + '@' + entry.title + ' ' + inputText.slice(cursor)
    setInputText(newText)
    setShowMentionPicker(false)
    setMentionFilter('')
    addMentionedEntry(entry)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function handleSend() {
    const text = inputText.trim()
    if (!text || isGenerating || !selectedSessionId) return
    if (!hasProvider) {
      showError('AI features need an API key — Set up in Settings →')
      return
    }

    const sessionId = selectedSessionId
    setInputText('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setShowMentionPicker(false)
    setIsGenerating(true)

    try {
      const userMsg = await addMessage(sessionId, 'user', text)
      appendMessage(userMsg)

      const systemPrompt = await assembleLoomPrompt(pinnedSessions, pinnedEntries, mentionedEntries)
      const currentMessages = useLoomStore.getState().messages
      const providerMessages = currentMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      const active = await getActiveProvider()
      if (!active) {
        showError('No AI provider configured. Set up an API key in Settings →')
        return
      }

      const response = await active.provider.sendMessage(providerMessages, active.model, systemPrompt)
      if (useLoomStore.getState().selectedSessionId !== sessionId) return
      const aiMsg = await addMessage(sessionId, 'assistant', response)
      appendMessage(aiMsg)
    } catch (err) {
      console.error(err)
      showError('Something went wrong. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px 20px', flexShrink: 0, position: 'relative' }}>
      {localError && (
        <div style={{ fontSize: 11, color: '#c47a8a', marginBottom: 8 }}>{localError}</div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', position: 'relative' }}>
        {showMentionPicker && (
          <MentionPicker
            filter={mentionFilter}
            entries={allEntries}
            onSelect={handleMentionSelect}
            onClose={() => setShowMentionPicker(false)}
          />
        )}

        <button
          onClick={openMentionPicker}
          title="Mention a Codex entry"
          style={{
            flexShrink: 0, height: 36, padding: '0 10px',
            background: 'rgba(240,230,210,0.05)', border: '1px solid var(--border-subtle)',
            borderRadius: 6, color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: 12,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >@ Mention</button>

        <textarea
          ref={inputRef}
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={hasProvider ? 'Ask about your world… (Enter to send, Shift+Enter for newline)' : 'Set up an AI provider in Settings to chat'}
          disabled={isGenerating || !selectedSessionId}
          rows={1}
          style={{
            flex: 1, resize: 'none', overflow: 'hidden',
            background: 'rgba(240,230,210,0.05)', border: '1px solid var(--border-subtle)',
            borderRadius: 8, color: 'var(--text-primary)', fontFamily: 'inherit',
            fontSize: 13, lineHeight: 1.5, padding: '9px 12px',
            outline: 'none', minHeight: 36,
            transition: 'border-color 150ms',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        />

        <button
          onClick={() => void handleSend()}
          disabled={isGenerating || !inputText.trim() || !selectedSessionId}
          style={{
            flexShrink: 0, height: 36, padding: '0 16px',
            background: isGenerating || !inputText.trim() ? 'rgba(201,168,76,0.06)' : 'rgba(201,168,76,0.15)',
            border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6,
            color: isGenerating || !inputText.trim() ? 'rgba(201,168,76,0.4)' : 'var(--color-gold)',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 500, cursor: isGenerating ? 'default' : 'pointer',
            transition: 'all 150ms',
          }}
        >
          {isGenerating ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}

// ─── Context Panel ────────────────────────────────────────────────────────────

function EntryChip({ entry, onRemove }: { entry: CodexEntry; onRemove: () => void }) {
  const color = CATEGORY_COLORS[entry.category] ?? '#c9a84c'
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: 'rgba(240,230,210,0.05)', border: '1px solid var(--border-subtle)',
      borderRadius: 12, padding: '3px 8px 3px 6px', fontSize: 11, color: 'var(--text-dim)',
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{entry.title}</span>
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, fontSize: 12, lineHeight: 1, marginLeft: 2 }}
      >×</button>
    </div>
  )
}

function ContextPanel() {
  const { selectedSessionId, pinnedEntries, pinnedSessions, mentionedEntries, setPinnedEntries, setPinnedSessions } = useLoomStore()
  const sessions = useLoomStore((s) => s.sessions)

  const [showPinEntryPicker, setShowPinEntryPicker] = useState(false)
  const [pinEntryFilter, setPinEntryFilter] = useState('')
  const [allEntries, setAllEntries] = useState<CodexEntry[]>([])

  const [showPinSessionPicker, setShowPinSessionPicker] = useState(false)
  const [pinSessionFilter, setPinSessionFilter] = useState('')

  async function openEntryPicker() {
    if (allEntries.length === 0) {
      const entries = await getEntries().catch(() => [])
      setAllEntries(entries)
    }
    setPinEntryFilter('')
    setShowPinEntryPicker(true)
  }

  async function handlePinEntry(entry: CodexEntry) {
    if (!selectedSessionId) return
    setShowPinEntryPicker(false)
    try {
      await pinEntry(selectedSessionId, entry.id)
      const updated = await getPinnedEntries(selectedSessionId)
      setPinnedEntries(updated)
    } catch (err) { console.error(err) }
  }

  async function handleUnpinEntry(entryId: number) {
    if (!selectedSessionId) return
    try {
      await unpinEntry(selectedSessionId, entryId)
      setPinnedEntries(pinnedEntries.filter((e) => e.id !== entryId))
    } catch (err) { console.error(err) }
  }

  async function handlePinSession(sess: LoomSessionWithCount) {
    if (!selectedSessionId) return
    setShowPinSessionPicker(false)
    try {
      await pinSession(selectedSessionId, sess.id)
      const updated = await getPinnedSessions(selectedSessionId)
      setPinnedSessions(updated)
    } catch (err) { console.error(err) }
  }

  async function handleUnpinSession(pinnedId: number) {
    if (!selectedSessionId) return
    try {
      await unpinSession(selectedSessionId, pinnedId)
      setPinnedSessions(pinnedSessions.filter((s) => s.id !== pinnedId))
    } catch (err) { console.error(err) }
  }

  const filteredEntries = pinEntryFilter
    ? allEntries.filter((e) => e.title.toLowerCase().includes(pinEntryFilter.toLowerCase()))
    : allEntries

  const candidateSessions = sessions.filter((s) => s.id !== selectedSessionId && !pinnedSessions.some((p) => p.id === s.id))
  const filteredSessions = pinSessionFilter
    ? candidateSessions.filter((s) => s.title.toLowerCase().includes(pinSessionFilter.toLowerCase()))
    : candidateSessions

  const panelSection: React.CSSProperties = {
    padding: '12px 14px',
    borderBottom: '1px solid var(--border-subtle)',
  }
  const sectionLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8,
  }

  return (
    <div style={{ width: 248, flexShrink: 0, borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Always in context */}
      <div style={panelSection}>
        <div style={sectionLabel}>Always in context</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: 10, padding: '4px 10px', fontSize: 11, color: 'var(--color-gold)',
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5" cy="5" r="4" /><path d="M5 3v2l1 1" />
          </svg>
          AI Rules · World Summary
        </div>
      </div>

      {/* Pinned Conversations */}
      <div style={panelSection}>
        <div style={sectionLabel}>Pinned conversations</div>
        {pinnedSessions.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>None pinned yet.</div>
        )}
        {pinnedSessions.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 3h10a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5H6l-3 2V8H1a.5.5 0 0 1-.5-.5v-4A.5.5 0 0 1 1 3z" />
            </svg>
            <span style={{ flex: 1, fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
            <button onClick={() => handleUnpinSession(s.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
          </div>
        ))}

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowPinSessionPicker(!showPinSessionPicker)}
            style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
          >+ Pin a conversation</button>

          {showPinSessionPicker && (
            <>
              <div onClick={() => setShowPinSessionPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
              <div style={{ position: 'absolute', top: 20, left: 0, right: 0, zIndex: 10, background: 'var(--color-panel)', border: '1px solid var(--border-medium)', borderRadius: 7, maxHeight: 180, overflowY: 'auto', boxShadow: '0 6px 18px rgba(0,0,0,0.4)' }}>
                <div style={{ padding: 8 }}>
                  <input autoFocus value={pinSessionFilter} onChange={(e) => setPinSessionFilter(e.target.value)} placeholder="Search…"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(240,230,210,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 4, color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 11, padding: '4px 7px', outline: 'none' }} />
                </div>
                {filteredSessions.length === 0 && <div style={{ padding: '4px 12px 10px', fontSize: 11, color: 'var(--text-muted)' }}>No other sessions.</div>}
                {filteredSessions.map((s) => (
                  <div key={s.id} onClick={() => handlePinSession(s)} style={{ padding: '7px 12px', fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(240,230,210,0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    {s.title}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pinned Codex Entries */}
      <div style={panelSection}>
        <div style={sectionLabel}>Pinned Codex entries</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {pinnedEntries.map((e) => (
            <EntryChip key={e.id} entry={e} onRemove={() => handleUnpinEntry(e.id)} />
          ))}
          {pinnedEntries.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>None pinned yet.</div>}
        </div>

        <div style={{ position: 'relative' }}>
          <button onClick={openEntryPicker} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>+ Add a Codex entry</button>

          {showPinEntryPicker && (
            <>
              <div onClick={() => setShowPinEntryPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
              <div style={{ position: 'absolute', top: 20, left: 0, right: 0, zIndex: 10, background: 'var(--color-panel)', border: '1px solid var(--border-medium)', borderRadius: 7, maxHeight: 180, overflowY: 'auto', boxShadow: '0 6px 18px rgba(0,0,0,0.4)' }}>
                <div style={{ padding: 8 }}>
                  <input autoFocus value={pinEntryFilter} onChange={(e) => setPinEntryFilter(e.target.value)} placeholder="Search…"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(240,230,210,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 4, color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 11, padding: '4px 7px', outline: 'none' }} />
                </div>
                {filteredEntries.length === 0 && <div style={{ padding: '4px 12px 10px', fontSize: 11, color: 'var(--text-muted)' }}>No entries found.</div>}
                {filteredEntries.map((e) => (
                  <div key={e.id} onClick={() => handlePinEntry(e)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', cursor: 'pointer' }}
                    onMouseEnter={(ev) => (ev.currentTarget.style.background = 'rgba(240,230,210,0.05)')}
                    onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: CATEGORY_COLORS[e.category] ?? '#c9a84c', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mentioned this session */}
      <div style={{ ...panelSection, borderBottom: 'none' }}>
        <div style={sectionLabel}>Mentioned this session</div>
        {mentionedEntries.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Use @EntryName in a message.</div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {mentionedEntries.map((e) => {
            const color = CATEGORY_COLORS[e.category] ?? '#c9a84c'
            return (
              <div key={e.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(240,230,210,0.04)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '3px 8px 3px 6px', fontSize: 11, color: 'var(--text-muted)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                {e.title}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '12px 14px', marginTop: 'auto' }}>
        <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.5 }}>
          Pinned entries and conversations stay in the AI's memory for this session.
        </p>
      </div>
    </div>
  )
}

// ─── Save to Codex Dialog ─────────────────────────────────────────────────────

function SaveToCodexDialog({ message, onClose }: { message: LoomMessage; onClose: () => void }) {
  const firstLine = message.content.split('\n')[0].trim().slice(0, 80)
  const [category, setCategory] = useState<CodexCategory>('characters')
  const [title, setTitle] = useState(firstLine)
  const [content, setContent] = useState(message.content)
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    setSaving(true)
    try {
      const entry = await createEntry({ category, title: title.trim() || 'Untitled' })
      if (content.trim()) await updateEntry(entry.id, { content })
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent style={{ background: 'var(--color-panel)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', maxWidth: 520 }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text-primary)', fontSize: 15 }}>Save to Codex</DialogTitle>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as CodexCategory)}
              style={{ width: '100%', background: 'rgba(240,230,210,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13, padding: '7px 10px', cursor: 'pointer', outline: 'none' }}>
              {CODEX_CATEGORIES.map((c) => <option key={c} value={c} style={{ background: '#1c1a16' }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(240,230,210,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13, padding: '7px 10px', outline: 'none' }} />
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Content</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8}
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(240,230,210,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 5, color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, padding: '7px 10px', outline: 'none', resize: 'vertical' }} />
          </div>

          <button onClick={handleCreate} disabled={saving}
            style={{ padding: '9px 0', borderRadius: 6, background: saving ? 'rgba(201,168,76,0.06)' : 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: saving ? 'rgba(201,168,76,0.4)' : 'var(--color-gold)', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Creating…' : 'Create Entry'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function NoSessionState({ onCreate }: { onCreate: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--text-muted)' }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="rgba(201,168,76,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 10h28a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H20l-10 6v-6H6a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2z" />
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 6 }}>No session selected</div>
        <div style={{ fontSize: 12 }}>Start a new conversation to explore your world.</div>
      </div>
      <button onClick={onCreate}
        style={{ padding: '8px 20px', borderRadius: 6, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--color-gold)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>
        + New Session
      </button>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function LoomScreen() {
  const projectId = useProjectStore((s) => s.projectId)
  const { sessions, selectedSessionId, selectSession, setSessions, addSession, setMessages, setPinnedEntries, setPinnedSessions, clearMentionedEntries } = useLoomStore()
  const [saveToCodexMsg, setSaveToCodexMsg] = useState<LoomMessage | null>(null)

  // Load sessions on project open
  useEffect(() => {
    if (!projectId) return
    getSessions().then(setSessions).catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Auto-select first session
  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) selectSession(sessions[0].id)
  }, [sessions, selectedSessionId, selectSession])

  // Load session data when selection changes
  useEffect(() => {
    if (!selectedSessionId) return
    const loadId = selectedSessionId
    Promise.all([
      getMessages(loadId),
      getPinnedEntries(loadId),
      getPinnedSessions(loadId),
    ]).then(([msgs, entries, pinnedSess]) => {
      if (useLoomStore.getState().selectedSessionId !== loadId) return
      setMessages(msgs)
      setPinnedEntries(entries)
      setPinnedSessions(pinnedSess)
      clearMentionedEntries()
    }).catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId])

  async function handleCreateFirst() {
    try {
      const session = await createSession()
      addSession(session)
      selectSession(session.id)
    } catch (err) { console.error(err) }
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--color-main)', overflow: 'hidden' }}>
      <SessionsPanel />

      {selectedSessionId ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <ChatHeader />
          <MessageList onSaveToCodex={setSaveToCodexMsg} />
          <InputBar />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex' }}>
          <NoSessionState onCreate={handleCreateFirst} />
        </div>
      )}

      {selectedSessionId && <ContextPanel />}

      {saveToCodexMsg && (
        <SaveToCodexDialog message={saveToCodexMsg} onClose={() => setSaveToCodexMsg(null)} />
      )}
    </div>
  )
}
