import { useState, useEffect, useRef } from 'react'
import { searchAll } from '../lib/db/search'
import type { SearchResult } from '../lib/db/search'
import { useUIStore } from '../store/uiStore'
import { useCodexStore } from '../store/codexStore'
import { useNotesStore } from '../store/notesStore'
import { useLoomStore } from '../store/loomStore'
import { useWritingStore } from '../store/writingStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'scene' | 'codex' | 'note' | 'loom_message'

const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'All',
  scene: 'Manuscript',
  codex: 'Codex',
  note: 'Notes',
  loom_message: 'Loom',
}

const CATEGORY_COLORS: Record<string, string> = {
  characters: '#c9a84c',
  locations:  '#3d9e8a',
  factions:   '#4ab3d4',
  magic:      '#7b5ea7',
  events:     '#c47a8a',
  items:      '#c4824a',
}

// ─── Highlight ────────────────────────────────────────────────────────────────

function Highlighted({ text }: { text: string }) {
  const parts = text.split(/(<mark>[\s\S]*?<\/mark>)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('<mark>') ? (
          <mark
            key={i}
            style={{
              background: 'rgba(201,168,76,0.25)',
              color: 'var(--color-gold)',
              borderRadius: 2,
              padding: '0 1px',
            }}
          >
            {part.slice(6, -7)}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SceneIcon({ color }: { color: string }) {
  return (
    <div style={{ width: 30, height: 30, borderRadius: 7, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6L8 1z" />
        <polyline points="8 1 8 6 13 6" />
      </svg>
    </div>
  )
}

function NoteIcon({ color }: { color: string }) {
  return (
    <div style={{ width: 30, height: 30, borderRadius: 7, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
        <line x1="4" y1="5" x2="10" y2="5" />
        <line x1="4" y1="7.5" x2="10" y2="7.5" />
        <line x1="4" y1="10" x2="7" y2="10" />
      </svg>
    </div>
  )
}

function LoomIcon({ color }: { color: string }) {
  return (
    <div style={{ width: 30, height: 30, borderRadius: 7, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 3h12a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5H7l-3.5 2.5V9H1a.5.5 0 0 1-.5-.5v-5A.5.5 0 0 1 1 3z" />
      </svg>
    </div>
  )
}

function CodexAvatar({ title, category }: { title: string; category?: string }) {
  const color = CATEGORY_COLORS[category ?? ''] ?? '#c9a84c'
  const initials = title.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%',
      background: `${color}20`, border: `1px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, color, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

function ResultIcon({ result }: { result: SearchResult }) {
  const muted = 'rgba(240,230,210,0.4)'
  if (result.type === 'codex') return <CodexAvatar title={result.title} category={result.category} />
  if (result.type === 'scene') return <SceneIcon color="#6a9e5a" />
  if (result.type === 'note') return <NoteIcon color={muted} />
  return <LoomIcon color="#c9a84c" />
}

// ─── Type Badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type, category }: { type: SearchResult['type']; category?: string }) {
  const configs: Record<string, { label: string; color: string }> = {
    scene: { label: 'Scene', color: '#6a9e5a' },
    codex: { label: category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Codex', color: CATEGORY_COLORS[category ?? ''] ?? '#c9a84c' },
    note: { label: 'Note', color: 'rgba(240,230,210,0.5)' },
    loom_message: { label: 'Loom', color: '#c9a84c' },
  }
  const cfg = configs[type]
  return (
    <span style={{
      fontSize: 10, padding: '1px 6px', borderRadius: 8,
      background: `${cfg.color}18`, color: cfg.color,
      border: `1px solid ${cfg.color}30`,
    }}>
      {cfg.label}
    </span>
  )
}

// ─── Result Row ───────────────────────────────────────────────────────────────

function ResultRow({
  result, isActive, onClick,
}: {
  result: SearchResult
  isActive: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
        borderLeft: isActive ? '2px solid var(--color-gold)' : '2px solid transparent',
        background: isActive ? 'rgba(201,168,76,0.07)' : 'transparent',
        transition: 'background 100ms',
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(240,230,210,0.04)' }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
    >
      <ResultIcon result={result} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {result.title}
        </div>
        {result.excerpt && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 4 }}>
            <Highlighted text={result.excerpt} />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TypeBadge type={result.type} category={result.category} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.breadcrumb}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Preview Panel ────────────────────────────────────────────────────────────

function PreviewPanel({
  result,
  onOpen,
}: {
  result: SearchResult | null
  onOpen: (r: SearchResult) => void
}) {
  if (!result) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 8 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
          <circle cx="12" cy="12" r="9" />
          <line x1="19" y1="19" x2="26" y2="26" />
        </svg>
        <span style={{ fontSize: 12 }}>Select a result to preview</span>
      </div>
    )
  }

  const actionLabel = {
    scene: 'Open in Writing →',
    codex: 'Open in Codex →',
    note: 'Open in Notes →',
    loom_message: 'Open in Loom →',
  }[result.type]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ height: 48, borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0 }}>
        {result.type === 'codex' ? (
          <CodexAvatar title={result.title} category={result.category} />
        ) : (
          <ResultIcon result={result} />
        )}
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {result.title}
        </span>
        <TypeBadge type={result.type} category={result.category} />
        <button
          onClick={() => onOpen(result)}
          style={{
            flexShrink: 0, padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.28)',
            color: 'var(--color-gold)', fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          {result.breadcrumb}
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.3 }}>
          {result.title}
        </h2>
        {result.excerpt ? (
          <div style={{ fontSize: 13, color: 'rgba(240,230,210,0.75)', lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            <Highlighted text={result.excerpt} />
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No content yet.</div>
        )}
      </div>
    </div>
  )
}

// ─── Empty & Idle States ──────────────────────────────────────────────────────

function NoResults({ query }: { query: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="rgba(240,230,210,0.2)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="18" r="13" />
        <line x1="28" y1="28" x2="38" y2="38" />
        <line x1="14" y1="18" x2="22" y2="18" />
        <line x1="18" y1="14" x2="18" y2="22" />
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 4 }}>No results for "{query}"</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Try different words, or search in a specific category.</div>
      </div>
    </div>
  )
}

function IdleState({
  recentSearches,
  onRecentClick,
}: {
  recentSearches: string[]
  onRecentClick: (q: string) => void
}) {
  const navigate = useUIStore((s) => s.navigate)

  return (
    <div style={{ padding: 24, flex: 1 }}>
      {recentSearches.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Recent</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {recentSearches.map((q) => (
              <button
                key={q}
                onClick={() => onRecentClick(q)}
                style={{
                  padding: '5px 12px', borderRadius: 12, fontSize: 12,
                  background: 'rgba(240,230,210,0.05)', border: '1px solid var(--border-subtle)',
                  color: 'var(--text-dim)', fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Jump to</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(['writing', 'codex', 'notes', 'loom'] as const).map((screen) => {
            const labels: Record<string, string> = { writing: 'Writing', codex: 'Codex', notes: 'Notes', loom: 'Loom' }
            return (
              <button
                key={screen}
                onClick={() => navigate(screen)}
                style={{
                  padding: '7px 16px', borderRadius: 7, fontSize: 12,
                  background: 'rgba(240,230,210,0.05)', border: '1px solid var(--border-medium)',
                  color: 'var(--text-dim)', fontFamily: 'inherit', cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,168,76,0.06)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'; e.currentTarget.style.color = 'var(--color-gold)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(240,230,210,0.05)'; e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.color = 'var(--text-dim)' }}
              >
                {labels[screen]}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Result List (grouped) ────────────────────────────────────────────────────

const TYPE_ORDER: SearchResult['type'][] = ['scene', 'codex', 'note', 'loom_message']
const TYPE_LABELS: Record<SearchResult['type'], string> = {
  scene: 'Manuscript',
  codex: 'Codex',
  note: 'Notes',
  loom_message: 'Loom',
}
const EXPAND_THRESHOLD = 3

function GroupedResultList({
  results, filter, activeResult, onSelect,
}: {
  results: SearchResult[]
  filter: FilterKey
  activeResult: SearchResult | null
  onSelect: (r: SearchResult) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const filtered = filter === 'all' ? results : results.filter((r) => r.type === filter)

  if (filter !== 'all') {
    return (
      <div style={{ padding: '8px 8px' }}>
        {filtered.map((r) => (
          <ResultRow key={`${r.type}-${r.id}`} result={r} isActive={activeResult?.id === r.id && activeResult?.type === r.type} onClick={() => onSelect(r)} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 8px' }}>
      {TYPE_ORDER.map((type) => {
        const group = filtered.filter((r) => r.type === type)
        if (group.length === 0) return null
        const isExpanded = expanded[type]
        const visible = isExpanded ? group : group.slice(0, EXPAND_THRESHOLD)
        const hidden = group.length - EXPAND_THRESHOLD

        return (
          <div key={type} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 10px 3px' }}>
              {TYPE_LABELS[type]}
            </div>
            {visible.map((r) => (
              <ResultRow key={`${r.type}-${r.id}`} result={r} isActive={activeResult?.id === r.id && activeResult?.type === r.type} onClick={() => onSelect(r)} />
            ))}
            {!isExpanded && hidden > 0 && (
              <button
                onClick={() => setExpanded((prev) => ({ ...prev, [type]: true }))}
                style={{ padding: '4px 10px', fontSize: 11, color: 'var(--color-gold)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Show {hidden} more…
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function SearchScreen() {
  const navigate = useUIStore((s) => s.navigate)
  const selectEntry = useCodexStore((s) => s.selectEntry)
  const selectNote = useNotesStore((s) => s.selectNote)
  const selectSession = useLoomStore((s) => s.selectSession)
  const { selectBook, selectChapter, selectScene } = useWritingStore()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [activeResult, setActiveResult] = useState<SearchResult | null>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      setActiveResult(null)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await searchAll(query)
        setResults(res)
        setActiveResult(res[0] ?? null)
      } catch (err) {
        console.error(err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const filteredResults = filter === 'all' ? results : results.filter((r) => r.type === filter)

  const counts = {
    scene: results.filter((r) => r.type === 'scene').length,
    codex: results.filter((r) => r.type === 'codex').length,
    note: results.filter((r) => r.type === 'note').length,
    loom_message: results.filter((r) => r.type === 'loom_message').length,
  }

  function addRecentSearch(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return
    setRecentSearches((prev) => [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, 5))
  }

  function openResult(result: SearchResult) {
    addRecentSearch(query)
    switch (result.type) {
      case 'scene':
        if (result.bookId != null) selectBook(result.bookId)
        if (result.chapterId != null) selectChapter(result.chapterId)
        selectScene(result.id)
        navigate('writing')
        break
      case 'codex':
        selectEntry(result.id)
        navigate('codex')
        break
      case 'note':
        selectNote(result.id)
        navigate('notes')
        break
      case 'loom_message':
        if (result.sessionId != null) selectSession(result.sessionId)
        navigate('loom')
        break
    }
  }

  const FILTERS: FilterKey[] = ['all', 'scene', 'codex', 'note', 'loom_message']

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'Escape':
        navigate('writing')
        break
      case 'ArrowDown': {
        e.preventDefault()
        const idx = activeResult ? filteredResults.findIndex((r) => r.id === activeResult.id && r.type === activeResult.type) : -1
        const next = filteredResults[idx + 1]
        if (next) setActiveResult(next)
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        const idx = activeResult ? filteredResults.findIndex((r) => r.id === activeResult.id && r.type === activeResult.type) : 0
        const prev = filteredResults[idx - 1]
        if (prev) setActiveResult(prev)
        break
      }
      case 'Enter':
        if (activeResult) openResult(activeResult)
        break
      case 'Tab': {
        e.preventDefault()
        const fi = FILTERS.indexOf(filter)
        setFilter(FILTERS[(fi + 1) % FILTERS.length])
        break
      }
    }
  }

  const hasQuery = query.trim().length > 0
  const hasResults = filteredResults.length > 0

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-main)', outline: 'none' }}
    >
      {/* Search bar */}
      <div style={{ padding: '18px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(240,230,210,0.05)', border: '1px solid var(--border-medium)', borderRadius: 10, padding: '10px 14px', transition: 'border-color 150ms' }}
          onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)')}
          onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'var(--border-medium)')}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="8" cy="8" r="6" /><line x1="13" y1="13" x2="17" y2="17" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your world — characters, places, chapters…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 15, fontFamily: 'inherit' }}
          />
          {loading && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>…</span>
          )}
          {hasQuery && !loading && (
            <button
              onClick={() => { setQuery(''); setResults([]); setActiveResult(null); inputRef.current?.focus() }}
              style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(240,230,210,0.08)', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >×</button>
          )}
          <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(240,230,210,0.07)', border: '1px solid var(--border-medium)', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>Esc</kbd>
        </div>
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '12px 24px 0', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        {FILTERS.map((f) => {
          const count = f === 'all' ? results.length : counts[f as keyof typeof counts]
          const isActive = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 10px', background: 'none', border: 'none', fontFamily: 'inherit',
                fontSize: 12, cursor: 'pointer', color: isActive ? 'var(--color-gold)' : 'var(--text-muted)',
                borderBottom: isActive ? '2px solid var(--color-gold)' : '2px solid transparent',
                marginBottom: -1, transition: 'color 150ms',
              }}
            >
              {FILTER_LABELS[f]}
              {hasQuery && count > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 16, height: 16, borderRadius: 8, fontSize: 10, padding: '0 4px', marginLeft: 5,
                  background: isActive ? 'rgba(201,168,76,0.15)' : 'rgba(240,230,210,0.08)',
                  color: isActive ? 'var(--color-gold)' : 'var(--text-muted)',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {!hasQuery ? (
          <IdleState recentSearches={recentSearches} onRecentClick={(q) => { setQuery(q); inputRef.current?.focus() }} />
        ) : !hasResults && !loading ? (
          <NoResults query={query} />
        ) : (
          <>
            {/* Result list */}
            <div style={{ width: 360, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', overflowY: 'auto' }}>
              <GroupedResultList
                results={results}
                filter={filter}
                activeResult={activeResult}
                onSelect={setActiveResult}
              />
            </div>

            {/* Preview */}
            <PreviewPanel result={activeResult} onOpen={openResult} />
          </>
        )}
      </div>
    </div>
  )
}
