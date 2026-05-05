import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useCodexStore } from '../store/codexStore'
import { useAIStore } from '../store/aiStore'
import { useUIStore } from '../store/uiStore'
import {
  createEntry, updateEntry, archiveEntry,
  searchEntries, getRelations, addRelation, removeRelation,
} from '../lib/db/codex'
import { useAutosave } from '../hooks/useAutosave'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog'
import type { CodexEntry, CodexRelationWithEntry } from '../lib/db/types'

// ─── Constants ────────────────────────────────────────────────────────────────

type Category = CodexEntry['category']

const CATEGORIES: Category[] = ['characters', 'locations', 'factions', 'magic', 'events', 'items']

const CATEGORY_COLORS: Record<Category, string> = {
  characters: 'var(--color-characters)',
  locations:  'var(--color-locations)',
  factions:   'var(--color-factions)',
  magic:      'var(--color-magic)',
  events:     'var(--color-events)',
  items:      'var(--color-items)',
}

const CATEGORY_LABELS: Record<Category, string> = {
  characters: 'Characters',
  locations:  'Locations',
  factions:   'Factions',
  magic:      'Magic',
  events:     'Events',
  items:      'Items',
}

const CATEGORY_SHORT: Record<Category, string> = {
  characters: 'Char',
  locations:  'Loc',
  factions:   'Fac',
  magic:      'Magic',
  events:     'Events',
  items:      'Items',
}

// ─── New Entry Dialog ─────────────────────────────────────────────────────────

function NewEntryDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (entry: CodexEntry) => void
}) {
  const [selectedCat, setSelectedCat] = useState<Category | null>(null)
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)

  function reset() {
    setSelectedCat(null)
    setTitle('')
    setCreating(false)
  }

  async function handleCreate() {
    if (!selectedCat || !title.trim()) return
    setCreating(true)
    try {
      const entry = await createEntry({ category: selectedCat, title: title.trim() })
      onCreated(entry)
      reset()
      onClose()
    } catch (err) {
      console.error('Failed to create entry:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose() } }}>
      <DialogContent style={{ maxWidth: 480 }}>
        <DialogHeader>
          <DialogTitle>New Codex Entry</DialogTitle>
        </DialogHeader>

        <div style={{ padding: '4px 0 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Category</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 8, padding: '12px 8px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${selectedCat === cat ? CATEGORY_COLORS[cat] : 'var(--border-subtle)'}`,
                  background: selectedCat === cat ? `color-mix(in srgb, ${CATEGORY_COLORS[cat]} 10%, transparent)` : 'transparent',
                  transition: 'all 150ms',
                }}
              >
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: CATEGORY_COLORS[cat],
                }} />
                <span style={{
                  fontSize: 12, fontWeight: 500,
                  color: selectedCat === cat ? CATEGORY_COLORS[cat] : 'var(--text-dim)',
                }}>
                  {CATEGORY_LABELS[cat]}
                </span>
              </button>
            ))}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Name</div>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Entry name…"
            style={{
              width: '100%', background: 'rgba(240,230,210,0.05)',
              border: '1px solid var(--border-subtle)', borderRadius: 6,
              color: 'var(--text-primary)', fontSize: 14, padding: '8px 12px',
              outline: 'none', fontFamily: 'inherit', marginBottom: 20,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={() => { reset(); onClose() }}
              style={{
                background: 'transparent', border: '1px solid var(--border-medium)',
                borderRadius: 6, color: 'var(--text-dim)', fontSize: 13,
                padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!selectedCat || !title.trim() || creating}
              style={{
                background: selectedCat && title.trim() ? 'var(--color-gold)' : 'rgba(201,168,76,0.3)',
                border: 'none', borderRadius: 6,
                color: '#141210', fontSize: 13, fontWeight: 600,
                padding: '7px 14px', cursor: selectedCat && title.trim() ? 'pointer' : 'default',
                fontFamily: 'inherit', transition: 'background 150ms',
              }}
            >
              Create
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add Connection Dialog ────────────────────────────────────────────────────

function AddConnectionDialog({
  open,
  currentEntryId,
  allEntries,
  existingIds,
  onClose,
  onAdded,
}: {
  open: boolean
  currentEntryId: number
  allEntries: CodexEntry[]
  existingIds: number[]
  onClose: () => void
  onAdded: () => void
}) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [relation, setRelation] = useState('')
  const [adding, setAdding] = useState(false)

  const filtered = useMemo(() =>
    allEntries.filter(e =>
      e.id !== currentEntryId &&
      !existingIds.includes(e.id) &&
      e.title.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 20),
    [allEntries, currentEntryId, existingIds, query]
  )

  async function handleAdd() {
    if (!selectedId) return
    setAdding(true)
    try {
      await addRelation(currentEntryId, selectedId, relation.trim() || undefined)
      onAdded()
      setQuery('')
      setSelectedId(null)
      setRelation('')
      onClose()
    } finally {
      setAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent style={{ maxWidth: 440 }}>
        <DialogHeader>
          <DialogTitle>Add Connection</DialogTitle>
        </DialogHeader>
        <div style={{ padding: '4px 0 16px' }}>
          <input
            autoFocus
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedId(null) }}
            placeholder="Search entries…"
            style={{
              width: '100%', background: 'rgba(240,230,210,0.05)',
              border: '1px solid var(--border-subtle)', borderRadius: 6,
              color: 'var(--text-primary)', fontSize: 13, padding: '7px 10px',
              outline: 'none', fontFamily: 'inherit', marginBottom: 8,
            }}
          />
          <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
            {filtered.map(e => (
              <div
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                  background: selectedId === e.id ? 'rgba(240,230,210,0.08)' : 'transparent',
                  transition: 'background 100ms',
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: CATEGORY_COLORS[e.category],
                }} />
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{e.title}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  {CATEGORY_LABELS[e.category]}
                </span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 10px' }}>
                No entries found
              </div>
            )}
          </div>

          <input
            value={relation}
            onChange={e => setRelation(e.target.value)}
            placeholder="Relationship label (optional) — e.g. allies with, born in…"
            style={{
              width: '100%', background: 'rgba(240,230,210,0.05)',
              border: '1px solid var(--border-subtle)', borderRadius: 6,
              color: 'var(--text-primary)', fontSize: 13, padding: '7px 10px',
              outline: 'none', fontFamily: 'inherit', marginBottom: 16,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: '1px solid var(--border-medium)',
                borderRadius: 6, color: 'var(--text-dim)', fontSize: 13,
                padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!selectedId || adding}
              style={{
                background: selectedId ? 'var(--color-gold)' : 'rgba(201,168,76,0.3)',
                border: 'none', borderRadius: 6, color: '#141210',
                fontSize: 13, fontWeight: 600, padding: '7px 14px',
                cursor: selectedId ? 'pointer' : 'default',
                fontFamily: 'inherit', transition: 'background 150ms',
              }}
            >
              Add
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tag Input ────────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function commit() {
    const t = draft.trim()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setDraft('')
    setAdding(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {tags.map(tag => (
        <div
          key={tag}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            border: '1px solid var(--border-subtle)', borderRadius: 4,
            padding: '2px 8px', fontSize: 11, color: 'var(--text-dim)',
          }}
        >
          {tag}
          <button
            onClick={() => onChange(tags.filter(t => t !== tag))}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 13, lineHeight: 1,
              display: 'flex', alignItems: 'center',
            }}
          >
            ×
          </button>
        </div>
      ))}
      {adding ? (
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setDraft(''); setAdding(false) }
          }}
          style={{
            background: 'transparent', border: '1px solid var(--border-medium)',
            borderRadius: 4, padding: '2px 8px', fontSize: 11,
            color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
            width: 100,
          }}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            background: 'transparent', border: '1px dashed var(--border-subtle)',
            borderRadius: 4, color: 'var(--text-muted)', fontSize: 11,
            padding: '2px 8px', cursor: 'pointer',
          }}
        >
          + tag
        </button>
      )}
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ entry }: { entry: CodexEntry }) {
  const [content, setContent] = useState(entry.content)
  const { updateEntryInStore } = useCodexStore()

  useEffect(() => { setContent(entry.content) }, [entry.id])

  const save = useCallback(async (val: string) => {
    await updateEntry(entry.id, { content: val })
    updateEntryInStore(entry.id, { content: val })
  }, [entry.id])

  useAutosave(content, save)

  return (
    <textarea
      value={content}
      onChange={e => setContent(e.target.value)}
      spellCheck
      placeholder="Write about this entry…"
      style={{
        width: '100%', minHeight: 400, background: 'transparent',
        border: 'none', outline: 'none', resize: 'none',
        color: 'var(--text-primary)', fontSize: 15, lineHeight: 1.8,
        fontFamily: 'inherit', caretColor: 'var(--color-gold)',
      }}
    />
  )
}

// ─── Connections Tab ──────────────────────────────────────────────────────────

function ConnectionsTab({ entry, allEntries }: { entry: CodexEntry; allEntries: CodexEntry[] }) {
  const [relations, setRelations] = useState<CodexRelationWithEntry[]>([])
  const [addOpen, setAddOpen] = useState(false)

  async function load() {
    const rels = await getRelations(entry.id)
    setRelations(rels)
  }

  useEffect(() => { load() }, [entry.id])

  async function handleRemove(relationId: number) {
    await removeRelation(relationId)
    setRelations(r => r.filter(x => x.relation_id !== relationId))
  }

  return (
    <div>
      {relations.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          No connections yet. Link this entry to others to build your world's web of relationships.
        </p>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {relations.map(rel => (
            <div
              key={rel.relation_id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: CATEGORY_COLORS[rel.entry.category],
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{rel.entry.title}</span>
                {rel.relation && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {rel.relation}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {CATEGORY_LABELS[rel.entry.category]}
              </span>
              <button
                onClick={() => handleRemove(rel.relation_id)}
                title="Remove connection"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 16, padding: '0 4px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setAddOpen(true)}
        style={{
          background: 'transparent', border: '1px solid var(--border-medium)',
          borderRadius: 6, color: 'var(--text-dim)', fontSize: 13,
          padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        + Add connection
      </button>

      <AddConnectionDialog
        open={addOpen}
        currentEntryId={entry.id}
        allEntries={allEntries}
        existingIds={relations.map(r => r.entry.id)}
        onClose={() => setAddOpen(false)}
        onAdded={load}
      />
    </div>
  )
}

// ─── AI Tab ───────────────────────────────────────────────────────────────────

function AITab() {
  const connectedProviders = useAIStore(s => s.connectedProviders)
  const navigate = useUIStore(s => s.navigate)
  const hasKey = connectedProviders.length > 0

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px', gap: 12, textAlign: 'center',
    }}>
      {hasKey ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          AI panel coming in Phase 6.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>
            AI features need an API key
          </p>
          <button
            onClick={() => navigate('settings')}
            style={{
              background: 'transparent', border: '1px solid var(--color-gold)',
              borderRadius: 6, color: 'var(--color-gold)', fontSize: 13,
              padding: '7px 16px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Set up in Settings →
          </button>
        </>
      )}
    </div>
  )
}

// ─── Entry Detail ─────────────────────────────────────────────────────────────

function EntryDetail({ entry, allEntries }: { entry: CodexEntry; allEntries: CodexEntry[] }) {
  const [tab, setTab] = useState<'overview' | 'connections' | 'ai'>('overview')
  const [title, setTitle] = useState(entry.title)
  const [tags, setTags] = useState<string[]>(JSON.parse(entry.tags ?? '[]'))
  const { updateEntryInStore } = useCodexStore()

  useEffect(() => {
    setTitle(entry.title)
    setTags(JSON.parse(entry.tags ?? '[]'))
    setTab('overview')
  }, [entry.id])

  async function handleTitleBlur() {
    const trimmed = title.trim()
    if (!trimmed || trimmed === entry.title) return
    await updateEntry(entry.id, { title: trimmed })
    updateEntryInStore(entry.id, { title: trimmed })
  }

  async function handleTagsChange(newTags: string[]) {
    setTags(newTags)
    await updateEntry(entry.id, { tags: JSON.stringify(newTags) })
    updateEntryInStore(entry.id, { tags: JSON.stringify(newTags) })
  }

  const color = CATEGORY_COLORS[entry.category]

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 8, flexShrink: 0,
            background: 'rgba(240,230,210,0.06)',
            border: '1px solid var(--border-medium)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
          }}>
            + Cover
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              placeholder="Entry name…"
              style={{
                fontSize: 24, fontWeight: 400, color: 'var(--text-primary)',
                background: 'transparent', border: 'none', outline: 'none',
                borderBottom: '1px solid transparent', fontFamily: 'inherit',
                paddingBottom: 6, width: '100%', marginBottom: 10,
                transition: 'border-color 150ms',
              }}
              onFocus={e => (e.target.style.borderBottomColor = 'rgba(201,168,76,0.4)')}
              onBlurCapture={e => (e.target.style.borderBottomColor = 'transparent')}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                borderRadius: 5, padding: '3px 8px', fontSize: 12, fontWeight: 500,
                background: `color-mix(in srgb, ${color} 10%, transparent)`,
                border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
                color,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                {CATEGORY_LABELS[entry.category]}
              </div>
              <TagInput tags={tags} onChange={handleTagsChange} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: 20,
        }}>
          {(['overview', 'connections', 'ai'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${tab === t ? 'var(--color-gold)' : 'transparent'}`,
                color: tab === t ? 'var(--color-gold)' : 'var(--text-muted)',
                fontSize: 13, fontWeight: 500,
                padding: '8px 14px', cursor: 'pointer',
                marginBottom: -1, transition: 'all 150ms', fontFamily: 'inherit',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview' && <OverviewTab key={entry.id} entry={entry} />}
        {tab === 'connections' && <ConnectionsTab entry={entry} allEntries={allEntries} />}
        {tab === 'ai' && <AITab />}
      </div>
    </div>
  )
}

// ─── Codex Panel ──────────────────────────────────────────────────────────────

function CodexPanel({
  entries,
  archivedEntries,
  selectedId,
  activeCategory,
  showArchived,
  onSelect,
  onSetCategory,
  onArchive,
  onNewEntry,
}: {
  entries: CodexEntry[]
  archivedEntries: CodexEntry[]
  selectedId: number | null
  activeCategory: string | null
  showArchived: boolean
  onSelect: (id: number) => void
  onSetCategory: (cat: string | null) => void
  onArchive: (id: number) => void
  onNewEntry: () => void
}) {
  const searchQuery = useCodexStore(s => s.searchQuery)
  const setSearchQuery = useCodexStore(s => s.setSearchQuery)
  const [searchResults, setSearchResults] = useState<CodexEntry[] | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults(null); return }
    const t = setTimeout(async () => {
      const results = await searchEntries(searchQuery)
      setSearchResults(results)
    }, 200)
    return () => clearTimeout(t)
  }, [searchQuery])

  const displayEntries = searchResults ?? (showArchived ? archivedEntries : entries)

  const filtered = useMemo(() =>
    activeCategory
      ? displayEntries.filter(e => e.category === activeCategory)
      : displayEntries,
    [displayEntries, activeCategory]
  )

  const counts = useMemo(() => {
    const base = showArchived ? archivedEntries : entries
    const c: Record<string, number> = {}
    CATEGORIES.forEach(cat => {
      c[cat] = base.filter(e => e.category === cat).length
    })
    c['all'] = base.length
    return c
  }, [entries, archivedEntries, showArchived])

  // Group by category when "All" filter active and no search
  const grouped = useMemo(() => {
    if (activeCategory || searchResults) return null
    const groups: Record<Category, CodexEntry[]> = {
      characters: [], locations: [], factions: [], magic: [], events: [], items: [],
    }
    filtered.forEach(e => groups[e.category].push(e))
    return groups
  }, [filtered, activeCategory, searchResults])

  return (
    <aside style={{
      width: 260, flexShrink: 0,
      background: 'var(--color-panel)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search codex…"
            style={{
              flex: 1, background: 'rgba(240,230,210,0.06)',
              border: '1px solid var(--border-subtle)', borderRadius: 6,
              color: 'var(--text-primary)', fontSize: 13, padding: '6px 10px',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={onNewEntry}
            title="New entry"
            style={{
              background: 'var(--color-gold)', border: 'none', borderRadius: 6,
              color: '#141210', fontSize: 18, fontWeight: 700,
              width: 32, height: 32, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            +
          </button>
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button
            onClick={() => onSetCategory(null)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              border: `1px solid ${activeCategory === null ? 'var(--color-gold)' : 'var(--border-subtle)'}`,
              borderRadius: 12, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
              color: activeCategory === null ? 'var(--color-gold)' : 'var(--text-dim)',
              background: activeCategory === null ? 'rgba(201,168,76,0.08)' : 'transparent',
              fontFamily: 'inherit', transition: 'all 150ms',
            }}
          >
            All {counts.all > 0 && <span style={{ opacity: 0.6 }}>{counts.all}</span>}
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => onSetCategory(cat)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                border: `1px solid ${activeCategory === cat ? CATEGORY_COLORS[cat] : 'var(--border-subtle)'}`,
                borderRadius: 12, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
                color: activeCategory === cat ? CATEGORY_COLORS[cat] : 'var(--text-dim)',
                background: activeCategory === cat
                  ? `color-mix(in srgb, ${CATEGORY_COLORS[cat]} 8%, transparent)`
                  : 'transparent',
                fontFamily: 'inherit', transition: 'all 150ms',
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: CATEGORY_COLORS[cat] }} />
              {CATEGORY_SHORT[cat]}
              {counts[cat] > 0 && <span style={{ opacity: 0.6 }}>{counts[cat]}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Entry list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {grouped
          ? CATEGORIES.map(cat => {
              const catEntries = grouped[cat]
              if (catEntries.length === 0) return null
              return (
                <div key={cat}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--text-muted)',
                    padding: '8px 12px 4px',
                  }}>
                    {CATEGORY_LABELS[cat]}
                  </div>
                  {catEntries.map(e => (
                    <EntryRow
                      key={e.id} entry={e}
                      isSelected={selectedId === e.id}
                      isHovered={hoveredId === e.id}
                      onSelect={() => onSelect(e.id)}
                      onHover={setHoveredId}
                      onArchive={() => onArchive(e.id)}
                    />
                  ))}
                </div>
              )
            })
          : filtered.map(e => (
              <EntryRow
                key={e.id} entry={e}
                isSelected={selectedId === e.id}
                isHovered={hoveredId === e.id}
                onSelect={() => onSelect(e.id)}
                onHover={setHoveredId}
                onArchive={() => onArchive(e.id)}
              />
            ))
        }

        {filtered.length === 0 && (
          <div style={{ padding: '24px 12px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {searchQuery ? 'No entries match your search.' : 'No entries yet. Create one!'}
            </p>
          </div>
        )}
      </div>

      {/* Archive toggle */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px 12px' }}>
        <button
          onClick={() => useCodexStore.getState().setShowArchived(!showArchived)}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: 11, color: showArchived ? 'var(--color-gold)' : 'var(--text-muted)',
            fontFamily: 'inherit',
          }}
        >
          {showArchived ? '← Hide archived' : 'Show archived'}
        </button>
      </div>
    </aside>
  )
}

function EntryRow({
  entry, isSelected, isHovered, onSelect, onHover, onArchive,
}: {
  entry: CodexEntry
  isSelected: boolean
  isHovered: boolean
  onSelect: () => void
  onHover: (id: number | null) => void
  onArchive: () => void
}) {
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => onHover(entry.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '8px 12px', cursor: 'pointer',
        borderLeft: `2px solid ${isSelected ? 'var(--color-gold)' : 'transparent'}`,
        background: isSelected
          ? 'rgba(240,230,210,0.06)'
          : isHovered ? 'rgba(240,230,210,0.04)' : 'transparent',
        transition: 'background 100ms',
        position: 'relative',
      }}
    >
      <div style={{
        width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0,
        background: CATEGORY_COLORS[entry.category],
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500,
          color: isSelected ? 'var(--color-gold)' : 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {entry.title}
        </div>
        {entry.summary && (
          <div style={{
            fontSize: 11, color: 'var(--text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {entry.summary.slice(0, 80)}
          </div>
        )}
      </div>
      {isHovered && (
        <button
          onClick={e => { e.stopPropagation(); onArchive() }}
          title="Archive"
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'var(--color-panel)', border: '1px solid var(--border-subtle)',
            borderRadius: 4, padding: '2px 6px', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 11, fontFamily: 'inherit',
          }}
        >
          Archive
        </button>
      )}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onNewEntry }: { onNewEntry: () => void }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        Select an entry or create a new one
      </div>
      <button
        onClick={onNewEntry}
        style={{
          background: 'var(--color-gold)', border: 'none', borderRadius: 6,
          color: '#141210', fontSize: 13, fontWeight: 600,
          padding: '8px 20px', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        + New Entry
      </button>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function CodexScreen() {
  const {
    entries, archivedEntries, selectedEntryId, activeCategory, showArchived,
    loadEntries, selectEntry, setCategory,
    addEntry, archiveEntryInStore,
  } = useCodexStore()

  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => { loadEntries() }, [])

  const selectedEntry = useMemo(
    () => entries.find(e => e.id === selectedEntryId) ??
          archivedEntries.find(e => e.id === selectedEntryId) ?? null,
    [entries, archivedEntries, selectedEntryId]
  )

  async function handleArchive(id: number) {
    if (!window.confirm('Archive this entry? It will be hidden from normal views.')) return
    await archiveEntry(id)
    archiveEntryInStore(id)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <CodexPanel
        entries={entries}
        archivedEntries={archivedEntries}
        selectedId={selectedEntryId}
        activeCategory={activeCategory}
        showArchived={showArchived}
        onSelect={selectEntry}
        onSetCategory={setCategory}
        onArchive={handleArchive}
        onNewEntry={() => setDialogOpen(true)}
      />

      {selectedEntry ? (
        <EntryDetail entry={selectedEntry} allEntries={entries} />
      ) : (
        <EmptyState onNewEntry={() => setDialogOpen(true)} />
      )}

      <NewEntryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={entry => { addEntry(entry); selectEntry(entry.id) }}
      />
    </div>
  )
}
