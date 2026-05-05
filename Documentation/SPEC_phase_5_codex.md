# Phase 5 — Codex Screen

## Goal

Build the Codex screen — the worldbuilding encyclopedia. Writers create and manage entries for Characters, Locations, Factions, Magic systems, Events, and Items.

## Reference Mockups

- `Mockups/tome_of_creation_full_desktop_mockup.html` — overall layout with Codex visible
- `Mockups/tome_of_creation_codex_entry_mockup.html` — Codex entry detail view

## Screen Layout

```
Rail (52px) | Codex Panel (260px) | Entry Detail (flex 1) | [AI Panel (248px) — optional, slides in]
```

## Codex Panel (Left)

### Header
- Search input (searches within codex entries by title)
- "New Entry" button (opens dialog to pick category)

### Category Filters
Horizontal row of `CategoryChip` filters at top of panel:
- All | Characters | Locations | Factions | Magic | Events | Items
- Each chip shows entry count badge
- Active filter: gold border

### Entry List
Each entry row shows:
- Category color dot (left)
- Entry title
- Short excerpt (first 80 chars of summary, if exists)
- Hover: reveal archive button (right side)

Grouped by category when "All" filter is active.  
Alphabetical within category.  
Archived entries hidden by default; toggle to show.

## Entry Detail (Right)

### Header area
- Cover image (if set) — click to upload
- Entry title (large input, 22px)
- Category chip (non-interactive, shows category)
- Tags input (chip-style, free text)

### Tabs (shadcn Tabs)
- **Overview** — TipTap editor with entry content
- **Connections** — Related entries (visual graph or list)
- **AI** — AI panel for this entry

### Overview Tab
Full TipTap editor (same config as Writing/Notes, from `editorConfig.ts`).  
Autosaves to `codex_entries.content`.

### Connections Tab
Shows bidirectional relationships from `codex_relations`:
- List of connected entries with category chip
- "Add connection" button → search dialog to pick entry + optional relationship label
- Remove connection button (hover on row)

### AI Tab
AI panel specific to this codex entry:
- Entry is always in context (Layer 3, pinned)
- Writer can ask questions about the entry, generate content, expand lore
- All suggestions use Apply button — never auto-applied
- Standard no-key tooltip when no provider configured

## New Entry Dialog

Shadcn `Dialog`:
- Category picker (6 large category buttons with color + icon)
- Title input
- Create button
- Creates entry in DB, selects it in the panel, opens detail view

## Archive Flow

- Hover over entry row → archive icon appears (right side)
- Click → confirm dialog → `is_archived = 1`
- Archived entries excluded from `@mention` autocomplete
- Archive toggle in panel header to show/hide archived

## Zustand Store

`codexStore` (`src/store/codexStore.ts`):
```ts
interface CodexState {
  entries: CodexEntry[];
  selectedEntryId: number | null;
  activeCategory: string | null;  // null = All
  searchQuery: string;
  showArchived: boolean;
  isLoading: boolean;
}
```

## DB Queries Used

From `src/lib/db/codex.ts`:
- `getEntries(category?: string): Promise<CodexEntry[]>`
- `getEntry(id: number): Promise<CodexEntry>`
- `createEntry(data: NewCodexEntry): Promise<CodexEntry>`
- `updateEntry(id: number, data: Partial<CodexEntry>): Promise<void>`
- `archiveEntry(id: number): Promise<void>`
- `getRelations(entryId: number): Promise<CodexRelation[]>`
- `addRelation(entryAId: number, entryBId: number, relation?: string): Promise<void>`
- `removeRelation(relationId: number): Promise<void>`

## FTS Integration

Search input in Codex panel queries the FTS5 table:
```sql
SELECT entry_id FROM fts_content
WHERE content_type = 'codex' AND fts_content MATCH ?
```

Highlights matching text in results.

## Feeds Into

Phase 6: Writing screen (needs codex entries for @mention context)
