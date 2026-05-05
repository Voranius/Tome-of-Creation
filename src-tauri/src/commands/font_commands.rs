use font_kit::source::SystemSource;

#[tauri::command]
pub fn get_system_fonts() -> Result<Vec<String>, String> {
    let source = SystemSource::new();
    let mut families = source.all_families().map_err(|e| e.to_string())?;
    families.sort_unstable_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    families.dedup();
    Ok(families)
}
