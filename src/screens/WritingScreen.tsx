import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import { baseExtensions, baseEditorProps } from '../lib/editor/editorConfig'
import { useAutosave } from '../hooks/useAutosave'
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  type DragCancelEvent, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useWritingStore } from '../store/writingStore'
import { useProjectStore } from '../store/projectStore'
import { useAIStore } from '../store/aiStore'
import { useUIStore } from '../store/uiStore'
import { getBooks, createBook } from '../lib/db/books'
import { getChapters, createChapter, updateChapterTitle, archiveChapter, reorderChapters } from '../lib/db/chapters'
import { getScenes, createScene, updateScene, archiveScene, reorderScenes } from '../lib/db/scenes'
import { NoAIKeyTooltip } from '../components/ai/NoAIKeyTooltip'
import { AIButton } from '../components/ui/AIButton'
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

// ─── Scene Editor Shell ───────────────────────────────────────────────────────

// ─── Editor Toolbar ───────────────────────────────────────────────────────────

function ToolbarBtn({
  onActivate,
  active = false,
  title,
  children,
}: {
  onActivate: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onActivate() }}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 4, border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 13,
        background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
        color: active ? 'var(--color-gold)' : 'var(--text-dim)',
        transition: 'background 100ms, color 100ms',
      }}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div style={{ width: 1, height: 16, background: 'var(--border-medium)', margin: '0 3px', flexShrink: 0 }} />
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0,
      padding: '4px 48px', borderBottom: '1px solid var(--border-subtle)',
    }}>
      {/* Block type */}
      <ToolbarBtn onActivate={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="Paragraph">
        <span style={{ fontSize: 12 }}>¶</span>
      </ToolbarBtn>
      <ToolbarBtn onActivate={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
        <span style={{ fontWeight: 700, fontSize: 11 }}>H1</span>
      </ToolbarBtn>
      <ToolbarBtn onActivate={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
        <span style={{ fontWeight: 700, fontSize: 11 }}>H2</span>
      </ToolbarBtn>
      <ToolbarBtn onActivate={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
        <span style={{ fontWeight: 700, fontSize: 11 }}>H3</span>
      </ToolbarBtn>

      <ToolbarDivider />

      {/* Inline formatting */}
      <ToolbarBtn onActivate={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (⌘B)">
        <span style={{ fontWeight: 700 }}>B</span>
      </ToolbarBtn>
      <ToolbarBtn onActivate={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (⌘I)">
        <span style={{ fontStyle: 'italic' }}>I</span>
      </ToolbarBtn>
      <ToolbarBtn onActivate={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (⌘U)">
        <span style={{ textDecoration: 'underline' }}>U</span>
      </ToolbarBtn>
      <ToolbarBtn onActivate={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
        <span style={{ textDecoration: 'line-through' }}>S</span>
      </ToolbarBtn>

      <ToolbarDivider />

      {/* Block formatting */}
      <ToolbarBtn onActivate={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
        <span style={{ fontSize: 14, lineHeight: 1 }}>❝</span>
      </ToolbarBtn>
      <ToolbarBtn onActivate={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
        <span style={{ fontSize: 12 }}>•≡</span>
      </ToolbarBtn>
      <ToolbarBtn onActivate={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
        <span style={{ fontSize: 11 }}>1.</span>
      </ToolbarBtn>

      <ToolbarDivider />

      {/* Highlight */}
      <ToolbarBtn onActivate={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight">
        <span style={{ fontSize: 13 }}>◈</span>
      </ToolbarBtn>
    </div>
  )
}

// ─── Scene Editor Shell ───────────────────────────────────────────────────────

function SceneEditorShell({ scene }: { scene: Scene }) {
  const { updateSceneInStore } = useWritingStore()
  const [title, setTitle] = useState(scene.title)
  const [wordCount, setWordCount] = useState(scene.word_count)
  const [content, setContent] = useState(scene.content ?? '')
  const wordCountRef = useRef(scene.word_count)
  // Tracks latest content so we can flush on unmount before debounce fires
  const pendingRef = useRef<string | null>(null)

  useEffect(() => { setTitle(scene.title) }, [scene.id])

  // Flush any pending unsaved content when this scene instance unmounts
  useEffect(() => {
    const id = scene.id
    return () => {
      const pending = pendingRef.current
      if (pending !== null) {
        updateScene(id, { content: pending, word_count: wordCountRef.current })
          .then(() => updateSceneInStore(id, { content: pending, word_count: wordCountRef.current }))
          .catch(console.error)
        pendingRef.current = null
      }
    }
  }, [])

  const saveStatus = useAutosave(content, useCallback(async (c: string) => {
    await updateScene(scene.id, { content: c, word_count: wordCountRef.current })
    // Keep store in sync so switching back loads the correct content
    updateSceneInStore(scene.id, { content: c, word_count: wordCountRef.current })
    pendingRef.current = null
  }, [scene.id]))

  const editor = useEditor({
    extensions: [
      ...baseExtensions,
      Placeholder.configure({ placeholder: 'Begin your story…' }),
    ],
    editorProps: baseEditorProps,
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Scene title */}
      <div style={{ padding: '20px 48px 0', flexShrink: 0 }}>
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

      <EditorToolbar editor={editor} />

      {/* Editor */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <EditorContent editor={editor} style={{ minHeight: '100%' }} />
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 48px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Save failed' : ''}
        </span>
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

function AIPanel({ onClose }: { onClose: () => void }) {
  const connectedProviders = useAIStore(s => s.connectedProviders)
  const navigate = useUIStore(s => s.navigate)

  return (
    <aside style={{
      width: 280, flexShrink: 0,
      background: 'var(--color-panel)',
      borderLeft: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          AI Assistant
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px',
          }}
        >×</button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {connectedProviders.length === 0 ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              AI features need an API key
            </div>
            <button
              onClick={() => navigate('settings')}
              style={{
                background: 'rgba(201,168,76,0.1)', border: '1px solid var(--color-gold-border)',
                borderRadius: 6, color: 'var(--color-gold)', fontSize: 12,
                padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Set up in Settings →
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            AI chat coming in Phase 6a
          </div>
        )}
      </div>
    </aside>
  )
}

// ─── Top Bar ─────────────────────────────────────────────────────────────────

function WritingTopBar() {
  const isAIPanelOpen = useWritingStore(s => s.isAIPanelOpen)
  const toggleAIPanel = useWritingStore(s => s.toggleAIPanel)
  const connectedProviders = useAIStore(s => s.connectedProviders)

  return (
    <div style={{
      height: 44, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      padding: '0 12px', borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--color-main)',
    }}>
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
    isAIPanelOpen, isOutlinePanelOpen,
    setBooks, setChapters, setScenes,
    selectBook,
    addBook, toggleAIPanel, toggleOutlinePanel,
  } = useWritingStore()

  const projectId = useProjectStore(s => s.projectId)

  // Load books → auto-select first → load chapters
  useEffect(() => {
    if (!projectId) return
    getBooks(projectId)
      .then(async (loadedBooks) => {
        setBooks(loadedBooks)
        if (loadedBooks.length === 0) {
          const book = await createBook(projectId, 'Book 1')
          addBook(book)
          selectBook(book.id)
          return book.id
        }
        selectBook(loadedBooks[0].id)
        return loadedBooks[0].id
      })
      .then(bookId => getChapters(bookId))
      .then(setChapters)
      .catch(err => console.error('Failed to load writing data:', err))
  }, [projectId])

  // Load scenes whenever chapters change
  useEffect(() => {
    if (chapters.length === 0) { setScenes([]); return }
    const chapterIds = books.length > 0 && selectedBookId
      ? chapters.filter(c => c.book_id === selectedBookId).map(c => c.id)
      : chapters.map(c => c.id)
    if (chapterIds.length === 0) { setScenes([]); return }
    Promise.all(chapterIds.map(id => getScenes(id)))
      .then(results => setScenes(results.flat()))
      .catch(err => console.error('Failed to load scenes:', err))
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
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleOutlinePanel, toggleAIPanel])

  const selectedScene = scenes.find(s => s.id === selectedSceneId) ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <WritingTopBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {isOutlinePanelOpen && <OutlinePanel />}

        {/* Editor area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--color-main)' }}>
          {selectedScene
            ? <SceneEditorShell key={selectedScene.id} scene={selectedScene} />
            : <EditorEmptyState />
          }
        </div>

        {isAIPanelOpen && <AIPanel onClose={toggleAIPanel} />}
      </div>
    </div>
  )
}
