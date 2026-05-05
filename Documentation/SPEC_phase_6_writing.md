# Phase 6 — Writing Screen Layout + Outline Panel

## Goal

Build the Writing screen's layout and outline panel (chapters + scenes). The TipTap editor itself is built separately in Phase 6a–6h. This phase delivers the shell: the sidebar, the chapter/scene hierarchy, and the empty content area where the editor will drop in.

## Reference Mockup

`Mockups/tome_of_creation_full_desktop_mockup.html`

## Screen Layout

```
Rail (52px) | Outline Panel (240px) | Editor Area (flex 1) | [AI Panel (248px) — slides in]
```

## Outline Panel (Left)

### Header
- Project/book title (dimmed, small)
- Book selector `DropdownMenu` (if multi-book project)
- "New Chapter" button (+ icon)

### Chapter + Scene Tree

Expandable chapter rows:
- Chapter title (editable inline on double-click)
- Scene count badge
- Expand/collapse toggle
- Hover: show add scene (+) and chapter menu (⋮) buttons

Scene rows (indented under chapter):
- Scene title (editable inline)
- Word count (right-aligned, muted)
- POV character chip (if set)
- Active scene: gold left border
- Hover: show archive button

### Reordering
Drag-and-drop to reorder scenes within a chapter and chapters within the book.  
Uses `sort_order` column in DB.

### Archive
Same pattern as Codex: hover to reveal archive button, confirm dialog.

## Editor Area (Right)

Phase 6 delivers only the shell:
- Scene title input at top (22px, no border, gold focus underline)
- Empty content area below (where TipTap editor drops in Phase 6a)
- Word count + "Saved" status in footer

The actual editor is Phase 6a–6h.

## AI Panel (Slides in from right)

Hidden by default. Opens when writer clicks AI button in TopBar.

Structure:
- Header: "AI Assistant" + model selector + close button
- Context chips (which Codex entries are in context)
- Chat message history (ChatBubble components)
- Input bar + send button
- Standard no-key tooltip when no provider configured

AI panel slides in over the editor area (does not push editor, or pushes with animation — Phase 6 decision).

## Writing State

`writingStore` (`src/store/writingStore.ts`):
```ts
interface WritingState {
  books: Book[];
  chapters: Chapter[];
  scenes: Scene[];
  selectedBookId: number | null;
  selectedChapterId: number | null;
  selectedSceneId: number | null;
  isAIPanelOpen: boolean;
  isOutlinePanelOpen: boolean;
}
```

## DB Queries Used

From `src/lib/db/`:
- `getBooks(projectId: number): Promise<Book[]>`
- `getChapters(bookId: number): Promise<Chapter[]>`
- `getScenes(chapterId: number): Promise<Scene[]>`
- `createChapter(bookId: number, title: string): Promise<Chapter>`
- `createScene(chapterId: number, title: string): Promise<Scene>`
- `reorderScenes(sceneIds: number[]): Promise<void>`
- `reorderChapters(chapterIds: number[]): Promise<void>`
- `updateSceneTitle(id: number, title: string): Promise<void>`
- `updateChapterTitle(id: number, title: string): Promise<void>`

## Word Count

Total word count in footer: sum of `word_count` for all scenes in selected chapter (or all scenes if book view).

Scene word count updated by editor autosave (Phase 6a delivers this).

## Keyboard Shortcuts

- `Cmd+K` — Open Global Search
- `Cmd+\` — Toggle outline panel
- `Cmd+Shift+A` — Toggle AI panel

## Feeds Into

Phase 6a: TipTap editor (drops into the empty content area)
