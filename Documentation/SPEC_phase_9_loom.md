# Phase 9 — The Loom

## Goal

Build The Loom — a persistent worldbuilding chat where writers think through their world with the AI. Unlike the Writing Screen's AI panel (which is scene-focused), The Loom is a dedicated space for open-ended world exploration.

## Reference Mockup

`Mockups/loom_mockup_v2.html`

## Screen Layout

```
Rail (52px) | Sessions Panel (220px) | Chat Area (flex 1) | Context Panel (248px)
```

---

## Sessions Panel (Left)

### Header
- "New Session" button (+ icon, creates new `loom_sessions` row)
- Search input (filters session list by title)

### Session List
Sessions grouped by recency:
- **Today** — sessions created/updated today
- **This week** — earlier this week
- **Earlier** — older sessions

Each session row:
- Session icon (chat bubble SVG, small)
- Session title (editable on double-click)
- Relative timestamp (right, muted)
- Active session: gold left border, slightly lighter background
- Hover: reveal archive button (right side)

### Archive Flow
Same pattern as other screens. Archived sessions excluded from list by default.

---

## Chat Area (Center)

### Header
- Current session title (editable inline, click to rename)
- "Pin to context" button (pins this session to another session's context panel)
- Model selector (DropdownMenu)

### Message List
Scrollable. Newest messages at bottom. Auto-scrolls on new message.

**User bubbles:**
- Right-aligned
- Background: gold tint (`rgba(201, 168, 76, 0.12)`)
- Text: `--text-primary`
- No action buttons

**AI bubbles:**
- Left-aligned
- Background: `--color-panel`
- Border: `--border-subtle`
- Text: `--text-primary`
- Action buttons (appear on hover):
  - **Save to Codex** — opens dialog to create a new Codex entry pre-populated with this response
  - **Copy** — copies response text to clipboard
  - **Retry** — regenerates this response

### Input Bar (Bottom)
- Multiline text input (auto-expands, max ~4 lines)
- `@` triggers Codex entity picker (same as Writing Screen)
- @Mentioned entities appear as color-coded chips in the input
- Send button (or Enter to send, Shift+Enter for newline)
- "Thinking…" animation while AI is generating

### @Mention Entity Picker
shadcn `Command` popover anchored to the `@` character position.  
Fuzzy searches `codex_entries.title`.  
Color-coded by category.  
Arrow keys to navigate, Enter to select, Escape to dismiss.

---

## Context Panel (Right)

The context panel shows the writer **what** the AI knows for this session. No token counts — those are an implementation detail, not a writer concern.

### Section 1 — Always in Context
A single compact pill/tag:
- Background: `rgba(201, 168, 76, 0.1)` (gold tint)
- Border: `rgba(201, 168, 76, 0.3)`
- Text: "AI Rules · World Summary" (gold, 12px)
- Has a small info `(i)` icon — hover tooltip: "Your AI Rules and World Summary are always included."

This section has no expand/collapse. It's always visible as a single line.

### Section 2 — Pinned Conversations
Label: "Pinned Conversations" (section header, muted, 11px uppercase)

Rows from `loom_pinned_sessions`:
- Session icon (small chat bubble SVG)
- Session title (truncated)
- Remove button (× , right side, hover to reveal)
- "Pin a conversation" button at bottom when empty

When pinned conversations are present, their full message history is included in AI context Layer 3.

### Section 3 — Pinned Codex Entries
Label: "Pinned Entries" (section header)

Chips from `loom_pinned_entries`:
- Category dot + entry title
- × button to remove
- Color-coded by category (same as CategoryChip)
- "Pin an entry" button (+) to search and pin a new entry

### Section 4 — Mentioned This Session
Label: "Mentioned This Session" (section header)

Auto-populated chips — any Codex entry @mentioned in any message in this session.  
Read-only (cannot remove — these are from the chat history).  
Color-coded by category.

### Context Panel Footer
Subtle hint text at bottom:
*"Pinned entries and conversations stay in the AI's memory for this session."*

---

## Save to Codex Dialog

When writer clicks "Save to Codex" on an AI bubble:

shadcn `Dialog`:
- Category picker (which type of entry to create)
- Title input (pre-populated from first line of AI response)
- Content textarea (pre-populated with full AI response)
- "Create Entry" button → creates `codex_entries` row, opens entry in Codex screen

---

## Loom AI Context Assembly

```ts
async function assembleLoomContext(sessionId: number, userMessage: string): Promise<AssembledContext> {
  // Layer 1: Always included
  const rules = await getRulesGroupedByCategory();
  const worldSummary = await getWorldSummary();

  // Layer 2: This session's message history
  const history = await getLoomMessages(sessionId);

  // Layer 3: Pinned entries + pinned conversations + @mentions from current message
  const pinnedEntries = await getPinnedEntries(sessionId);
  const pinnedSessions = await getPinnedSessions(sessionId);
  const mentionedEntryIds = parseMentions(userMessage);
  const mentionedEntries = await getEntriesByIds(mentionedEntityIds);

  return assembleContext({ rules, worldSummary, history, pinnedEntries, pinnedSessions, mentionedEntries });
}
```

---

## Zustand Store

`loomStore` (`src/store/loomStore.ts`):
```ts
interface LoomState {
  sessions: LoomSession[];
  selectedSessionId: number | null;
  messages: LoomMessage[];
  pinnedEntries: CodexEntry[];
  pinnedSessions: LoomSession[];
  mentionedEntries: CodexEntry[];
  isGenerating: boolean;
  searchQuery: string;
}
```

---

## DB Queries

From `src/lib/db/loom.ts`:
- `getSessions(): Promise<LoomSession[]>`
- `createSession(): Promise<LoomSession>`
- `updateSession(id: number, data: Partial<LoomSession>): Promise<void>`
- `archiveSession(id: number): Promise<void>`
- `getMessages(sessionId: number): Promise<LoomMessage[]>`
- `addMessage(sessionId: number, role: string, content: string): Promise<LoomMessage>`
- `getPinnedEntries(sessionId: number): Promise<CodexEntry[]>`
- `pinEntry(sessionId: number, entryId: number): Promise<void>`
- `unpinEntry(sessionId: number, entryId: number): Promise<void>`
- `getPinnedSessions(sessionId: number): Promise<LoomSession[]>`
- `pinSession(sessionId: number, pinnedSessionId: number): Promise<void>`
- `unpinSession(sessionId: number, pinnedSessionId: number): Promise<void>`

---

## Feeds Into

Phase 10: Notes screen (independent of Loom, can be built in parallel)
