import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import { baseExtensions, baseEditorProps } from '../lib/editor/editorConfig'
import CodexMention from '../lib/editor/codexMention'
import { assembleWritingSystemPrompt, extractMentionedEntryIds } from '../lib/ai/contextAssembler'
import { getActiveProvider } from '../lib/ai/getActiveProvider'
import {
  resolveEditorBaseFontFamily,
} from '../lib/editor/curatedFonts'
import { useAutosave } from '../hooks/useAutosave'
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  type DragCancelEvent, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useWritingStore } from '../store/writingStore'
import { useProjectStore } from '../store/projectStore'
import { useAIStore } from '../store/aiStore'
import { useUIStore } from '../store/uiStore'
import { useSettingsStore } from '../store/settingsStore'
import { useCodexStore } from '../store/codexStore'
import { getBooks, createBook } from '../lib/db/books'
import { getChapters, createChapter, updateChapterTitle, archiveChapter, reorderChapters } from '../lib/db/chapters'
import { getScenes, createScene, updateScene, archiveScene, reorderScenes } from '../lib/db/scenes'
import { NoAIKeyTooltip } from '../components/ai/NoAIKeyTooltip'
import { AIButton } from '../components/ui/AIButton'
import { EditorToolbar, editorCanvasStyle, editorContentShellStyle } from '../components/writing/EditorToolbar'
import type { Chapter, Scene } from '../lib/db/types'

function ChapterDragPreview({
  title,
  sceneCount,
}: {
  title: string
  sceneCount: number
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '5px 10px',
        minWidth: 220,
        borderRadius: 4,
        border: '1px solid var(--color-gold-border)',
        background: 'var(--color-panel)',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.28)',
      }}
    >
      <span
        style={{
          cursor: 'grabbing',
          color: 'var(--text-muted)',
          fontSize: 10,
          userSelect: 'none',
        }}
      >
        ⠿
      </span>
      <span style={{ fontSize: 9, color: 'var(--text-muted)', width: 10, textAlign: 'center' }}>
        ▾
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          background: 'rgba(240,230,210,0.06)',
          borderRadius: 10,
          padding: '1px 5px',
          flexShrink: 0,
        }}
      >
        {sceneCount}
      </span>
    </div>
  )
}

function SceneDragPreview({
  title,
  wordCount,
}: {
  title: string
  wordCount: number
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px 4px 28px',
        minWidth: 220,
        borderRadius: 4,
        border: '1px solid var(--color-gold-border)',
        background: 'var(--color-panel)',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.28)',
      }}
    >
      <span
        style={{
          cursor: 'grabbing',
          color: 'var(--text-muted)',
          fontSize: 10,
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        ⠿
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 12,
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </span>
      {wordCount > 0 && (
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
          {wordCount.toLocaleString()}
        </span>
      )}
    </div>
  )
}

// ─── Sortable Chapter Row ─────────────────────────────────────────────────────

