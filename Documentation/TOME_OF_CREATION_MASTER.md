# Tome of Creation — Master Reference Document

## What Is This?

Tome of Creation is an offline-first desktop writing app for fantasy fiction authors. It combines a rich-text manuscript editor, a Codex (worldbuilding encyclopedia), a Series Planner, an AI writing assistant, a Notes screen, a persistent worldbuilding chat (The Loom), and a Global Search — all in one app, all stored locally in a single `.tome` file.

**Target platforms:** macOS + Windows  
**Stack:** Tauri (Rust) + React + TypeScript + SQLite + Vite

---

## Design Philosophy

- **Offline first.** No account required. No cloud sync. The writer owns their files.
- **Writers, not developers.** The UI must feel like a literary tool, not a developer tool.
- **AI as assistant, never author.** AI generates suggestions. The writer decides what to keep. AI never auto-applies anything.
- **The Codex is the AI's bible.** Every AI interaction is grounded in the world the author has built.
- **Fully functional without AI.** API key is optional. All non-AI features work without it.
- **Autosave always on.** Writers never think about saving.

---

## Screen Inventory

| Screen | Description |
|---|---|
| Writing Screen | Manuscript editor — chapters, scenes, TipTap rich text |
| Codex Screen | Worldbuilding encyclopedia — Characters, Locations, Factions, Magic, Events, Items |
| Series Planner | Multi-book arc planning with beat timeline |
| Settings Screen | AI provider keys, appearance, preferences |
| AI Rules Screen | Per-category AI behavior rules and world summary |
| The Loom | Persistent worldbuilding chat with context panel |
| Notes Screen | Free-form note taking with TipTap editor |
| Global Search | Full-text search across all content types |

---

## Key Design Decisions

### File Format
`.tome` = zip archive containing:
- `project.db` — SQLite database
- `assets/` — images, attachments

On open: unzip to temp working directory, open `project.db` from there.  
On save/close: repack temp dir back to `.tome`.  
Autosave debounces ~1–2 seconds after last keystroke.

### Database
SQLite via `@tauri-apps/plugin-sql` (NOT better-sqlite3).  
FTS5 virtual table for full-text search across all content.  
Soft deletes via `is_archived` flag on scenes, chapters, codex_entries, notes, loom_sessions.

### Editor
TipTap v2 rich-text editor. Built in 8 incremental sessions (Phase 6a–6h).  
Shared `editorConfig.ts` between Writing Screen and Notes Screen.  
Spell check v1.0: browser built-in (`spellcheck` HTML attribute).  
Spell check post-v1.0: LanguageTool (grammar + style, custom dictionary for fantasy terms).

### AI
Three-layer context system:
1. Global AI Rules + World Summary (always in context)
2. Current chapter/scene context
3. Pinned Codex entries + @mentioned entities

All providers expose a unified `AIProvider` interface.  
API keys stored in Tauri secure local storage only — never in `.tome` file.  
Supported providers: OpenAI, Anthropic, Google Gemini, Ollama (local).

### The Loom
Persistent worldbuilding chat. Sessions panel + chat area + context panel.  
Context panel shows *what* is in context (no token counts — that's implementation detail, not writer UX):
- "Always in context" compact tag (AI Rules + World Summary)
- Pinned conversations
- Pinned Codex entries
- @mentioned entries this session

### Notes Screen
Two-column layout: Notes panel (256px) + Editor area (flex 1). No AI panel.  
Full TipTap editor with same toolbar as Writing Screen.  
Shared `editorConfig.ts` with Writing Screen.

### Spell Check Decision Log
- **v1.0 (shipped):** Browser built-in `spellCheck` attribute — zero effort, uses OS dictionary, no dependencies
- **Post-v1.0 (planned):** LanguageTool — grammar + style checking, custom dictionary support for fantasy terminology, official TipTap extension exists

### Code Signing (macOS)
Apple Developer account is active.  
Code signing and notarization at release time only — not during dev.  
Credentials stored as environment variables: `APPLE_TEAM_ID`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_SIGNING_IDENTITY`.

### GitHub
Repository: `https://github.com/Voranius/Tome-of-Creation`  
Claude Code must never commit or push without explicit user confirmation.

---

## Build Phase Order

| # | Phase | Status |
|---|---|---|
| 1 | Project skeleton (Tauri + React + TS + shadcn) | Pending |
| 2 | Design system + component library | Pending |
| 3 | Database schema + `.tome` file layer | Pending |
| 4 | Settings screen + AI provider connections | Pending |
| 5 | Codex screen | Pending |
| 6 | Writing screen layout + outline panel | Pending |
| 6a–6h | TipTap editor (8 incremental sessions) | Pending |
| 7 | Series Planner | Pending |
| 8 | AI Rules screen | Pending |
| 9 | The Loom | Pending |
| 10 | Notes screen | Pending |
| 11 | Global Search | Pending |

---

## Design Tokens (summary)

Full token definitions are in `src/styles/tokens.css` and `src/styles/tokens.ts`.

### Surfaces
- Rail: `#141210`
- Main: `#1c1a16`
- Panel: `#211e19`

### Accent
- Gold: `#c9a84c`

### Category Colors
- Characters: `#c9a84c` (Gold)
- Locations: `#3d9e8a` (Teal)
- Factions: `#4ab3d4` (Sky cyan)
- Magic: `#7b5ea7` (Dark violet)
- Events: `#c47a8a` (Rose)
- Items: `#c4824a` (Burnt orange)
- Manuscript: `#6a9e5a` (Green)

These are color-blind safe. Never swap them.

---

## Critical Rules (same as CLAUDE.md)

1. Never change design tokens or category colors without explicit instruction.
2. No raw hex values in component files — always use CSS variables or token constants.
3. Codex entries must be included in AI context whenever AI generates content.
4. AI never auto-applies — always require an explicit user action (Apply button).
5. App must be fully functional without an AI key.
6. No API key behavior: show inline tooltip, never crash.
7. Autosave is always on. Debounce ~1–2 seconds.
8. `.tome` file lifecycle: unpack to temp on open, repack on save/close.
