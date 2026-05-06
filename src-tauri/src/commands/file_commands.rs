use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;

use crate::commands::db_commands::initialize_schema_at;

#[allow(dead_code)]
pub struct ProjectSession {
    pub project_path: String,
    pub temp_dir: String,
    pub db_path: String,
}

pub struct ProjectState(pub Mutex<Option<ProjectSession>>);

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectData {
    pub title: String,
    pub path: String,
    pub project_id: i64,
    pub db_path: String,
}

fn persist_session_to_tome(session: &ProjectSession) -> Result<(), String> {
    cleanup_sqlite_sidecars(&session.db_path);
    pack_to_tome(&session.temp_dir, &session.project_path)?;
    Ok(())
}

pub fn persist_open_project_on_exit(state: &ProjectState) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(session) = guard.as_ref() {
        persist_session_to_tome(session)?;
        let _ = fs::remove_dir_all(&session.temp_dir);
    }

    *guard = None;
    Ok(())
}

fn cleanup_sqlite_sidecars(db_path: &str) {
    for suffix in ["-wal", "-shm"] {
        let sidecar_path = format!("{db_path}{suffix}");
        let sidecar = Path::new(&sidecar_path);

        if sidecar.exists() {
            let _ = fs::remove_file(sidecar);
        }
    }
}

fn pack_to_tome(temp_dir: &str, tome_path: &str) -> Result<(), String> {
    let tome_path = Path::new(tome_path);
    let temp_dir_path = Path::new(temp_dir);

    let file = fs::File::create(tome_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);

    for entry in WalkDir::new(temp_dir_path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        let relative = path
            .strip_prefix(temp_dir_path)
            .map_err(|e| e.to_string())?;

        if relative.as_os_str().is_empty() {
            continue;
        }

        let name = relative.to_string_lossy().replace('\\', "/");

        if name == "project.db-wal" || name == "project.db-shm" {
            continue;
        }

        if path.is_dir() {
            zip.add_directory(format!("{}/", name), options)
                .map_err(|e| e.to_string())?;
        } else {
            zip.start_file(name, options).map_err(|e| e.to_string())?;
            let mut f = fs::File::open(path).map_err(|e| e.to_string())?;
            let mut buf = Vec::new();
            f.read_to_end(&mut buf).map_err(|e| e.to_string())?;
            zip.write_all(&buf).map_err(|e| e.to_string())?;
        }
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

fn unpack_from_tome(tome_path: &str, temp_dir: &str) -> Result<(), String> {
    let file = fs::File::open(tome_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let out_path = PathBuf::from(temp_dir).join(entry.name());

        if entry.name().ends_with('/') {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut out_file = fs::File::create(&out_path).map_err(|e| e.to_string())?;
            let mut buf = Vec::new();
            entry.read_to_end(&mut buf).map_err(|e| e.to_string())?;
            out_file.write_all(&buf).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

fn make_temp_dir() -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let temp = std::env::temp_dir().join(format!("tome_{}", id));
    fs::create_dir_all(&temp).map_err(|e| e.to_string())?;
    Ok(temp.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn create_project(
    path: String,
    title: String,
    state: State<'_, ProjectState>,
) -> Result<ProjectData, String> {
    let temp_dir = make_temp_dir()?;
    let db_path = format!("{}/project.db", temp_dir);
    let assets_dir = format!("{}/assets", temp_dir);

    fs::create_dir_all(&assets_dir).map_err(|e| e.to_string())?;

    initialize_schema_at(&db_path)?;

    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO projects (title) VALUES (?1)",
        rusqlite::params![title],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO books (project_id, title, sort_order) VALUES (1, 'Book 1', 0)",
        [],
    )
    .map_err(|e| e.to_string())?;

    drop(conn);

    cleanup_sqlite_sidecars(&db_path);

    pack_to_tome(&temp_dir, &path)?;

    let mut session = state.0.lock().map_err(|e| e.to_string())?;
    *session = Some(ProjectSession {
        project_path: path.clone(),
        temp_dir,
        db_path: db_path.clone(),
    });

    Ok(ProjectData {
        title,
        path,
        project_id: 1,
        db_path,
    })
}

#[tauri::command]
pub async fn open_project(
    path: String,
    state: State<'_, ProjectState>,
) -> Result<ProjectData, String> {
    let temp_dir = make_temp_dir()?;
    let db_path = format!("{}/project.db", temp_dir);

    unpack_from_tome(&path, &temp_dir)?;
    cleanup_sqlite_sidecars(&db_path);

    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    let (project_id, title): (i64, String) = conn
        .query_row(
            "SELECT id, title FROM projects LIMIT 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;
    drop(conn);

    let mut session = state.0.lock().map_err(|e| e.to_string())?;
    *session = Some(ProjectSession {
        project_path: path.clone(),
        temp_dir,
        db_path: db_path.clone(),
    });

    Ok(ProjectData {
        title,
        path,
        project_id,
        db_path,
    })
}

#[tauri::command]
pub async fn save_project(state: State<'_, ProjectState>) -> Result<(), String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let session = guard.as_ref().ok_or("No project is open")?;
    persist_session_to_tome(session)?;
    Ok(())
}

#[tauri::command]
pub async fn close_project(state: State<'_, ProjectState>) -> Result<(), String> {
    persist_open_project_on_exit(&state)
}