function SortableChapterRow({
  chapter,
  scenes,
  selectedChapterId,
  selectedSceneId,
  onSelectChapter,
  onSelectScene,
  onAddScene,
  onArchiveChapter,
  onArchiveScene,
  onRenameChapter,
}: {
  chapter: Chapter
  scenes: Scene[]
  selectedChapterId: number | null
  selectedSceneId: number | null
  onSelectChapter: (id: number) => void
  onSelectScene: (id: number | null) => void
  onAddScene: (chapterId: number) => void
  onArchiveChapter: (id: number) => void
  onArchiveScene: (id: number) => void
  onRenameChapter: (id: number, title: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `ch-${chapter.id}` })

  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(chapter.title)
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const chapterScenes = scenes
    .filter(s => s.chapter_id === chapter.id)
    .sort((a, b) => a.sort_order - b.sort_order)

  function commitRename() {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== chapter.title) onRenameChapter(chapter.id, trimmed)
    else setEditTitle(chapter.title)
    setEditing(false)
  }

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
      }}
    >
      {/* Chapter row */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '5px 10px', cursor: 'pointer',
          background: selectedChapterId === chapter.id && !selectedSceneId
            ? 'rgba(201,168,76,0.08)' : 'transparent',
          borderRadius: 4,
        }}
        onClick={() => { onSelectChapter(chapter.id); setExpanded(e => !e) }}
      >
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          style={{
            cursor: 'grab', color: 'var(--text-muted)', fontSize: 10,
            opacity: hovered ? 1 : 0, transition: 'opacity 150ms', userSelect: 'none',
          }}
        >⠿</span>

        {/* Expand toggle */}
        <span style={{
          fontSize: 9, color: 'var(--text-muted)', width: 10, textAlign: 'center',
          transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 150ms',
        }}>▾</span>

        {/* Title */}
        {editing ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditTitle(chapter.title); setEditing(false) } }}
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              borderBottom: '1px solid var(--color-gold)', outline: 'none',
              color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', padding: '1px 0',
            }}
          />
        ) : (
          <span
            onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
            style={{
              flex: 1, fontSize: 13, fontWeight: 500,
              color: selectedChapterId === chapter.id ? 'var(--text-primary)' : 'var(--text-dim)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {chapter.title}
          </span>
        )}

        {/* Scene count badge */}
        {!editing && (
          <span style={{
            fontSize: 10, color: 'var(--text-muted)',
            background: 'rgba(240,230,210,0.06)', borderRadius: 10,
            padding: '1px 5px', flexShrink: 0,
          }}>
            {chapterScenes.length}
          </span>
        )}

        {/* Hover actions */}
        {hovered && !editing && (
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onAddScene(chapter.id)}
              title="Add scene"
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: 13, padding: '0 3px', lineHeight: 1,
              }}
            >+</button>
            <button
              onClick={() => onArchiveChapter(chapter.id)}
              title="Archive chapter"
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: 11, padding: '0 3px', lineHeight: 1,
              }}
            >⊖</button>
          </div>
        )}
      </div>

      {expanded && (
        <SortableContext
          items={chapterScenes.map(scene => `sc-${scene.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {chapterScenes.map(scene => (
            <SortableSceneRow
              key={scene.id}
              scene={scene}
              isSelected={selectedSceneId === scene.id}
              onSelect={onSelectScene}
              onArchive={onArchiveScene}
            />
          ))}
        </SortableContext>
      )}
    </div>
  )
}

// ─── Sortable Scene Row ────────────────────────────────────────────────────────

function SortableSceneRow({
  scene,
  isSelected,
  onSelect,
  onArchive,
}: {
  scene: Scene
  isSelected: boolean
  onSelect: (id: number | null) => void
  onArchive: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `sc-${scene.id}` })
  const [hovered, setHovered] = useState(false)

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(scene.id)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? 'transform 150ms, opacity 100ms',
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 10px 4px 28px',
        cursor: 'pointer',
        opacity: isDragging ? 0 : 1,
        background: isSelected ? 'rgba(201,168,76,0.07)' : 'transparent',
        borderLeft: isSelected ? '2px solid var(--color-gold)' : '2px solid transparent',
        borderRadius: 4,
      }}
    >
      <span
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        style={{
          cursor: 'grab',
          color: 'var(--text-muted)',
          fontSize: 10,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 150ms',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        ⠿
      </span>
      <span style={{
        flex: 1, fontSize: 12,
        color: isSelected ? 'var(--text-primary)' : 'var(--text-dim)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {scene.title}
      </span>

      {scene.word_count > 0 && !hovered && (
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
          {scene.word_count.toLocaleString()}
        </span>
      )}

      {hovered && (
        <button
          onClick={e => { e.stopPropagation(); onArchive(scene.id) }}
          title="Archive scene"
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 11, padding: '0 3px', lineHeight: 1, flexShrink: 0,
          }}
        >⊖</button>
      )}
    </div>
  )
}

// ─── Outline Panel ────────────────────────────────────────────────────────────

function OutlinePanel() {
  const {
    books, chapters, scenes, selectedBookId, selectedChapterId, selectedSceneId,
    selectBook, selectChapter, selectScene,
    addChapter, addScene, updateChapterInStore, archiveChapterInStore, archiveSceneInStore,
    reorderChaptersInStore, reorderScenesInStore,
  } = useWritingStore()

  const projectTitle = useProjectStore(s => s.projectTitle)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null)
  const [activeSceneId, setActiveSceneId] = useState<number | null>(null)

  const selectedBook = books.find(b => b.id === selectedBookId) ?? null
  const bookChapters = chapters.filter(c => !selectedBookId || c.book_id === selectedBookId)
  const activeChapter = activeChapterId === null
    ? null
    : bookChapters.find(chapter => chapter.id === activeChapterId) ?? null
  const activeScene = activeSceneId === null
    ? null
    : scenes.find(scene => scene.id === activeSceneId) ?? null

  async function handleAddChapter() {
    if (!selectedBookId) return
    try {
      const chapter = await createChapter(selectedBookId, 'New Chapter')
      addChapter(chapter)
      selectChapter(chapter.id)
    } catch (err) { console.error('Failed to create chapter:', err) }
  }

  async function handleAddScene(chapterId: number) {
    try {
      const scene = await createScene(chapterId, 'New Scene')
      addScene(scene)
      selectScene(scene.id)
    } catch (err) { console.error('Failed to create scene:', err) }
  }

  async function handleArchiveChapter(id: number) {
    if (!window.confirm('Archive this chapter and all its scenes?')) return
    try {
      await archiveChapter(id)
      archiveChapterInStore(id)
    } catch (err) { console.error('Failed to archive chapter:', err) }
  }

  async function handleArchiveScene(id: number) {
    if (!window.confirm('Archive this scene?')) return
    try {
      await archiveScene(id)
      archiveSceneInStore(id)
    } catch (err) { console.error('Failed to archive scene:', err) }
  }

  async function handleReorderScenes(_chapterId: number, ids: number[]) {
    reorderScenesInStore(ids)
    reorderScenes(ids).catch(err => console.error('Failed to reorder scenes:', err))
  }

  async function handleRenameChapter(id: number, title: string) {
    try {
      await updateChapterTitle(id, title)
      updateChapterInStore(id, { title })
    } catch (err) { console.error('Failed to rename chapter:', err) }
  }

  function handleDragStart(event: DragStartEvent) {
    const activeStr = event.active.id as string

    if (activeStr.startsWith('ch-')) {
      setActiveChapterId(Number(activeStr.slice(3)))
      setActiveSceneId(null)
      return
    }

    if (activeStr.startsWith('sc-')) {
      setActiveSceneId(Number(activeStr.slice(3)))
      setActiveChapterId(null)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveChapterId(null)
    setActiveSceneId(null)
    if (!over || active.id === over.id) return
    const activeStr = active.id as string
    const overStr = over.id as string

    if (activeStr.startsWith('ch-') && overStr.startsWith('ch-')) {
      const aid = Number(activeStr.slice(3))
      const oid = Number(overStr.slice(3))
      const oldIdx = bookChapters.findIndex(c => c.id === aid)
      const newIdx = bookChapters.findIndex(c => c.id === oid)
      if (oldIdx === -1 || newIdx === -1) return
      const reordered = arrayMove(bookChapters, oldIdx, newIdx)
      const ids = reordered.map(c => c.id)
      reorderChaptersInStore(ids)
      reorderChapters(ids).catch(err => console.error('Failed to reorder chapters:', err))
      return
    }

    if (activeStr.startsWith('sc-') && overStr.startsWith('sc-')) {
      const activeSceneId = Number(activeStr.slice(3))
      const overSceneId = Number(overStr.slice(3))
      const activeScene = scenes.find(scene => scene.id === activeSceneId)
      const overScene = scenes.find(scene => scene.id === overSceneId)

      if (!activeScene || !overScene || activeScene.chapter_id !== overScene.chapter_id) return

      const chapterScenes = scenes
        .filter(scene => scene.chapter_id === activeScene.chapter_id)
        .sort((a, b) => a.sort_order - b.sort_order)

      const oldIdx = chapterScenes.findIndex(scene => scene.id === activeSceneId)
      const newIdx = chapterScenes.findIndex(scene => scene.id === overSceneId)
      if (oldIdx === -1 || newIdx === -1) return

      const reordered = arrayMove(chapterScenes, oldIdx, newIdx)
      handleReorderScenes(activeScene.chapter_id, reordered.map(scene => scene.id))
    }
  }

  function handleDragCancel(_event: DragCancelEvent) {
    setActiveChapterId(null)
    setActiveSceneId(null)
  }

  return (
    <aside style={{
      width: 240, flexShrink: 0,
      background: 'var(--color-panel)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px 8px',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 11, color: 'var(--text-muted)', fontWeight: 500,
          textTransform: 'uppercase', letterSpacing: '0.07em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: 8,
        }}>
          {projectTitle ?? 'Untitled Project'}
        </div>

        {/* Book selector */}
        {books.length > 1 && (
          <select
            value={selectedBookId ?? ''}
            onChange={e => selectBook(Number(e.target.value))}
            style={{
              width: '100%', background: 'rgba(240,230,210,0.06)',
              border: '1px solid var(--border-subtle)', borderRadius: 4,
              color: 'var(--text-primary)', fontSize: 12, padding: '4px 8px',
              fontFamily: 'inherit', marginBottom: 8, cursor: 'pointer',
            }}
          >
            {books.map(b => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
        )}

        {books.length === 1 && (
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            {selectedBook?.title ?? books[0]?.title}
          </div>
        )}

        <button
          onClick={handleAddChapter}
          disabled={!selectedBookId}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'transparent', border: '1px dashed var(--border-medium)',
            borderRadius: 4, color: 'var(--text-muted)', fontSize: 11,
            padding: '4px 8px', cursor: selectedBookId ? 'pointer' : 'default',
            width: '100%', fontFamily: 'inherit',
            opacity: selectedBookId ? 1 : 0.5,
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> New Chapter
        </button>
      </div>

      {/* Chapter/scene tree */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
        {bookChapters.length === 0 ? (
          <div style={{
            fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
            padding: '24px 16px',
          }}>
            No chapters yet.<br />Click + New Chapter to start.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={bookChapters.map(c => `ch-${c.id}`)} strategy={verticalListSortingStrategy}>
              {bookChapters.map(chapter => (
                <SortableChapterRow
                  key={chapter.id}
                  chapter={chapter}
                  scenes={scenes}
                  selectedChapterId={selectedChapterId}
                  selectedSceneId={selectedSceneId}
                  onSelectChapter={id => { selectChapter(id); selectScene(null as unknown as number) }}
                  onSelectScene={selectScene}
                  onAddScene={handleAddScene}
                  onArchiveChapter={handleArchiveChapter}
                  onArchiveScene={handleArchiveScene}
                  onRenameChapter={handleRenameChapter}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeChapter ? (
                <ChapterDragPreview
                  title={activeChapter.title}
                  sceneCount={scenes.filter(scene => scene.chapter_id === activeChapter.id).length}
                />
              ) : activeScene ? (
                <SceneDragPreview
                  title={activeScene.title}
                  wordCount={activeScene.word_count}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </aside>
  )
}


const SCENE_AUTOSAVE_DELAY_MS = 250


// ─── Scene Editor Shell ───────────────────────────────────────────────────────

function SceneEditorShell({ scene, editorRef }: { scene: Scene; editorRef: React.MutableRefObject<import('@tiptap/react').Editor | null> }) {
  const { updateSceneInStore } = useWritingStore()
  const { editorFontFamily, editorFontSize } = useSettingsStore()
  const [title, setTitle] = useState(scene.title)
  const [wordCount, setWordCount] = useState(scene.word_count)
  const [content, setContent] = useState(scene.content ?? '')
  const wordCountRef = useRef(scene.word_count)
  // Tracks latest content so we can flush on unmount before debounce fires
  const pendingRef = useRef<string | null>(null)

  useEffect(() => { setTitle(scene.title) }, [scene.id])

  const { status: saveStatus, flush } = useAutosave(content, useCallback(async (c: string) => {
    await updateScene(scene.id, { content: c, word_count: wordCountRef.current })
    // Keep store in sync so switching back loads the correct content
    updateSceneInStore(scene.id, { content: c, word_count: wordCountRef.current })
    pendingRef.current = null
  }, [scene.id]), SCENE_AUTOSAVE_DELAY_MS)

  // Flush any pending unsaved content when this scene instance unmounts
  useEffect(() => {
    return () => {
      void flush().catch(console.error)
    }
  }, [flush])

  const editor = useEditor({
    extensions: [
      ...baseExtensions,
      CodexMention,
      Placeholder.configure({ placeholder: 'Begin your story…' }),
    ],
    editorProps: {
      ...baseEditorProps,
      handleClick(_view, _pos, event) {
        const target = event.target instanceof HTMLElement
          ? event.target.closest('a[href]')
          : null

        if (!(target instanceof HTMLAnchorElement)) return false

        event.preventDefault()
        void openUrl(target.href).catch(err => console.error('Failed to open link:', err))
        return true
      },
    },
    content: (() => {
      try { return scene.content ? JSON.parse(scene.content) : '' }
      catch { return '' }
    })(),
    onUpdate({ editor }) {
      const words = editor.storage.characterCount.words()
      wordCountRef.current = words
      setWordCount(words)
      const json = JSON.stringify(editor.getJSON())
      pendingRef.current = json
      setContent(json)
    },
  }, [scene.id])

  useEffect(() => {
    editorRef.current = editor
    return () => { editorRef.current = null }
  }, [editor])

  async function handleTitleBlur() {
    const trimmed = title.trim()
    if (!trimmed) { setTitle(scene.title); return }
    if (trimmed === scene.title) return
    try {
      await updateScene(scene.id, { title: trimmed })
      updateSceneInStore(scene.id, { title: trimmed })
    } catch (err) { console.error('Failed to update scene title:', err) }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        ...editorCanvasStyle,
        ['--editor-content-max-width' as string]: '1180px',
        ['--editor-canvas-max-width' as string]: '1440px',
      }}
    >
      {/* Scene title */}
      <div style={{ padding: '20px 48px 0', flexShrink: 0 }}>
        <div style={editorContentShellStyle}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            placeholder="Scene title…"
            style={{
              width: '100%', background: 'transparent', border: 'none',
              borderBottom: '1px solid transparent', outline: 'none',
              color: 'var(--text-primary)', fontSize: 22, fontWeight: 600,
              fontFamily: 'inherit', padding: '4px 0',
              transition: 'border-color 150ms',
            }}
            onFocus={e => { e.currentTarget.style.borderBottomColor = 'var(--color-gold)' }}
            onBlurCapture={e => { e.currentTarget.style.borderBottomColor = 'transparent' }}
          />
        </div>
      </div>

      <EditorToolbar editor={editor} />

      {/* Editor */}
      <div style={{
        flex: 1, overflowY: 'auto',
        fontFamily: resolveEditorBaseFontFamily(editorFontFamily) ?? 'inherit',
        fontSize: editorFontSize,
      }}>
        <EditorContent editor={editor} style={{ minHeight: '100%' }} />
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 48px',
        borderTop: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{ ...editorContentShellStyle, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Save failed' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EditorEmptyState() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-muted)', gap: 8,
    }}>
      <div style={{ fontSize: 13 }}>Select a scene to start writing</div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>or create a new chapter in the outline panel</div>
    </div>
  )
}

// ─── AI Panel ────────────────────────────────────────────────────────────────

type SuggestionMode = 'continue' | 'rephrase'
type PanelState = 'idle' | 'loading' | 'result' | 'error'

function AIPanel({ onClose, editorRef }: {
  onClose: () => void
  editorRef: React.MutableRefObject<import('@tiptap/react').Editor | null>
}) {
  const connectedProviders = useAIStore(s => s.connectedProviders)
  const navigate = useUIStore(s => s.navigate)
  const { scenes, selectedSceneId } = useWritingStore()
  const codexEntries = useCodexStore(s => s.entries)

  const [panelState, setPanelState] = useState<PanelState>('idle')
  const [suggestionText, setSuggestionText] = useState('')
  const [activeMode, setActiveMode] = useState<SuggestionMode | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [selectionHint, setSelectionHint] = useState(false)
  const lastActionRef = useRef<(() => Promise<void>) | null>(null)
  const rephraseRangeRef = useRef<{ from: number; to: number } | null>(null)

  const selectedScene = scenes.find(s => s.id === selectedSceneId) ?? null

  const mentionedEntries = selectedScene?.content
    ? extractMentionedEntryIds(selectedScene.content)
        .map(id => codexEntries.find(e => e.id === id))
        .filter(Boolean)
    : []

  async function runContinue() {
    if (!selectedScene) return
    setPanelState('loading')
    setSelectionHint(false)
    try {
      const systemPrompt = await assembleWritingSystemPrompt(selectedScene)
      const active = await getActiveProvider()
      if (!active) throw new Error('No provider available')
      const result = await active.provider.sendMessage(
        [{ role: 'user', content: 'Continue the scene from where it ends. Write one paragraph that flows naturally from the current text. Match the author\'s style and voice. Output only the paragraph text, no meta-commentary or labels.' }],
        active.model,
        systemPrompt,
      )
      setSuggestionText(result.trim())
      setActiveMode('continue')
      setPanelState('result')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setPanelState('error')
    }
  }

  async function runRephrase() {
    const editor = editorRef.current
    if (!editor) return
    const { from, to, empty } = editor.state.selection
    if (empty) { setSelectionHint(true); return }
    setSelectionHint(false)
    const selectedText = editor.state.doc.textBetween(from, to, ' ')
    if (!selectedText.trim()) return
    if (!selectedScene) return
    rephraseRangeRef.current = { from, to }
    setPanelState('loading')
    try {
      const systemPrompt = await assembleWritingSystemPrompt(selectedScene)
      const active = await getActiveProvider()
      if (!active) throw new Error('No provider available')
      const result = await active.provider.sendMessage(
        [{ role: 'user', content: `Rephrase the following text while keeping the same meaning and matching the surrounding style. Output only the rephrased text, no meta-commentary:\n\n${selectedText}` }],
        active.model,
        systemPrompt,
      )
      setSuggestionText(result.trim())
      setActiveMode('rephrase')
      setPanelState('result')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setPanelState('error')
    }
  }

  function handleApply() {
    const editor = editorRef.current
    if (!editor || !suggestionText) return
    if (activeMode === 'continue') {
      const end = editor.state.doc.content.size
      editor.chain().focus().insertContentAt(end - 1, [
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: suggestionText }] },
      ]).run()
    } else {
      const range = rephraseRangeRef.current
      if (range) {
        editor.chain().focus().deleteRange(range).insertContentAt(range.from, suggestionText).run()
      } else {
        editor.chain().focus().insertContent(suggestionText).run()
      }
      rephraseRangeRef.current = null
    }
    setPanelState('idle')
    setSuggestionText('')
    setActiveMode(null)
  }

  function handleDiscard() {
    setPanelState('idle')
    setSuggestionText('')
    setActiveMode(null)
    setErrorMsg('')
  }

  const btnBase: React.CSSProperties = {
    border: '1px solid var(--border-subtle)', borderRadius: 6,
    padding: '6px 10px', fontSize: 12, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'background 120ms',
  }

  return (
    <aside style={{
      width: 280, flexShrink: 0,
      background: 'var(--color-panel)',
      borderLeft: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>AI Assistant</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}>×</button>
      </div>

      {connectedProviders.length === 0 ? (
        /* No key state */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>AI features need an API key</div>
          <button onClick={() => navigate('settings')} style={{ ...btnBase, background: 'rgba(201,168,76,0.1)', borderColor: 'var(--color-gold-border)', color: 'var(--color-gold)' }}>
            Set up in Settings →
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Action buttons */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: mentionedEntries.length > 0 ? 10 : 0 }}>
              <button
                onClick={() => { lastActionRef.current = runContinue; void runContinue() }}
                disabled={panelState === 'loading' || !selectedScene}
                style={{ ...btnBase, flex: 1, background: 'rgba(201,168,76,0.08)', color: 'var(--color-gold)', borderColor: 'var(--color-gold-border)', opacity: (!selectedScene || panelState === 'loading') ? 0.5 : 1 }}
              >
                Continue writing
              </button>
              <button
                onClick={() => { lastActionRef.current = runRephrase; void runRephrase() }}
                disabled={panelState === 'loading' || !selectedScene}
                style={{ ...btnBase, flex: 1, background: 'transparent', color: 'var(--text-dim)', opacity: (!selectedScene || panelState === 'loading') ? 0.5 : 1 }}
              >
                Rephrase
              </button>
            </div>
            {selectionHint && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Select text in the editor first
              </div>
            )}
            {/* Context chips */}
            {mentionedEntries.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center', marginRight: 2 }}>Context:</span>
                {mentionedEntries.map(entry => entry && (
                  <span
                    key={entry.id}
                    className={`codex-mention codex-mention--${entry.category}`}
                    style={{ fontSize: '0.78em' }}
                  >
                    @{entry.title}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Result / loading / error area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
            {panelState === 'idle' && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 32 }}>
                {selectedScene ? 'Select an action above' : 'Open a scene to use AI suggestions'}
              </div>
            )}

            {panelState === 'loading' && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 32 }}>
                Generating…
              </div>
            )}

            {panelState === 'result' && (
              <div style={{
                background: 'rgba(240,230,210,0.04)', border: '1px solid var(--border-subtle)',
                borderRadius: 6, padding: '10px 12px',
                fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {suggestionText}
              </div>
            )}

            {panelState === 'error' && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--color-error)', marginBottom: 10 }}>{errorMsg}</div>
                <button
                  onClick={() => lastActionRef.current && void lastActionRef.current()}
                  style={{ ...btnBase, background: 'transparent', color: 'var(--text-dim)', width: '100%' }}
                >
                  Try again
                </button>
              </div>
            )}
          </div>

          {/* Apply / Discard */}
          {panelState === 'result' && (
            <div style={{
              display: 'flex', gap: 6, padding: '10px 14px',
              borderTop: '1px solid var(--border-subtle)', flexShrink: 0,
            }}>
              <button onClick={handleDiscard} style={{ ...btnBase, flex: 1, background: 'transparent', color: 'var(--text-muted)' }}>
                Discard
              </button>
              <button onClick={handleApply} style={{ ...btnBase, flex: 1, background: 'rgba(201,168,76,0.12)', color: 'var(--color-gold)', borderColor: 'var(--color-gold-border)' }}>
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

// ─── Scene Meta Panel ─────────────────────────────────────────────────────────

function SceneMetaPanel({ scene, onClose }: { scene: Scene; onClose: () => void }) {
  const { updateSceneInStore } = useWritingStore()
  const codexEntries = useCodexStore(s => s.entries)
  const characters = codexEntries.filter(e => e.category === 'characters')

  const [summary, setSummary] = useState(scene.summary ?? '')
  const [tagInput, setTagInput] = useState(scene.tags ?? '')

  useEffect(() => {
    setSummary(scene.summary ?? '')
    setTagInput(scene.tags ?? '')
  }, [scene.id])

  async function savePov(povCharId: number | null) {
    try {
      await updateScene(scene.id, { pov_char_id: povCharId })
      updateSceneInStore(scene.id, { pov_char_id: povCharId })
    } catch (err) { console.error('Failed to save POV:', err) }
  }

  async function saveSummary() {
    const trimmed = summary.trim()
    const value = trimmed || null
    try {
      await updateScene(scene.id, { summary: value })
      updateSceneInStore(scene.id, { summary: value })
    } catch (err) { console.error('Failed to save summary:', err) }
  }

  async function saveTags() {
    const trimmed = tagInput.trim()
    const value = trimmed || null
    try {
      await updateScene(scene.id, { tags: value })
      updateSceneInStore(scene.id, { tags: value })
    } catch (err) { console.error('Failed to save tags:', err) }
  }

  const tagList = tagInput.split(',').map(t => t.trim()).filter(Boolean)

  const fieldLabel: React.CSSProperties = {
    fontSize: 11, color: 'var(--text-muted)', fontWeight: 500,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    display: 'block', marginBottom: 6,
  }

  const fieldInput: React.CSSProperties = {
    width: '100%', background: 'rgba(240,230,210,0.05)',
    border: '1px solid var(--border-subtle)', borderRadius: 5,
    color: 'var(--text-primary)', fontSize: 12,
    fontFamily: 'inherit', padding: '6px 8px',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <aside style={{
      width: 240, flexShrink: 0,
      background: 'var(--color-panel)',
      borderLeft: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Scene Info</span>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}
        >×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* POV Character */}
        <div>
          <label style={fieldLabel}>POV Character</label>
          <select
            value={scene.pov_char_id ?? ''}
            onChange={e => void savePov(e.target.value ? Number(e.target.value) : null)}
            style={{ ...fieldInput, cursor: 'pointer', appearance: 'auto' }}
          >
            <option value="">— None —</option>
            {characters.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          {characters.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Add characters in the Codex first
            </div>
          )}
        </div>

        {/* Scene Summary */}
        <div>
          <label style={fieldLabel}>Summary</label>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            onBlur={() => void saveSummary()}
            placeholder="Brief description of this scene…"
            rows={4}
            style={{ ...fieldInput, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        {/* Tags */}
        <div>
          <label style={fieldLabel}>Tags</label>
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onBlur={() => void saveTags()}
            placeholder="action, tension, mystery"
            style={fieldInput}
          />
          {tagList.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {tagList.map(tag => (
                <span
                  key={tag}
                  style={{
                    fontSize: 10, fontWeight: 500,
                    padding: '2px 7px', borderRadius: 10,
                    background: 'rgba(201,168,76,0.10)',
                    border: '1px solid rgba(201,168,76,0.20)',
                    color: 'var(--color-gold)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

// ─── Top Bar ─────────────────────────────────────────────────────────────────

function WritingTopBar() {
  const isAIPanelOpen = useWritingStore(s => s.isAIPanelOpen)
  const toggleAIPanel = useWritingStore(s => s.toggleAIPanel)
  const isFocusMode = useWritingStore(s => s.isFocusMode)
  const toggleFocusMode = useWritingStore(s => s.toggleFocusMode)
  const isMetaPanelOpen = useWritingStore(s => s.isMetaPanelOpen)
  const toggleMetaPanel = useWritingStore(s => s.toggleMetaPanel)
  const connectedProviders = useAIStore(s => s.connectedProviders)

  return (
    <div style={{
      height: 44, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      padding: '0 12px', borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--color-main)',
    }}>
      <button
        onClick={toggleMetaPanel}
        title="Scene info"
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: isMetaPanelOpen ? 'var(--color-gold)' : 'var(--text-muted)',
          fontSize: 13, lineHeight: 1, padding: '4px 6px', marginRight: 2,
        }}
      >
        ◎
      </button>
      <button
        onClick={toggleFocusMode}
        title="Focus mode (⌘⇧F)"
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: isFocusMode ? 'var(--color-gold)' : 'var(--text-muted)',
          fontSize: 14, lineHeight: 1, padding: '4px 6px', marginRight: 4,
        }}
      >
        ▣
      </button>
      <NoAIKeyTooltip>
        <AIButton
          onClick={toggleAIPanel}
          isOpen={isAIPanelOpen}
          disabled={connectedProviders.length === 0}
        />
      </NoAIKeyTooltip>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function WritingScreen() {
  const {
    books, chapters, scenes,
    selectedBookId, selectedSceneId,
    isAIPanelOpen, isOutlinePanelOpen, isFocusMode, isMetaPanelOpen,
    setBooks, setChapters, setScenes,
    selectBook,
    addBook, toggleAIPanel, toggleOutlinePanel, toggleFocusMode, toggleMetaPanel,
  } = useWritingStore()

  const projectId = useProjectStore(s => s.projectId)

  // Load books → auto-select first
  useEffect(() => {
    if (!projectId) return
    getBooks(projectId)
      .then(async (loadedBooks) => {
        setBooks(loadedBooks)
        if (loadedBooks.length === 0) {
          const book = await createBook(projectId, 'Book 1')
          addBook(book)
          selectBook(book.id)
        } else {
          selectBook(loadedBooks[0].id)
        }
      })
      .catch(err => console.error('Failed to load writing data:', err))
  }, [projectId])

  // Reload chapters whenever the selected book changes
  useEffect(() => {
    if (!selectedBookId) return
    let cancelled = false
    getChapters(selectedBookId)
      .then(chs => { if (!cancelled) setChapters(chs) })
      .catch(err => { if (!cancelled) console.error('Failed to load chapters:', err) })
    return () => { cancelled = true }
  }, [selectedBookId])

  // Load scenes whenever chapters change
  useEffect(() => {
    if (chapters.length === 0) { setScenes([]); return }
    const chapterIds = books.length > 0 && selectedBookId
      ? chapters.filter(c => c.book_id === selectedBookId).map(c => c.id)
      : chapters.map(c => c.id)
    if (chapterIds.length === 0) { setScenes([]); return }
    let cancelled = false
    Promise.all(chapterIds.map(id => getScenes(id)))
      .then(results => { if (!cancelled) setScenes(results.flat()) })
      .catch(err => { if (!cancelled) console.error('Failed to load scenes:', err) })
    return () => { cancelled = true }
  }, [chapters, selectedBookId])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.code === 'Backslash') {
        e.preventDefault(); toggleOutlinePanel()
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyA') {
        e.preventDefault(); toggleAIPanel()
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyF') {
        e.preventDefault(); toggleFocusMode()
      }
      if (e.key === 'Escape' && isFocusMode) {
        toggleFocusMode()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleOutlinePanel, toggleAIPanel, toggleFocusMode, isFocusMode])

  const selectedScene = scenes.find(s => s.id === selectedSceneId) ?? null
  const editorRef = useRef<import('@tiptap/react').Editor | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!isFocusMode && <WritingTopBar />}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {isOutlinePanelOpen && !isFocusMode && <OutlinePanel />}

        {/* Editor area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--color-main)', position: 'relative' }}>
          {selectedScene
            ? <SceneEditorShell key={selectedScene.id} scene={selectedScene} editorRef={editorRef} />
            : <EditorEmptyState />
          }

          {isFocusMode && (
            <>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 80,
                background: 'linear-gradient(to bottom, var(--color-main), transparent)',
                pointerEvents: 'none', zIndex: 10,
              }} />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
                background: 'linear-gradient(to top, var(--color-main), transparent)',
                pointerEvents: 'none', zIndex: 10,
              }} />
              <button
                onClick={toggleFocusMode}
                title="Exit focus mode (Esc)"
                style={{
                  position: 'absolute', top: 12, right: 12, zIndex: 20,
                  background: 'rgba(240,230,210,0.08)', border: '1px solid var(--border-subtle)',
                  borderRadius: 6, color: 'var(--text-muted)', fontSize: 11,
                  padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit',
                  opacity: 0.6, transition: 'opacity 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.6' }}
              >
                Exit Focus
              </button>
            </>
          )}
        </div>

        {isAIPanelOpen && !isFocusMode && <AIPanel onClose={toggleAIPanel} editorRef={editorRef} />}
        {isMetaPanelOpen && !isFocusMode && selectedScene && (
          <SceneMetaPanel scene={selectedScene} onClose={toggleMetaPanel} />
        )}
      </div>
    </div>
  )
}
