mod commands;

use commands::file_commands::{
    close_project, create_project, open_project, save_project, ProjectState,
};
use commands::db_commands::initialize_schema;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(ProjectState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            create_project,
            open_project,
            save_project,
            close_project,
            initialize_schema,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
