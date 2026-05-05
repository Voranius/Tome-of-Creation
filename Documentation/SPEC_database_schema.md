# Database Schema — Tome of Creation

All data lives in `project.db` (SQLite) inside the `.tome` archive.

---

## Tables

### `projects`
```sql
CREATE TABLE projects (
  id          INTEGER PRIMARY KEY,
  title       TEXT NOT NULL,
  author      TEXT,
  description TEXT,
  cover_path  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `books`
```sql
CREATE TABLE books (
  id          INTEGER PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id),
  title       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `chapters`
```sql
CREATE TABLE chapters (
  id          INTEGER PRIMARY KEY,
  book_id     INTEGER NOT NULL REFERENCES books(id),
  title       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `scenes`
```sql
CREATE TABLE scenes (
  id          INTEGER PRIMARY KEY,
  chapter_id  INTEGER NOT NULL REFERENCES chapters(id),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  word_count  INTEGER NOT NULL DEFAULT 0,
  pov_char_id INTEGER REFERENCES codex_entries(id),
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `codex_entries`
```sql
CREATE TABLE codex_entries (
  id          INTEGER PRIMARY KEY,
  category    TEXT NOT NULL CHECK(category IN ('characters','locations','factions','magic','events','items')),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  summary     TEXT,
  cover_path  TEXT,
  tags        TEXT,  -- JSON array of strings
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `codex_relations`
Bidirectional links between codex entries.
```sql
CREATE TABLE codex_relations (
  id          INTEGER PRIMARY KEY,
  entry_a_id  INTEGER NOT NULL REFERENCES codex_entries(id),
  entry_b_id  INTEGER NOT NULL REFERENCES codex_entries(id),
  relation    TEXT,  -- e.g. "allies with", "born in", "member of"
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `notes`
```sql
CREATE TABLE notes (
  id          INTEGER PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT 'Untitled Note',
  content     TEXT NOT NULL DEFAULT '',
  word_count  INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `loom_sessions`
```sql
CREATE TABLE loom_sessions (
  id          INTEGER PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT 'New Session',
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `loom_messages`
```sql
CREATE TABLE loom_messages (
  id          INTEGER PRIMARY KEY,
  session_id  INTEGER NOT NULL REFERENCES loom_sessions(id),
  role        TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `loom_pinned_entries`
Codex entries pinned to a Loom session's context.
```sql
CREATE TABLE loom_pinned_entries (
  id          INTEGER PRIMARY KEY,
  session_id  INTEGER NOT NULL REFERENCES loom_sessions(id),
  entry_id    INTEGER NOT NULL REFERENCES codex_entries(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(session_id, entry_id)
);
```

### `loom_pinned_sessions`
Loom sessions pinned to another session's context (for cross-referencing chats).
```sql
CREATE TABLE loom_pinned_sessions (
  id              INTEGER PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES loom_sessions(id),
  pinned_session_id INTEGER NOT NULL REFERENCES loom_sessions(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(session_id, pinned_session_id)
);
```

### `ai_rules`
```sql
CREATE TABLE ai_rules (
  id          INTEGER PRIMARY KEY,
  category    TEXT NOT NULL,  -- matches codex category or 'global'
  rule_text   TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `world_summary`
Single-row table for the world summary used in AI context.
```sql
CREATE TABLE world_summary (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  content     TEXT NOT NULL DEFAULT '',
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `settings`
Key-value store for app settings.
```sql
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `series_beats`
Beats on the Series Planner timeline.
```sql
CREATE TABLE series_beats (
  id          INTEGER PRIMARY KEY,
  book_id     INTEGER REFERENCES books(id),  -- NULL = series-wide beat
  title       TEXT NOT NULL,
  description TEXT,
  beat_type   TEXT,  -- e.g. "inciting incident", "midpoint", "climax"
  position    REAL NOT NULL DEFAULT 0,  -- 0.0 to 1.0 relative position
  color       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## Full-Text Search

FTS5 virtual table for searching across all content types.

```sql
CREATE VIRTUAL TABLE fts_content USING fts5(
  content_id,
  content_type,  -- 'scene', 'codex', 'note', 'loom_message'
  title,
  body,
  tokenize = 'porter ascii'
);
```

Triggers keep `fts_content` in sync with inserts/updates/deletes on `scenes`, `codex_entries`, `notes`, and `loom_messages`.

---

## Indexes

```sql
CREATE INDEX idx_scenes_chapter ON scenes(chapter_id);
CREATE INDEX idx_chapters_book ON chapters(book_id);
CREATE INDEX idx_codex_category ON codex_entries(category);
CREATE INDEX idx_loom_messages_session ON loom_messages(session_id);
CREATE INDEX idx_notes_updated ON notes(updated_at DESC);
```

---

## Soft Delete Pattern

`is_archived = 1` means the row is hidden from normal views but not deleted.  
All queries in the app default to `WHERE is_archived = 0`.  
An "Archive" action sets `is_archived = 1`.  
Hard delete is available from the archive view only.

Applies to: `scenes`, `chapters`, `codex_entries`, `notes`, `loom_sessions`.

---

## Notes on Implementation

- All `content` fields store TipTap JSON (stringified) except `world_summary.content` which stores plain text.
- `word_count` fields are maintained by the editor on every autosave — do not compute from content at query time.
- `settings` keys defined at launch: `theme`, `font_size`, `autosave_interval_ms`, `default_ai_provider`.
- `codex_entries.tags` stores a JSON array, e.g. `'["protagonist","mage"]'`. Parse in application code.
