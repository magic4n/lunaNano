// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "linux")]
            {
                // In Wayland, the shell window can attach as a layer surface or fullscreen window
                println!("LunaNano Shell initializing on Wayland...");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running LunaNano shell application");
}
