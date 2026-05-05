# Phase 3 — Database Schema + .tome File Layer

## Goal

Implement the `.tome` file format and the full SQLite database schema. After this phase, the app can create, open, save, and close `.tome` projects. All data is persisted correctly.

## Success Criteria

- User can create a new project → creates a `.tome` file
- User can open an existing `.tome` file
- Database schema matches `SPEC_database_schema.md` exactly
- Autosave debounces and saves to temp dir
- `.tome` repacks correctly on Cmd+S and project close
- No data loss across open/close cycles

## .tome File Lifecycle

1. **Create new:** Create temp dir → create `project.db` → initialize schema → write `project.db` to temp dir → repack to `.tome`
2. **Open:** Unzip `.tome` to temp dir → open `project.db` from temp dir → begin session
3. **Autosave:** On every content change, debounce 1–2 seconds → write changes to `project.db` in temp dir → update `updated_at`
4. **Manual save (Cmd+S):** Flush any pending writes → repack temp dir to `.tome` at original path
5. **Close:** Flush writes → repack → clean up temp dir

## Tauri Commands to Implement

All commands live in `src-tauri/src/commands/`. Each in its own file.

### `file_commands.rs`
- `create_project(path: String, title: String) -> Result<ProjectData>`
- `open_project(path: String) -> Result<ProjectData>`
- `save_project() -> Result<()>` — repack current temp dir to `.tome`
- `close_project() -> Result<()>` — save + clean temp dir

### `db_commands.rs`
- `initialize_schema() -> Result<()>` — run CREATE TABLE statements
- Generic CRUD commands per entity (see below)

## Database Initialization

On first open of a new project, run the full schema from `SPEC_database_schema.md` including:
- All tables
- All indexes
- FTS5 virtual table
- Seed `world_summary` with empty row
- Seed default `settings` keys

## Zustand Stores

### `projectStore` (`src/store/projectStore.ts`)
```ts
interface ProjectState {
  isOpen: boolean;
  projectPath: string | null;
  projectTitle: string;
  isDirty: boolean;
  lastSaved: Date | null;
}
```

### `settingsStore` (`src/store/settingsStore.ts`)
```ts
interface SettingsState {
  theme: 'dark';  // only dark for now
  fontSize: number;
  autosaveIntervalMs: number;
}
```

## Frontend Database Access Pattern

Use `@tauri-apps/plugin-sql` for all database operations.  
No raw SQL in components. All queries go through `src/lib/db/` modules:
- `src/lib/db/scenes.ts`
- `src/lib/db/chapters.ts`
- `src/lib/db/codex.ts`
- `src/lib/db/notes.ts`
- `src/lib/db/loom.ts`

Each module exposes typed async functions:
```ts
// Example
async function getScene(id: number): Promise<Scene>
async function updateScene(id: number, data: Partial<Scene>): Promise<void>
async function createScene(chapterId: number, title: string): Promise<Scene>
async function archiveScene(id: number): Promise<void>
```

## Autosave

`useAutosave` hook in `src/hooks/useAutosave.ts`:
- Accepts: content string + save function
- Debounces 1500ms after last change
- Sets `isDirty = true` on change, `isDirty = false` after save
- Shows "Saving…" → "Saved" in editor footer
- Never shows a save button — autosave is always on

## Open/Create Project Flow

Phase 3 adds the project open/create flow:
- On app launch with no project: show a "Welcome" screen (open existing / create new)
- File picker dialog via Tauri's `@tauri-apps/plugin-dialog`
- After create/open: render AppShell with active project

## Feeds Into

Phase 4: Settings screen (needs project open and DB access)
