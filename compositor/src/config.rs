use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppearanceSettings {
    #[serde(default = "default_wallpaper")]
    pub wallpaper: String,
    #[serde(default = "default_wallpaper_mode")]
    pub wallpaper_mode: String,
    #[serde(default = "default_theme_mode")]
    pub theme_mode: String,
    #[serde(default = "default_true")]
    pub dynamic_palette: bool,
    #[serde(default = "default_color_scheme")]
    pub color_scheme: String,
    #[serde(default = "default_custom_accent")]
    pub custom_accent: String,
    #[serde(default = "default_font_family")]
    pub font_family: String,
    #[serde(default = "default_one")]
    pub ui_scale: f32,
    #[serde(default = "default_corner_radius")]
    pub corner_radius: u32,
    #[serde(default = "default_true")]
    pub animations: bool,
    #[serde(default = "default_one")]
    pub animation_speed: f32,
    #[serde(default = "default_false")]
    pub reduced_motion: bool,
    #[serde(default = "default_true")]
    pub ui_sounds: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockSettings {
    #[serde(default = "default_dock_size")]
    pub icon_size: u32,
    #[serde(default = "default_false")]
    pub auto_hide: bool,
    #[serde(default = "default_dock_pos")]
    pub position: String,
    #[serde(default = "default_dock_mag")]
    pub magnification_power: f32,
    #[serde(default = "default_true")]
    pub show_separators: bool,
    #[serde(default = "default_pinned_apps")]
    pub pinned_apps: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspacesSettings {
    #[serde(default = "default_ws_orientation")]
    pub orientation: String,
    #[serde(default = "default_true")]
    pub swipe_gesture: bool,
    #[serde(default = "default_ws_count")]
    pub count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppsSettings {
    #[serde(default = "default_browser")]
    pub default_browser: String,
    #[serde(default = "default_terminal")]
    pub default_terminal: String,
    #[serde(default = "default_editor")]
    pub default_editor: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalSettings {
    #[serde(default = "default_term_font")]
    pub font_family: String,
    #[serde(default = "default_term_size")]
    pub font_size: u32,
    #[serde(default = "default_term_theme")]
    pub theme: String,
    #[serde(default = "default_term_trans")]
    pub transparency: f32,
    #[serde(default = "default_term_cursor")]
    pub cursor_style: String,
    #[serde(default = "default_true")]
    pub cursor_blink: bool,
    #[serde(default = "default_term_hist")]
    pub history_size: u32,
    #[serde(default = "default_term_shell")]
    pub shell: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SoundSettings {
    #[serde(default = "default_vol")]
    pub master_volume: u32,
    #[serde(default = "default_false")]
    pub master_mute: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateTimeSettings {
    #[serde(default = "default_true")]
    pub format24h: bool,
    #[serde(default = "default_false")]
    pub show_seconds: bool,
    #[serde(default = "default_tz")]
    pub timezone: String,
    #[serde(default = "default_true")]
    pub use_ntp: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessibilitySettings {
    #[serde(default = "default_false")]
    pub large_text: bool,
    #[serde(default = "default_false")]
    pub high_contrast: bool,
    #[serde(default = "default_false")]
    pub on_screen_keyboard: bool,
    #[serde(default = "default_false")]
    pub screen_reader: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LunaSettings {
    pub appearance: AppearanceSettings,
    pub dock: DockSettings,
    pub workspaces: WorkspacesSettings,
    pub apps: AppsSettings,
    pub terminal: TerminalSettings,
    pub sound: SoundSettings,
    pub date_time: DateTimeSettings,
    pub accessibility: AccessibilitySettings,
}

fn default_wallpaper() -> String { "linear-gradient(135deg, #0d0f14 0%, #151922 50%, #08090d 100%)".into() }
fn default_wallpaper_mode() -> String { "static".into() }
fn default_theme_mode() -> String { "dark".into() }
fn default_color_scheme() -> String { "tonalSpot".into() }
fn default_custom_accent() -> String { "#6750A4".into() }
fn default_font_family() -> String { "Montserrat".into() }
fn default_dock_pos() -> String { "bottom".into() }
fn default_ws_orientation() -> String { "vertical".into() }
fn default_browser() -> String { "chromium".into() }
fn default_terminal() -> String { "terminal".into() }
fn default_editor() -> String { "notepad".into() }
fn default_term_font() -> String { "JetBrains Mono".into() }
fn default_term_theme() -> String { "catppuccin-mocha".into() }
fn default_term_cursor() -> String { "bar".into() }
fn default_term_shell() -> String { "/bin/bash".into() }
fn default_tz() -> String { "UTC".into() }
fn default_true() -> bool { true }
fn default_false() -> bool { false }
fn default_one() -> f32 { 1.0 }
fn default_corner_radius() -> u32 { 16 }
fn default_dock_size() -> u32 { 52 }
fn default_dock_mag() -> f32 { 1.35 }
fn default_ws_count() -> u32 { 4 }
fn default_term_size() -> u32 { 14 }
fn default_term_trans() -> f32 { 0.95 }
fn default_term_hist() -> u32 { 5000 }
fn default_vol() -> u32 { 75 }
fn default_pinned_apps() -> Vec<String> {
    vec![
        "launcher".into(),
        "terminal".into(),
        "explorer".into(),
        "notepad".into(),
        "calculator".into(),
        "chromium".into(),
        "settings".into(),
    ]
}

impl Default for LunaSettings {
    fn default() -> Self {
        Self {
            appearance: AppearanceSettings {
                wallpaper: default_wallpaper(),
                wallpaper_mode: default_wallpaper_mode(),
                theme_mode: default_theme_mode(),
                dynamic_palette: true,
                color_scheme: default_color_scheme(),
                custom_accent: default_custom_accent(),
                font_family: default_font_family(),
                ui_scale: 1.0,
                corner_radius: 16,
                animations: true,
                animation_speed: 1.0,
                reduced_motion: false,
                ui_sounds: true,
            },
            dock: DockSettings {
                icon_size: 52,
                auto_hide: false,
                position: default_dock_pos(),
                magnification_power: 1.35,
                show_separators: true,
                pinned_apps: default_pinned_apps(),
            },
            workspaces: WorkspacesSettings {
                orientation: default_ws_orientation(),
                swipe_gesture: true,
                count: 4,
            },
            apps: AppsSettings {
                default_browser: default_browser(),
                default_terminal: default_terminal(),
                default_editor: default_editor(),
            },
            terminal: TerminalSettings {
                font_family: default_term_font(),
                font_size: 14,
                theme: default_term_theme(),
                transparency: 0.95,
                cursor_style: default_term_cursor(),
                cursor_blink: true,
                history_size: 5000,
                shell: default_term_shell(),
            },
            sound: SoundSettings {
                master_volume: 75,
                master_mute: false,
            },
            date_time: DateTimeSettings {
                format24h: true,
                show_seconds: false,
                timezone: default_tz(),
                use_ntp: true,
            },
            accessibility: AccessibilitySettings {
                large_text: false,
                high_contrast: false,
                on_screen_keyboard: false,
                screen_reader: false,
            },
        }
    }
}

pub fn get_settings_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    PathBuf::from(home).join(".config/lunanano/settings.json")
}

pub fn load_settings() -> LunaSettings {
    let path = get_settings_path();
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(settings) = serde_json::from_str::<LunaSettings>(&content) {
            return settings;
        }
    }

    let default = LunaSettings::default();
    let _ = save_settings(&default);
    default
}

pub fn save_settings(settings: &LunaSettings) -> Result<()> {
    let path = get_settings_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_string_pretty(settings)?;
    fs::write(path, json)?;
    Ok(())
}
