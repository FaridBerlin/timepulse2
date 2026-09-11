// All the clock/stopwatch/timer logic lives in the frontend (src/app.js).
// The Rust side is intentionally just the Tauri shell for this prototype -
// window transparency/decorations are configured in tauri.conf.json.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
