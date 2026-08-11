import { useState, useEffect, useRef, useCallback } from 'react'
import { usePlannerStore } from '../store/plannerStore'
import { useWritingStore } from '../store/writingStore'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { getBooks, createBook, updateBook } from '../lib/db/books'
import { getChaptersWithWordCount } from '../lib/db/chapters'
import { getBeats, createBeat, updateBeat, deleteBeat } from '../lib/db/beats'
import { getScenes } from '../lib/db/scenes'
import {
  STRUCTURE_PRESETS,
  STRUCTURE_PRESET_LABELS,
  BEAT_TYPES,
  BEAT_COLORS,
  type StructurePresetKey,
  type StructureBeat,
} from '../lib/planner/structures'
import type { Book, SeriesBeat, Scene } from '../lib/db/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BOOK_GRADIENT_PAIRS = [
  ['#3d2810', '#1e1208'],
  ['#0d2a3d', '#091520'],
  ['#1a1f0d', '#0d1008'],
  ['#2d0d1e', '#180910'],
  ['#1a0d2d', '#0d0818'],
  ['#2d1a0d', '#180d08'],
]

function bookGradient(index: number) {
  const [a, b] = BOOK_GRADIENT_PAIRS[index % BOOK_GRADIENT_PAIRS.length]
  return `linear-gradient(160deg, ${a}, ${b})`
}

function chapterStatus(wordCount: number): 'planned' | 'drafting' {
  return wordCount > 0 ? 'drafting' : 'planned'
}

// ─── Top Bar ─────────────────────────────────────────────────────────────────

