# CLAUDE.md — Tome of Creation

## Project Summary

Offline-first desktop app for Mac + Windows targeting fantasy fiction writers.
File format: `.tome` — a zip archive containing `project.db` (SQLite) and `assets/`.

**Stack:** Tauri (Rust backend) + React + TypeScript + SQLite + Vite

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop wrapper | Tauri (Rust) |
| Frontend | React + TypeScript |
| Bundler | Vite (Tauri scaffold default) |
| Database | SQLite via `@tauri-apps/plugin-sql` |
| State | Zustand (one store per domain) |
| UI components | shadcn/ui + Radix UI primitives |
| Styling | Tailwind CSS (mapped to CSS custom property tokens) |
| File format | `.tome` = zip archive |

### shadcn/ui — Component Strategy

shadcn copies component source code directly into `src/components/ui/`. You own every file. No black-box imports, no specificity fights.

**Use shadcn for complex interactive components:**
- `Dialog` — modals (new entry, apply section, preview prompt)
- `DropdownMenu` — model selector, action menus
- `Tooltip` — NoAIKeyTooltip, hover labels
- `Popover` — inline pickers
- `Command` (cmdk) — Global Search overlay (Cmd+K)
- `Tabs` — Settings nav, filter tabs in search
- `ScrollArea` — custom scrollbars in panels
- `Select` — dropdowns

**Build from scratch (too custom for shadcn):**
- Rail navigation
- CategoryChip
- ChatBubble + Apply button
- AIButton
- Avatar with initials
- Beat timeline row
- Book cover shelf

**Theming:** shadcn's CSS variables (`--primary`, `--background`, etc.) are mapped to our token values in `tailwind.config.ts` and `globals.css`. All shadcn components inherit the warm dark palette automatically. Never override shadcn defaults with raw hex values — always update the token mapping.

---

## Project Folder Layout

```
CLAUDE.md         — this file (auto-read by Claude Code on every session)
Documentation/    — all spec files and session prompts
Mockups/          — HTML visual references for each screen
src/              — app source code (created during Phase 1)
src-tauri/        — Rust backend (created during Phase 1)
```

All spec files are inside `Documentation/`. When this file references a spec by name, prepend `Documentation/` to the path.

---

## Repo Structure

```
src/
  components/
    ui/           # Atoms: Button, Input, Badge, Chip, etc.
    layout/       # Rail, Panel, TopBar
    codex/        # Codex-specific components
    writing/      # Editor-specific components
    planner/      # Series Planner components
    ai/           # AI panel, chat bubble, model selector
  screens/
    WritingScreen.tsx
    CodexScreen.tsx
    GlobalSearch.tsx
    SeriesPlanner.tsx
    AIRulesScreen.tsx
    SettingsScreen.tsx
  store/          # Zustand stores (one per domain)
  hooks/          # Custom React hooks
  lib/            # Utilities, AI client, DB access layer
    ai/
      providers/  # Provider implementations
    editor/       # Shared TipTap config, utilities
  styles/         # Global CSS, design tokens
src-tauri/
  src/
    main.rs
    commands/     # Tauri commands (file ops, DB, etc.)
```

---

## Design System Tokens

**Do not change these without explicit instruction.**

Define once in `src/styles/tokens.css` (CSS variables) and mirror in `src/styles/tokens.ts` (TS constants). Never use raw hex values in component files.

### Surface Colors

```
--color-rail:     #141210
--color-main:     #1c1a16
--color-panel:    #211e19
```

### Accent & Borders

```
--color-gold:         #c9a84c
--border-subtle:      rgba(240,230,210,0.08)
--border-medium:      rgba(240,230,210,0.14)
```

### Text

```
--text-primary:   rgba(240,230,210,0.9)
--text-dim:       rgba(240,230,210,0.65)
--text-muted:     rgba(240,230,210,0.45)
```

### Category Colors (color-blind safe — never swap)

