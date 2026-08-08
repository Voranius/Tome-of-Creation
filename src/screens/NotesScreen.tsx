import { useState, useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import { baseExtensions, baseEditorProps } from '../lib/editor/editorConfig'
import { useAutosave } from '../hooks/useAutosave'
import { useNotesStore } from '../store/notesStore'
import { useProjectStore } from '../store/projectStore'
import { useSettingsStore } from '../store/settingsStore'
import { EditorToolbar, editorCanvasStyle, editorContentShellStyle } from '../components/writing/EditorToolbar'
import { getNotes, createNote, updateNote, archiveNote } from '../lib/db/notes'
import type { Note } from '../lib/db/types'

// ─── Notes List Panel ────────────────────────────────────────────────────────

const NOTE_AUTOSAVE_DELAY_MS = 250

function NotesListPanel() {
  const { notes, selectedNoteId, selectNote, addNote, archiveNoteInStore } = useNotesStore()

  async function handleNewNote() {
    try {
      const note = await createNote()
      addNote(note)
      selectNote(note.id)
    } catch (err) {
      console.error('Failed to create note:', err)
    }
  }

  async function handleArchive(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    try {
      await archiveNote(id)
      archiveNoteInStore(id)
    } catch (err) {
      console.error('Failed to archive note:', err)
    }
  }

  return (
    <aside style={{
      width: 240,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-panel)',
      borderRight: '1px solid var(--border-subtle)',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Notes
        </span>
        <button
          onClick={handleNewNote}
          title="New Note"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-gold)',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            padding: '2px 4px',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          +
        </button>
      </div>

      {/* Note list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {notes.length === 0 ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}>
            No notes yet.<br />Click + to create one.
          </div>
        ) : (
          notes.map(note => (
            <NoteRow
              key={note.id}
              note={note}
              isSelected={note.id === selectedNoteId}
              onSelect={() => selectNote(note.id)}
              onArchive={(e) => handleArchive(e, note.id)}
            />
          ))
        )}
      </div>
    </aside>
  )
}

function NoteRow({
  note,
  isSelected,
  onSelect,
  onArchive,
}: {
  note: Note
  isSelected: boolean
  onSelect: () => void
  onArchive: (e: React.MouseEvent) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px',
        cursor: 'pointer',
        borderLeft: isSelected ? '2px solid var(--color-gold)' : '2px solid transparent',
        background: isSelected ? 'rgba(201,168,76,0.06)' : hovered ? 'rgba(240,230,210,0.04)' : 'transparent',
        transition: 'background 100ms',
        gap: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          color: isSelected ? 'var(--text-primary)' : 'var(--text-dim)',
          fontWeight: isSelected ? 500 : 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {note.title || 'Untitled Note'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {note.word_count} {note.word_count === 1 ? 'word' : 'words'}
        </div>
      </div>
      {hovered && (
        <button
          onClick={onArchive}
          title="Archive note"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 14,
            padding: '2px 4px',
            borderRadius: 3,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

// ─── Note Editor Shell ───────────────────────────────────────────────────────

function NoteEditorShell({ note }: { note: Note }) {
  const { updateNoteInStore } = useNotesStore()
  const { editorFontFamily, editorFontSize } = useSettingsStore()
  const [title, setTitle] = useState(note.title)
  const [wordCount, setWordCount] = useState(note.word_count)
  const [content, setContent] = useState(note.content ?? '')

  useEffect(() => { setTitle(note.title) }, [note.id])

  const { status: saveStatus } = useAutosave(content, useCallback(async (c: string) => {
    await updateNote(note.id, { content: c, word_count: wordCount })
    updateNoteInStore(note.id, { content: c, word_count: wordCount })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id, wordCount]), NOTE_AUTOSAVE_DELAY_MS)

  const editor = useEditor({
    extensions: [
      ...baseExtensions,
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    ...baseEditorProps,
    content: (() => { try { return note.content ? JSON.parse(note.content) : '' } catch { return '' } })(),
    onUpdate: ({ editor: e }) => {
      const json = JSON.stringify(e.getJSON())
      const wc = e.storage.characterCount?.words() ?? 0
      setWordCount(wc)
      setContent(json)
    },
  }, [note.id])

  async function handleTitleBlur() {
    const trimmed = title.trim() || 'Untitled Note'
    if (trimmed !== note.title) {
      await updateNote(note.id, { title: trimmed }).catch(console.error)
      updateNoteInStore(note.id, { title: trimmed })
    }
  }

  return (
    <div style={{
      ...editorCanvasStyle,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      '--editor-canvas-max-width': '100%',
      '--editor-content-max-width': '720px',
    } as React.CSSProperties}>
      {/* Title */}
      <div style={{ padding: '20px 48px 0' }}>
        <div style={editorContentShellStyle}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            placeholder="Untitled Note"
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              padding: 0,
            }}
          />
        </div>
      </div>

      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 48px',
        fontFamily: editorFontFamily || 'inherit',
        fontSize: editorFontSize ? `${editorFontSize}px` : 'inherit',
      }}>
        <div style={editorContentShellStyle}>
          <EditorContent editor={editor} style={{ minHeight: '100%' }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 48px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        fontSize: 11,
        color: 'var(--text-muted)',
        flexShrink: 0,
      }}>
        <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
        <span style={{ marginLeft: 'auto' }}>
          {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
        </span>
      </div>
    </div>
  )
}

function NotesEmptyState() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-muted)',
      fontSize: 14,
      gap: 8,
    }}>
      <div style={{ fontSize: 32, opacity: 0.3 }}>📝</div>
      <div>Select a note or create a new one</div>
    </div>
  )
}

// ─── Root ────────────────────────────────────────────────────────────────────

export function NotesScreen() {
  const { notes, selectedNoteId, setNotes } = useNotesStore()
  const projectId = useProjectStore(s => s.projectId)

  useEffect(() => {
    if (!projectId) return
    getNotes().then(setNotes).catch(console.error)
  }, [projectId, setNotes])

  const selectedNote = notes.find(n => n.id === selectedNoteId) ?? null

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--color-main)' }}>
      <NotesListPanel />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {selectedNote
          ? <NoteEditorShell key={selectedNote.id} note={selectedNote} />
          : <NotesEmptyState />}
      </div>
    </div>
  )
}