function PlannerTopBar() {
  const { activeStructure, setActiveStructure } = usePlannerStore()
  return (
    <div style={{
      height: 44,
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 10,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Series Planner</span>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Structure:</span>
        <select
          value={activeStructure}
          onChange={e => setActiveStructure(e.target.value as StructurePresetKey)}
          style={{
            background: 'rgba(240,230,210,0.05)',
            border: '1px solid var(--border-medium)',
            borderRadius: 6,
            color: 'var(--color-gold)',
            fontSize: 12,
            fontFamily: 'inherit',
            padding: '4px 8px',
            cursor: 'pointer',
          }}
        >
          {(Object.keys(STRUCTURE_PRESET_LABELS) as StructurePresetKey[]).map(k => (
            <option key={k} value={k}>{STRUCTURE_PRESET_LABELS[k]}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ─── Book Shelf ───────────────────────────────────────────────────────────────

function BookShelf({ books }: { books: Book[] }) {
  const { selectedBookId, selectBook } = usePlannerStore()
  const { addBook } = useWritingStore()
  const projectId = useProjectStore(s => s.projectId)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')

  async function handleAddBook() {
    if (!projectId) return
    try {
      const book = await createBook(projectId, 'Untitled Book')
      addBook(book)
      selectBook(book.id)
    } catch (err) { console.error(err) }
  }

  function handleDoubleClick(book: Book) {
    setRenamingId(book.id)
    setRenameValue(book.title)
  }

  async function handleRenameBlur(bookId: number) {
    const trimmed = renameValue.trim() || 'Untitled Book'
    try { await updateBook(bookId, trimmed) } catch (err) { console.error(err) }
    setRenamingId(null)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
      padding: '16px 20px',
      borderBottom: '1px solid var(--border-subtle)',
      flexShrink: 0,
      overflowX: 'auto',
    }}>
      {books.map((book, i) => {
        const isActive = book.id === selectedBookId
        return (
          <div
            key={book.id}
            onClick={() => selectBook(book.id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}
          >
            <div style={{
              width: 72,
              height: 108,
              borderRadius: 4,
              background: bookGradient(i),
              border: isActive ? '2px solid var(--color-gold)' : '1px solid rgba(240,230,210,0.12)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: 8,
              transition: 'transform 150ms',
              transform: isActive ? 'translateY(-4px)' : undefined,
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(201,168,76,0.04), rgba(0,0,0,0.55))' }} />
              <div style={{ position: 'relative', textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: 'rgba(201,168,76,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                  Book {i + 1}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(240,230,210,0.88)', lineHeight: 1.3, fontWeight: 500 }}>
                  {book.title}
                </div>
              </div>
            </div>
            {renamingId === book.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={() => handleRenameBlur(book.id)}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                onClick={e => e.stopPropagation()}
                style={{
                  width: 80,
                  fontSize: 10,
                  textAlign: 'center',
                  background: 'var(--color-panel)',
                  border: '1px solid var(--color-gold)',
                  borderRadius: 3,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  padding: '2px 4px',
                  outline: 'none',
                }}
              />
            ) : (
              <div
                onDoubleClick={() => handleDoubleClick(book)}
                style={{ fontSize: 10, color: isActive ? 'var(--color-gold)' : 'var(--text-muted)', textAlign: 'center', maxWidth: 80 }}
              >
                {isActive ? 'Active' : `Book ${i + 1}`}
              </div>
            )}
          </div>
        )
      })}
      <div
        onClick={handleAddBook}
        style={{
          width: 72,
          height: 108,
          borderRadius: 4,
          border: '1px dashed rgba(240,230,210,0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          cursor: 'pointer',
          color: 'var(--text-muted)',
          flexShrink: 0,
          fontSize: 10,
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
        <span>Add book</span>
      </div>
    </div>
  )
}

// ─── Beat Ruler ───────────────────────────────────────────────────────────────

interface AddBeatPopover {
  position: number
  x: number
}

function BeatRuler() {
  const { beats, activeStructure, selectedBeatId, selectBeat, addBeat, updateBeatInStore, selectedBookId } = usePlannerStore()
  const rulerRef = useRef<HTMLDivElement>(null)
  const [addPopover, setAddPopover] = useState<AddBeatPopover | null>(null)
  const [newBeatTitle, setNewBeatTitle] = useState('')
  const [newBeatType, setNewBeatType] = useState<string>(BEAT_TYPES[0])
  const [draggingId, setDraggingId] = useState<number | null>(null)

  const structureBeats: StructureBeat[] = STRUCTURE_PRESETS[activeStructure]

  function getPositionFromEvent(e: MouseEvent | React.MouseEvent): number {
    if (!rulerRef.current) return 0
    const rect = rulerRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  }

  function handleRulerClick(e: React.MouseEvent) {
    if (draggingId !== null) return
    const position = getPositionFromEvent(e)
    const rect = rulerRef.current!.getBoundingClientRect()
    setAddPopover({ position, x: e.clientX - rect.left })
    setNewBeatTitle('')
    setNewBeatType(BEAT_TYPES[0])
  }

  async function handleAddBeat() {
    if (!addPopover || !newBeatTitle.trim() || selectedBookId === null) return
    try {
      const beat = await createBeat({
        book_id: selectedBookId,
        title: newBeatTitle.trim(),
        description: null,
        beat_type: newBeatType,
        position: addPopover.position,
        color: BEAT_COLORS[newBeatType as keyof typeof BEAT_COLORS] ?? '#c9a84c',
      })
      addBeat(beat)
      setAddPopover(null)
    } catch (err) { console.error(err) }
  }

  function handleBeatMouseDown(e: React.MouseEvent, beat: SeriesBeat) {
    e.stopPropagation()
    e.preventDefault()
    selectBeat(beat.id)
    setDraggingId(beat.id)
    const startX = e.clientX
    const startPos = beat.position

    const onMove = (me: MouseEvent) => {
      if (!rulerRef.current) return
      const rect = rulerRef.current.getBoundingClientRect()
      const delta = (me.clientX - startX) / rect.width
      const newPos = Math.max(0, Math.min(1, startPos + delta))
      updateBeatInStore(beat.id, { position: newPos })
    }
    const onUp = async (me: MouseEvent) => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      setDraggingId(null)
      if (!rulerRef.current) return
      const rect = rulerRef.current.getBoundingClientRect()
      const delta = (me.clientX - startX) / rect.width
      const newPos = Math.max(0, Math.min(1, startPos + delta))
      try { await updateBeat(beat.id, { position: newPos }) } catch (err) { console.error(err) }
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div style={{ margin: '20px 20px 4px', position: 'relative' }}>
      <div style={{ fontSize: 10, color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
        {STRUCTURE_PRESET_LABELS[activeStructure]}
        {beats.length > 0 && ` · ${beats.length} beat${beats.length !== 1 ? 's' : ''}`}
      </div>
      <div
        ref={rulerRef}
        onClick={handleRulerClick}
        style={{ position: 'relative', height: 48, cursor: 'crosshair', userSelect: 'none' }}
      >
        {/* Track line */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 10, height: 1, background: 'rgba(201,168,76,0.08)' }} />

        {/* Structure template ticks */}
        {structureBeats.map(b => (
          <div
            key={b.name}
            style={{ position: 'absolute', left: `${b.position * 100}%`, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}
          >
            <div style={{ width: 1, height: b.major ? 14 : 10, background: b.major ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.3)' }} />
            <div style={{
              fontSize: 9,
              color: b.major ? 'var(--color-gold)' : 'rgba(201,168,76,0.5)',
              fontWeight: b.major ? 500 : 400,
              whiteSpace: 'nowrap',
              marginTop: 3,
              letterSpacing: '0.03em',
              transform: 'translateX(-50%)',
            }}>
              {b.name}
            </div>
          </div>
        ))}

        {/* User beat markers */}
        {beats.map(b => {
          const color = b.color ?? '#c9a84c'
          const isSelected = b.id === selectedBeatId
          return (
            <div
              key={b.id}
              onMouseDown={e => handleBeatMouseDown(e, b)}
              title={`${b.title}${b.beat_type ? ` · ${b.beat_type}` : ''}`}
              style={{
                position: 'absolute',
                left: `${b.position * 100}%`,
                top: 2,
                transform: 'translateX(-50%)',
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: color,
                border: isSelected ? '2px solid white' : '2px solid rgba(0,0,0,0.4)',
                cursor: 'grab',
                boxShadow: isSelected ? `0 0 0 2px ${color}` : 'none',
                zIndex: 2,
                transition: 'box-shadow 100ms',
              }}
            />
          )
        })}
      </div>

      {/* Add beat popover */}
      {addPopover && (
        <>
          <div
            onClick={() => setAddPopover(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 9 }}
          />
          <div style={{
            position: 'absolute',
            left: Math.min(addPopover.x, 300),
            top: 54,
            zIndex: 10,
            background: 'var(--color-panel)',
            border: '1px solid var(--border-medium)',
            borderRadius: 8,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minWidth: 220,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Add beat at {Math.round(addPopover.position * 100)}%
            </div>
            <input
              autoFocus
              value={newBeatTitle}
              onChange={e => setNewBeatTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddBeat(); if (e.key === 'Escape') setAddPopover(null) }}
              placeholder="Beat title"
              style={{
                background: 'rgba(240,230,210,0.05)',
                border: '1px solid var(--border-medium)',
                borderRadius: 4,
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: 13,
                padding: '6px 8px',
                outline: 'none',
              }}
            />
            <select
              value={newBeatType}
              onChange={e => setNewBeatType(e.target.value)}
              style={{
                background: 'rgba(240,230,210,0.05)',
                border: '1px solid var(--border-medium)',
                borderRadius: 4,
                color: 'var(--text-dim)',
                fontFamily: 'inherit',
                fontSize: 12,
                padding: '4px 6px',
                cursor: 'pointer',
              }}
            >
              {BEAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              onClick={handleAddBeat}
              style={{
                background: 'rgba(201,168,76,0.15)',
                border: '1px solid rgba(201,168,76,0.3)',
                borderRadius: 5,
                color: 'var(--color-gold)',
                fontFamily: 'inherit',
                fontSize: 12,
                padding: '5px 0',
                cursor: 'pointer',
              }}
            >
              Add beat
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Chapter List ─────────────────────────────────────────────────────────────

function ChapterList() {
  const { chapters, selectedChapterId, selectChapter } = usePlannerStore()

  if (chapters.length === 0) {
    return (
      <div style={{ padding: '32px 20px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
        No chapters yet. Open the Writing screen to create chapters.
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500, marginBottom: 4 }}>
        Chapters
      </div>
      {chapters.map((ch, i) => {
        const status = chapterStatus(ch.total_word_count)
        const isSelected = ch.id === selectedChapterId
        const stripeColor = status === 'drafting' ? 'var(--color-gold)' : 'rgba(240,230,210,0.15)'
        return (
          <div
            key={ch.id}
            onClick={() => selectChapter(ch.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-muted)', width: 48, textAlign: 'right', flexShrink: 0 }}>
              Ch. {i + 1}
            </div>
            <div style={{
              flex: 1,
              height: 34,
              borderRadius: 6,
              background: isSelected ? 'rgba(201,168,76,0.08)' : 'rgba(240,230,210,0.06)',
              border: `1px solid ${isSelected ? 'rgba(201,168,76,0.2)' : 'var(--border-subtle)'}`,
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              gap: 8,
              position: 'relative',
              overflow: 'hidden',
              transition: 'background 100ms, border-color 100ms',
            }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: stripeColor }} />
              <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 4 }}>
                {ch.title}
              </span>
              {ch.total_word_count > 0 && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {ch.total_word_count.toLocaleString()} w
                </span>
              )}
              <span style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 8,
                flexShrink: 0,
                ...(status === 'drafting'
                  ? { background: 'rgba(201,168,76,0.12)', color: 'var(--color-gold)', border: '1px solid rgba(201,168,76,0.2)' }
                  : { background: 'rgba(240,230,210,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }
                ),
              }}>
                {status === 'drafting' ? 'Drafting' : 'Planned'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function ChapterDetailPanel() {
  const { chapters, selectedChapterId, selectedBookId, beats, selectedBeatId, updateBeatInStore, deleteBeatFromStore } = usePlannerStore()
  const navigate = useUIStore(s => s.navigate)
  const { selectBook, selectChapter } = useWritingStore()

  const selectedChapter = chapters.find(c => c.id === selectedChapterId) ?? null
  const selectedBeat = beats.find(b => b.id === selectedBeatId) ?? null

  const [scenes, setScenes] = useState<Scene[]>([])
  const [beatTitle, setBeatTitle] = useState('')
  const [beatDesc, setBeatDesc] = useState('')
  const [beatType, setBeatType] = useState('')

  useEffect(() => {
    if (!selectedChapterId) { setScenes([]); return }
    getScenes(selectedChapterId).then(setScenes).catch(console.error)
  }, [selectedChapterId])

  useEffect(() => {
    if (!selectedBeat) return
    setBeatTitle(selectedBeat.title)
    setBeatDesc(selectedBeat.description ?? '')
    setBeatType(selectedBeat.beat_type ?? BEAT_TYPES[0])
  }, [selectedBeat?.id])

  async function handleBeatTitleBlur() {
    if (!selectedBeat) return
    const trimmed = beatTitle.trim()
    if (!trimmed || trimmed === selectedBeat.title) return
    try {
      await updateBeat(selectedBeat.id, { title: trimmed })
      updateBeatInStore(selectedBeat.id, { title: trimmed })
    } catch (err) { console.error(err) }
  }

  async function handleBeatDescBlur() {
    if (!selectedBeat) return
    if (beatDesc === (selectedBeat.description ?? '')) return
    try {
      await updateBeat(selectedBeat.id, { description: beatDesc || null })
      updateBeatInStore(selectedBeat.id, { description: beatDesc || null })
    } catch (err) { console.error(err) }
  }

  async function handleBeatTypeChange(value: string) {
    if (!selectedBeat) return
    setBeatType(value)
    const color = BEAT_COLORS[value as keyof typeof BEAT_COLORS] ?? '#c9a84c'
    try {
      await updateBeat(selectedBeat.id, { beat_type: value, color })
      updateBeatInStore(selectedBeat.id, { beat_type: value, color })
    } catch (err) { console.error(err) }
  }

  async function handleDeleteBeat() {
    if (!selectedBeat) return
    try {
      await deleteBeat(selectedBeat.id)
      deleteBeatFromStore(selectedBeat.id)
    } catch (err) { console.error(err) }
  }

  function handleOpenInEditor() {
    if (!selectedChapter || !selectedBookId) return
    selectBook(selectedBookId)
    selectChapter(selectedChapter.id)
    navigate('writing')
  }

  const panelFieldStyle: React.CSSProperties = {
    background: 'rgba(240,230,210,0.05)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 5,
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    fontSize: 13,
    padding: '6px 8px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  }

  if (!selectedChapter && !selectedBeat) {
    return (
      <div style={{
        width: 260,
        flexShrink: 0,
        background: 'var(--color-panel)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: 13,
      }}>
        Select a chapter or beat
      </div>
    )
  }

  return (
    <div style={{
      width: 260,
      flexShrink: 0,
      background: 'var(--color-panel)',
      borderLeft: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
          {selectedBeat ? selectedBeat.title : selectedChapter!.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {selectedBeat ? (selectedBeat.beat_type ?? 'Beat') : `${chapterStatus(selectedChapter!.total_word_count) === 'drafting' ? 'Drafting' : 'Planned'}`}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {selectedBeat ? (
          /* Beat detail */
          <>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Title</div>
              <input
                value={beatTitle}
                onChange={e => setBeatTitle(e.target.value)}
                onBlur={handleBeatTitleBlur}
                style={panelFieldStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Beat type</div>
              <select value={beatType} onChange={e => handleBeatTypeChange(e.target.value)} style={{ ...panelFieldStyle, cursor: 'pointer' }}>
                {BEAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Notes</div>
              <textarea
                value={beatDesc}
                onChange={e => setBeatDesc(e.target.value)}
                onBlur={handleBeatDescBlur}
                placeholder="Describe this beat…"
                rows={5}
                style={{ ...panelFieldStyle, resize: 'vertical', lineHeight: 1.5 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <div
                style={{ width: 14, height: 14, borderRadius: '50%', background: selectedBeat.color ?? '#c9a84c', flexShrink: 0 }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Position: {Math.round(selectedBeat.position * 100)}%
              </span>
            </div>
            <button
              onClick={handleDeleteBeat}
              style={{
                marginTop: 'auto',
                padding: '7px 12px',
                borderRadius: 6,
                background: 'rgba(196,74,74,0.08)',
                border: '1px solid rgba(196,74,74,0.2)',
                color: '#c44a4a',
                fontFamily: 'inherit',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Delete beat
            </button>
          </>
        ) : (
          /* Chapter detail */
          <>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Progress</div>
              <div style={{ height: 6, background: 'rgba(240,230,210,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  borderRadius: 3,
                  background: 'var(--color-gold)',
                  width: `${Math.min(100, (selectedChapter!.total_word_count / 4000) * 100)}%`,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>{selectedChapter!.total_word_count.toLocaleString()} words</span>
                <span>~4,000 target</span>
              </div>
            </div>

            {scenes.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Scenes ({scenes.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {scenes.map(sc => (
                    <div key={sc.id} style={{
                      fontSize: 12,
                      color: 'var(--text-dim)',
                      background: 'rgba(240,230,210,0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 4,
                      padding: '5px 8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sc.title}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{sc.word_count}w</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleOpenInEditor}
              style={{
                marginTop: 'auto',
                padding: '7px 12px',
                borderRadius: 6,
                background: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.2)',
                color: 'var(--color-gold)',
                fontFamily: 'inherit',
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Open in editor →
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function SeriesPlannerScreen() {
  const books = useWritingStore(s => s.books)
  const setBooks = useWritingStore(s => s.setBooks)
  const projectId = useProjectStore(s => s.projectId)
  const { selectedBookId, selectBook, setChapters, setBeats } = usePlannerStore()

  // Load books into writingStore if empty (planner visited before writing screen)
  useEffect(() => {
    if (!projectId || books.length > 0) return
    getBooks(projectId).then(setBooks).catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Auto-select first book
  useEffect(() => {
    if (books.length > 0 && !selectedBookId) selectBook(books[0].id)
  }, [books, selectedBookId, selectBook])

  // Load chapters + beats when book changes
  const loadBookData = useCallback(async (bookId: number) => {
    const [chapters, beats] = await Promise.all([
      getChaptersWithWordCount(bookId),
      getBeats(bookId),
    ])
    setChapters(chapters)
    setBeats(beats)
  }, [setChapters, setBeats])

  useEffect(() => {
    if (!selectedBookId) return
    loadBookData(selectedBookId).catch(console.error)
  }, [selectedBookId, loadBookData])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-main)' }}>
      <PlannerTopBar />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <BookShelf books={books} />
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <BeatRuler />
            <ChapterList />
          </div>
        </div>
        <ChapterDetailPanel />
      </div>
    </div>
  )
}
