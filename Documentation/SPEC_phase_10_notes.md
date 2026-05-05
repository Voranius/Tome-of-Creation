# Phase 10 — Notes Screen

## Goal

Build the Notes screen — a simple, fast note-taking area with full TipTap editor support. Notes are freeform: no chapters, no scenes, no hierarchy. Just a list of notes and a full editor.

## Reference Mockup

`Mockups/notes_mockup.html`

## Screen Layout

```
Rail (52px) | Notes Panel (256px) | Editor Area (flex 1)
```

No AI panel. Notes are personal thinking space — AI integration can be added post-v1.0 if needed.

---

## Notes Panel (Left)

Width: 256px  
Background: `--color-panel`

### Header
- "Notes" label (section title, 13px, `--text-dim`)
- "+ New Note" button (right side, small, gold text)

### Note List

Each `NoteRow` contains:
```
┌─────────────────────────────┐
│ [Note Title]     [Archive ×]│  ← note-row-top (flexbox)
│ just now                    │  ← note-meta
│ First line of content…      │  ← note-excerpt
└─────────────────────────────┘
```

**note-row-top:** `display: flex; justify-content: space-between; align-items: flex-start`  
**Archive button:** `display: none` by default; `display: flex` on note-row hover  
**Padding:** 12px top/bottom, 14px left/right  
**Gap:** 4px between title, meta, and excerpt (flex column)  
**Divider:** 1px `--border-subtle` between rows

**note-title:** `--text-primary`, 13px, font-weight 500, truncate if too long  
**note-meta:** `--text-muted`, 11px (timestamp, e.g. "just now", "2 hours ago", "May 3")  
**note-excerpt:** `--text-dim`, 12px, max 2 lines, ellipsis overflow

Active note: gold left border (2px), slightly lighter background

### New Note
Clicking "+ New Note":
- Creates a new `notes` row with title "Untitled Note"
- Selects it immediately
- Opens in editor with title input focused

### Sorting
Notes sorted by `updated_at DESC` (most recently edited first).

---

## Editor Area (Right)

### Title Input
```
font-size: 22px
font-weight: 400
color: --text-primary
background: transparent
border: none
border-bottom: 2px solid transparent
padding: 0 0 8px 0
width: 100%
```

On focus: `border-bottom-color: var(--color-gold)` (subtle gold underline, 1px)  
Placeholder: "Note title…" in `--text-muted`  
Autosaves to `notes.title` on change (same debounce as content)

### Toolbar
Fixed toolbar below title input, above editor body.  
Same toolbar as Writing Screen (from `editorConfig.ts`).  
Buttons: Bold | Italic | Underline | Strike | ¶ | H1 | H2 | H3 | Blockquote | Bullet List | Ordered List | Highlight | @ Link

### Editor Body
TipTap editor using `baseExtensions` from `editorConfig.ts`.  
Additional: `Placeholder.configure({ placeholder: 'Start writing…' })`  
Spell check: browser built-in (same as Writing Screen).  
Gold cursor.  
Content stored as TipTap JSON in `notes.content`.

### Footer
```
[word count] words  ·  [Saving… / Saved]
```
Word count from TipTap `characterCount` extension.  
"Saving…" during debounce, "Saved" after write to DB.

---

## Codex @Mentions in Notes

Same `@` mention system as Writing Screen and Loom.  
@Mentioned entries:
- Render as inline chips (color-coded by category)
- Are stored in TipTap JSON as custom marks
- Currently for annotation only (not fed to AI in Notes — no AI panel)

---

## Archive Flow

- Hover over note row → archive button appears (× in top-right of row)
- Click → confirm dialog → `is_archived = 1`
- Archived notes hidden from list by default
- Toggle in header to show archived notes

---

## Empty State

When no notes exist yet:
- Panel shows: note icon + "No notes yet" + "Create your first note" button
- Editor area: blank with prompt to select or create a note

---

## Zustand Store

`notesStore` (`src/store/notesStore.ts`):
```ts
interface NotesState {
  notes: Note[];
  selectedNoteId: number | null;
  searchQuery: string;
  showArchived: boolean;
  isLoading: boolean;
}
```

---

## DB Queries

From `src/lib/db/notes.ts`:
- `getNotes(): Promise<Note[]>`
- `getNote(id: number): Promise<Note>`
- `createNote(): Promise<Note>`
- `updateNote(id: number, data: Partial<Note>): Promise<void>`
- `archiveNote(id: number): Promise<void>`

`updateNote` is called by the autosave hook with `{ title, content, word_count }`.

---

## Shared Editor Config

Notes Screen uses the same `baseExtensions` and `baseEditorProps` from `src/lib/editor/editorConfig.ts` as Writing Screen.

The only differences:
- Placeholder text: "Start writing…" (vs. "Begin your story…")
- No POV character metadata
- No scene word count contribution to chapter total

---

## Feeds Into

Phase 11: Global Search (needs notes indexed in FTS5)
