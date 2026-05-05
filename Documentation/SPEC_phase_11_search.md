# Phase 11 — Global Search

## Goal

Build the Global Search overlay — a fast, keyboard-driven search across all content in the project: manuscript scenes, Codex entries, notes, and Loom messages.

## Reference Mockup

`Mockups/tome_of_creation_global_search_mockup.html`

*(Note: the HTML mockup is an older reference. This spec is authoritative where they differ.)*

## Trigger

- `Cmd+K` (macOS) / `Ctrl+K` (Windows) — opens search from anywhere in the app
- Also accessible via search icon in the Rail

## Overlay Design

Modal overlay using shadcn `Dialog` or `Command`:
- Backdrop: `rgba(0,0,0,0.6)` with subtle blur
- Search panel: centered, max-width 640px, max-height 80vh
- Background: `--color-panel`
- Border: `--border-medium`
- Rounded corners: 12px

## Search Input

- Large input at top of overlay (18px, full width)
- Placeholder: "Search your world…"
- Autofocused on open
- Debounce: 200ms (fast response)
- Clear button (×) when input has content
- Escape to close overlay

## Content Type Filters

Horizontal chip row below input:
- All | Manuscript | Codex | Notes | Loom

Each chip shows count of results in that type.  
Active chip: gold border.  
Clicking a chip filters results to that type.

## Results List

Scrollable list, max ~10 visible results before scroll.

### Result Row
- **Icon / color indicator** (left) — category dot for Codex, scene icon for Manuscript, etc.
- **Title** (bold, `--text-primary`) — entry/scene/note title
- **Excerpt** (below title, `--text-dim`) — surrounding text with match highlighted in gold
- **Breadcrumb** (right, muted) — e.g. "Codex → Characters", "Chapter 3 → Scene 2", "Notes"
- **Result type badge** — small chip showing content type

### Match Highlighting
Matched terms highlighted with gold background: `rgba(201, 168, 76, 0.3)`.

### Grouping
When "All" filter active, results grouped by content type with section headers:
- Manuscript (scenes)
- Codex
- Notes
- Loom

Each group shows up to 3 results with "Show more" if more exist.

## Navigation

- Arrow keys: move through results
- Enter: open selected result
- Tab: cycle through content type filters
- Escape: close overlay

## Result Actions (on click / Enter)

| Content Type | Action |
|---|---|
| Manuscript scene | Navigate to Writing Screen, select scene |
| Codex entry | Navigate to Codex Screen, open entry |
| Note | Navigate to Notes Screen, open note |
| Loom message | Navigate to Loom Screen, open session, scroll to message |

## FTS5 Query

Search uses the FTS5 virtual table:

```sql
SELECT
  fc.content_id,
  fc.content_type,
  fc.title,
  snippet(fts_content, 3, '<mark>', '</mark>', '…', 30) AS excerpt
FROM fts_content fc
WHERE fts_content MATCH ?
ORDER BY rank
LIMIT 50;
```

The `?` parameter is the search query, optionally with Porter stemming.

## Empty State

When query has no results:
- Icon (spyglass)
- "No results for '{query}'"
- Suggestion: "Try different words, or search in a specific category"

## Recent Searches

When overlay opens with empty input, show:
- "Recent" section with last 5 searches (stored in memory / settings)
- "Jump to" quick links: Writing, Codex, Notes, Loom

---

## Zustand / State

Search is stateless across sessions (no persistent search history in DB).  
Recent searches stored in `settingsStore` (in-memory, reset on app restart — acceptable for v1.0).

---

## Performance Notes

FTS5 is fast for typical project sizes (tens of thousands of words).  
If search becomes slow for very large projects:
1. Add `LIMIT` to query (already there)
2. Index rebuild on app open (async, doesn't block UI)
3. Debounce 200ms prevents flooding

---

## Feeds Into

No more phases — this is Phase 11, the final phase.  
After this, the app is feature-complete for v1.0.
