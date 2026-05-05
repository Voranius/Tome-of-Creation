use rusqlite::Connection;

pub fn initialize_schema_at(db_path: &str) -> Result<(), String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute_batch(
        "
        PRAGMA journal_mode=WAL;
        PRAGMA foreign_keys=ON;

        CREATE TABLE IF NOT EXISTS projects (
            id          INTEGER PRIMARY KEY,
            title       TEXT NOT NULL,
            author      TEXT,
            description TEXT,
            cover_path  TEXT,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS books (
            id          INTEGER PRIMARY KEY,
            project_id  INTEGER NOT NULL REFERENCES projects(id),
            title       TEXT NOT NULL,
            sort_order  INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS chapters (
            id          INTEGER PRIMARY KEY,
            book_id     INTEGER NOT NULL REFERENCES books(id),
            title       TEXT NOT NULL,
            sort_order  INTEGER NOT NULL DEFAULT 0,
            is_archived INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS codex_entries (
            id          INTEGER PRIMARY KEY,
            category    TEXT NOT NULL CHECK(category IN ('characters','locations','factions','magic','events','items')),
            title       TEXT NOT NULL,
            content     TEXT NOT NULL DEFAULT '',
            summary     TEXT,
            cover_path  TEXT,
            tags        TEXT,
            is_archived INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS scenes (
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

        CREATE TABLE IF NOT EXISTS codex_relations (
            id          INTEGER PRIMARY KEY,
            entry_a_id  INTEGER NOT NULL REFERENCES codex_entries(id),
            entry_b_id  INTEGER NOT NULL REFERENCES codex_entries(id),
            relation    TEXT,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS notes (
            id          INTEGER PRIMARY KEY,
            title       TEXT NOT NULL DEFAULT 'Untitled Note',
            content     TEXT NOT NULL DEFAULT '',
            word_count  INTEGER NOT NULL DEFAULT 0,
            is_archived INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS loom_sessions (
            id          INTEGER PRIMARY KEY,
            title       TEXT NOT NULL DEFAULT 'New Session',
            is_archived INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS loom_messages (
            id          INTEGER PRIMARY KEY,
            session_id  INTEGER NOT NULL REFERENCES loom_sessions(id),
            role        TEXT NOT NULL CHECK(role IN ('user','assistant')),
            content     TEXT NOT NULL,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS loom_pinned_entries (
            id          INTEGER PRIMARY KEY,
            session_id  INTEGER NOT NULL REFERENCES loom_sessions(id),
            entry_id    INTEGER NOT NULL REFERENCES codex_entries(id),
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(session_id, entry_id)
        );

        CREATE TABLE IF NOT EXISTS loom_pinned_sessions (
            id                INTEGER PRIMARY KEY,
            session_id        INTEGER NOT NULL REFERENCES loom_sessions(id),
            pinned_session_id INTEGER NOT NULL REFERENCES loom_sessions(id),
            created_at        TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(session_id, pinned_session_id)
        );

        CREATE TABLE IF NOT EXISTS ai_rules (
            id          INTEGER PRIMARY KEY,
            category    TEXT NOT NULL,
            rule_text   TEXT NOT NULL,
            sort_order  INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS world_summary (
            id          INTEGER PRIMARY KEY DEFAULT 1,
            content     TEXT NOT NULL DEFAULT '',
            updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS settings (
            key         TEXT PRIMARY KEY,
            value       TEXT NOT NULL,
            updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS series_beats (
            id          INTEGER PRIMARY KEY,
            book_id     INTEGER REFERENCES books(id),
            title       TEXT NOT NULL,
            description TEXT,
            beat_type   TEXT,
            position    REAL NOT NULL DEFAULT 0,
            color       TEXT,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS fts_content USING fts5(
            content_id,
            content_type,
            title,
            body,
            tokenize = 'porter ascii'
        );

        CREATE INDEX IF NOT EXISTS idx_scenes_chapter ON scenes(chapter_id);
        CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id);
        CREATE INDEX IF NOT EXISTS idx_codex_category ON codex_entries(category);
        CREATE INDEX IF NOT EXISTS idx_loom_messages_session ON loom_messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);

        CREATE TRIGGER IF NOT EXISTS fts_scenes_insert AFTER INSERT ON scenes BEGIN
            INSERT INTO fts_content(content_id, content_type, title, body)
            VALUES (NEW.id, 'scene', NEW.title, NEW.content);
        END;

        CREATE TRIGGER IF NOT EXISTS fts_scenes_update AFTER UPDATE ON scenes BEGIN
            DELETE FROM fts_content WHERE content_id = OLD.id AND content_type = 'scene';
            INSERT INTO fts_content(content_id, content_type, title, body)
            VALUES (NEW.id, 'scene', NEW.title, NEW.content);
        END;

        CREATE TRIGGER IF NOT EXISTS fts_scenes_delete AFTER DELETE ON scenes BEGIN
            DELETE FROM fts_content WHERE content_id = OLD.id AND content_type = 'scene';
        END;

        CREATE TRIGGER IF NOT EXISTS fts_codex_insert AFTER INSERT ON codex_entries BEGIN
            INSERT INTO fts_content(content_id, content_type, title, body)
            VALUES (NEW.id, 'codex', NEW.title, NEW.content);
        END;

        CREATE TRIGGER IF NOT EXISTS fts_codex_update AFTER UPDATE ON codex_entries BEGIN
            DELETE FROM fts_content WHERE content_id = OLD.id AND content_type = 'codex';
            INSERT INTO fts_content(content_id, content_type, title, body)
            VALUES (NEW.id, 'codex', NEW.title, NEW.content);
        END;

        CREATE TRIGGER IF NOT EXISTS fts_codex_delete AFTER DELETE ON codex_entries BEGIN
            DELETE FROM fts_content WHERE content_id = OLD.id AND content_type = 'codex';
        END;

        CREATE TRIGGER IF NOT EXISTS fts_notes_insert AFTER INSERT ON notes BEGIN
            INSERT INTO fts_content(content_id, content_type, title, body)
            VALUES (NEW.id, 'note', NEW.title, NEW.content);
        END;

        CREATE TRIGGER IF NOT EXISTS fts_notes_update AFTER UPDATE ON notes BEGIN
            DELETE FROM fts_content WHERE content_id = OLD.id AND content_type = 'note';
            INSERT INTO fts_content(content_id, content_type, title, body)
            VALUES (NEW.id, 'note', NEW.title, NEW.content);
        END;

        CREATE TRIGGER IF NOT EXISTS fts_notes_delete AFTER DELETE ON notes BEGIN
            DELETE FROM fts_content WHERE content_id = OLD.id AND content_type = 'note';
        END;

        CREATE TRIGGER IF NOT EXISTS fts_loom_insert AFTER INSERT ON loom_messages BEGIN
            INSERT INTO fts_content(content_id, content_type, title, body)
            VALUES (NEW.id, 'loom_message', '', NEW.content);
        END;

        CREATE TRIGGER IF NOT EXISTS fts_loom_update AFTER UPDATE ON loom_messages BEGIN
            DELETE FROM fts_content WHERE content_id = OLD.id AND content_type = 'loom_message';
            INSERT INTO fts_content(content_id, content_type, title, body)
            VALUES (NEW.id, 'loom_message', '', NEW.content);
        END;

        CREATE TRIGGER IF NOT EXISTS fts_loom_delete AFTER DELETE ON loom_messages BEGIN
            DELETE FROM fts_content WHERE content_id = OLD.id AND content_type = 'loom_message';
        END;

        INSERT OR IGNORE INTO world_summary (id, content) VALUES (1, '');

        INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'dark');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('font_size', '16');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('autosave_interval_ms', '1500');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('default_ai_provider', '');
        ",
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn initialize_schema(db_path: String) -> Result<(), String> {
    initialize_schema_at(&db_path)
}