```
--color-characters:    #c9a84c   /* Gold */
--color-locations:     #3d9e8a   /* Teal */
--color-factions:      #4ab3d4   /* Sky cyan */
--color-magic:         #7b5ea7   /* Dark violet */
--color-events:        #c47a8a   /* Rose */
--color-items:         #c4824a   /* Burnt orange */
--color-manuscript:    #6a9e5a   /* Green */
```

---

## State Management

- Use Zustand. One store per domain: `projectStore`, `codexStore`, `writingStore`, `aiStore`, `settingsStore`.
- Keep stores lean — derived state goes in hooks, not stores.
- Store files live in `src/store/`.

---

## AI Provider Integration

All providers expose a unified interface:

```ts
interface AIProvider {
  sendMessage(messages: Message[], model: string, systemPrompt: string): Promise<string>;
}
```

- Implementations live in `src/lib/ai/providers/`.
- API keys stored in Tauri's secure local storage only — never in `.tome`, never logged, never sent anywhere except the target provider.
- AI context must always include relevant Codex entries (Codex is the AI's bible).
- AI never auto-applies content — the user must click Apply.

---

## Git & Commit Rules

**GitHub repository:** `https://github.com/Voranius/Tome-of-Creation`

1. **Never commit without explicit user confirmation.** After completing work, suggest a commit with a proposed message and show `git status` or `git diff --stat` — then wait for the user to say yes before running `git commit`.
2. **Never push without explicit user confirmation.** Same rule applies to `git push`.
3. You may run `git add`, `git status`, `git diff`, and `git log` freely at any time.
4. Commit messages use conventional commits format: `feat:`, `chore:`, `fix:`, `refactor:`, etc.

---

## Code Signing & Notarization (macOS)

The user has an active Apple Developer account. The app must be code-signed and notarized for distribution on macOS. This is handled at release time — not during development builds (`npm run tauri dev` does not require signing).

**Do not attempt code signing or notarization until the user explicitly asks for a release build.**

### Credentials needed

All sensitive values are stored as environment variables — never hardcoded in any config file or committed to git.

| Variable | What it is | Where to find it |
|---|---|---|
| `APPLE_TEAM_ID` | 10-character alphanumeric ID | Apple Developer → Membership → Team ID |
| `APPLE_ID` | Apple ID email address | Apple Developer → Account |
| `APPLE_PASSWORD` | App-specific password (NOT your Apple ID password) | appleid.apple.com → Sign-In and Security → App-Specific Passwords |
| `APPLE_SIGNING_IDENTITY` | Certificate name | Keychain Access → "Developer ID Application: [Your Name] (TEAMID)" |

### Release build command

```bash
npm run tauri build
```

Run with all four environment variables set. Tauri handles signing and notarization automatically if credentials are present and valid.

- `src-tauri/target/` is in `.gitignore` — build artifacts are never committed
- App-specific passwords expire — never store them in any file
- If notarization fails, most common cause is expired app-specific password or untrusted certificate

---

## Critical Rules

1. **Never change design tokens or category colors** without explicit instruction.
2. **No raw hex values in component files** — always use CSS variables or token constants.
3. **Codex entries must be included** in AI context whenever AI generates content.
4. **AI never auto-applies** — always require an explicit user action (Apply button).
5. **App must be fully functional without an AI key.** Only AI generation features are gated.
6. **No API key behavior:** When an AI button is clicked without a key configured, show an inline tooltip: `"AI features need an API key — Set up in Settings →"`. Never crash. Never show a broken state.
7. **Autosave is always on.** Debounce ~1–2 seconds after last keystroke. Writers never think about saving.
8. **`.tome` file lifecycle:** Unpack to a temp working dir on open. Repack on Cmd+S or project close. The app always works against the unpacked temp dir during a session.

---

## .tome File Format

```
project.tome  (zip archive)
├── project.db    SQLite database
└── assets/       Images, attachments, etc.
```

On open: unzip to temp dir, open `project.db` from there.
On save/close: repack temp dir back to `.tome`.

---

## Build Phases (do not skip ahead)

| # | Phase | Key spec file |
|---|---|---|
| 1 | Project skeleton (Tauri + React + TS + shadcn running) | `Documentation/SPEC_phase_1_skeleton.md` |
| 2 | Design system + component library | `Documentation/SPEC_phase_2_design_system.md` |
| 3 | Database schema + `.tome` file layer | `Documentation/SPEC_phase_3_file_layer.md` |
| 4 | Settings screen + AI provider connections | `Documentation/SPEC_phase_4_settings.md` |
| 5 | Codex screen | `Documentation/SPEC_phase_5_codex.md` |
| 6 | Writing screen (layout + outline panel) | `Documentation/SPEC_phase_6_writing.md` |
| 6a–6h | TipTap editor (8 incremental sessions) | `Documentation/SPEC_editor_tiptap.md` |
| 7 | Series Planner | `Documentation/SPEC_phase_7_planner.md` |
| 8 | AI Rules screen | `Documentation/SPEC_phase_8_ai_rules.md` |
| 9 | The Loom (worldbuilding chat) | `Documentation/SPEC_phase_9_loom.md` |
| 10 | Notes screen | `Documentation/SPEC_phase_10_notes.md` |
| 11 | Global Search | `Documentation/SPEC_phase_11_search.md` |

Always read the relevant spec file before starting a phase.
The TipTap editor (Phase 6a–6h) must be built one session at a time. Read `Documentation/SPEC_editor_tiptap.md` fully before starting Session 6a.

---

## Spec Files Reference

- `Documentation/SPEC_design_system.md` — all components and tokens
- `Documentation/SPEC_database_schema.md` — complete SQLite schema
- `Documentation/SPEC_ai_architecture.md` — AI provider integration, context assembly, three-layer context system
- `Documentation/SPEC_phase_1_skeleton.md` — project setup steps
- `Documentation/SPEC_phase_2_design_system.md` — component build guide
- `Documentation/SPEC_phase_3_file_layer.md` — `.tome` file + DB layer
- `Documentation/SPEC_phase_4_settings.md` — Settings screen
- `Documentation/SPEC_phase_5_codex.md` — Codex screen
- `Documentation/SPEC_phase_6_writing.md` — Writing screen
- `Documentation/SPEC_phase_7_planner.md` — Series Planner
- `Documentation/SPEC_phase_8_ai_rules.md` — AI Rules screen
- `Documentation/SPEC_phase_9_loom.md` — The Loom
- `Documentation/SPEC_phase_10_notes.md` — Notes screen
- `Documentation/SPEC_phase_11_search.md` — Global Search (covers Codex, Manuscript, Notes, Loom)

## Mockups Reference

- `Mockups/tome_of_creation_full_desktop_mockup.html` — overall app layout
- `Mockups/tome_of_creation_codex_entry_mockup.html` — Codex entry detail
- `Mockups/tome_series_planner_v2.html` — Series Planner
- `Mockups/tome_settings_mockup.html` — Settings screen
- `Mockups/tome_ai_rules_mockup.html` — AI Rules screen
- `Mockups/tome_of_creation_global_search_mockup.html` — Global Search (older mockup — see SPEC_phase_11_search.md for full spec)
- `Mockups/loom_mockup_v2.html` — The Loom
- `Mockups/notes_mockup.html` — Notes screen

---

## Conventions

- TypeScript strict mode on. No `any` unless unavoidable and commented.
- Components are functional with hooks. No class components.
- Tauri commands (Rust) live in `src-tauri/src/commands/`. Each command gets its own file grouped by domain.
- Frontend calls Tauri commands via `@tauri-apps/api/core` `invoke()`.
- Prefer explicit types over inference for function signatures and store shapes.
- CSS Modules or plain CSS with CSS variables — no CSS-in-JS.
- Tailwind utility classes are allowed, but all color values must come from the token mapping — no arbitrary Tailwind color values like `bg-[#c9a84c]`. Use `bg-gold` or `text-primary` which map to tokens.
- shadcn components live in `src/components/ui/` alongside custom components. Do not put them in a separate folder.
- When adding a new shadcn component: run `npx shadcn@latest add [component]`, then immediately restyle it to match the design tokens before using it anywhere.
