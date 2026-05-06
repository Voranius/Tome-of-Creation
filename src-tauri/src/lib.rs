mod commands;

use commands::file_commands::{
    close_project, create_project, open_project, persist_open_project_on_exit, save_project,
    ProjectState,
};
use commands::db_commands::initialize_schema;
use commands::font_commands::get_system_fonts;
use std::sync::Mutex;
use tauri::{plugin::Builder as PluginBuilder, Manager, RunEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(
            PluginBuilder::<tauri::Wry, ()>::new("project-persistence")
                .on_event(|app, event| {
                    if let RunEvent::Exit = event {
                        let state = app.state::<ProjectState>();
                        if let Err(error) = persist_open_project_on_exit(&state) {
                            eprintln!(
                                "[project-debug] persist_open_project_on_exit failed during backend exit: {}",
                                error
                            );
                        }
                    }
                })
                .build(),
        )
        .manage(ProjectState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            create_project,
            open_project,
            save_project,
            close_project,
            initialize_schema,
            get_system_fonts,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
