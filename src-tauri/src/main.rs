#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{json, Value};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, State, WindowEvent,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt as AutostartManagerExt};

const APP_NAME: &str = "下班工资计数器";
const WIDGET_MARGIN: f64 = 14.0;

#[derive(Clone, Copy)]
struct StyleSpec {
    id: &'static str,
    menu_label: &'static str,
    default_width: f64,
    min_width: f64,
    max_width: f64,
    aspect: f64, // height / width
}

const STYLE_SPECS: &[StyleSpec] = &[
    StyleSpec {
        id: "standard",
        menu_label: "完整标准版 · 全量数据与趋势图",
        default_width: 520.0,
        min_width: 320.0,
        max_width: 1060.0,
        aspect: 1068.0 / 1060.0,
    },
    StyleSpec {
        id: "balanced",
        menu_label: "均衡双卡版 · 倒计时 + 工资 + 进度环",
        default_width: 460.0,
        min_width: 320.0,
        max_width: 860.0,
        aspect: 356.0 / 520.0,
    },
    StyleSpec {
        id: "compact",
        menu_label: "精致紧凑版 · 倒计时 + 今日已赚",
        default_width: 380.0,
        min_width: 280.0,
        max_width: 680.0,
        aspect: 214.0 / 460.0,
    },
    StyleSpec {
        id: "minimal",
        menu_label: "极简倒计时 · 仅下班倒计时一栏",
        default_width: 300.0,
        min_width: 220.0,
        max_width: 560.0,
        aspect: 128.0 / 360.0,
    },
];

fn style_spec(id: &str) -> &'static StyleSpec {
    STYLE_SPECS
        .iter()
        .find(|s| s.id == id)
        .unwrap_or(&STYLE_SPECS[0])
}

fn valid_width_for(style_id: &str, width: f64) -> f64 {
    let spec = style_spec(style_id);
    if width.is_finite() {
        width.clamp(spec.min_width, spec.max_width).round()
    } else {
        spec.default_width
    }
}

struct AppState {
    config_path: PathBuf,
    widget_state_path: PathBuf,
    widget_enabled: Mutex<bool>,
    widget_style: Mutex<String>,
    widget_widths: Mutex<HashMap<String, f64>>,
    always_on_top: Mutex<bool>,
    mac_menu_bar_countdown: Mutex<bool>,
    mode: Mutex<String>,
}

#[cfg(target_os = "windows")]
#[allow(non_camel_case_types)]
mod desktop_win {
    use std::ffi::c_void;
    use std::sync::atomic::{AtomicBool, Ordering};
    use tauri::WebviewWindow;

    type HWND = isize;
    type BOOL = i32;
    type UINT = u32;
    type WPARAM = usize;
    type LPARAM = isize;
    type LRESULT = isize;
    type LONG_PTR = isize;
    type UINT_PTR = usize;
    type DWORD_PTR = usize;

    const GWL_STYLE: i32 = -16;
    const GWL_EXSTYLE: i32 = -20;
    const GWLP_HWNDPARENT: i32 = -8;
    const WS_MINIMIZEBOX: isize = 0x0002_0000;
    const WS_MAXIMIZEBOX: isize = 0x0001_0000;
    const WS_EX_TOOLWINDOW: isize = 0x0000_0080;
    const WS_EX_APPWINDOW: isize = 0x0004_0000;
    const HWND_TOPMOST: HWND = -1;
    const HWND_NOTOPMOST: HWND = -2;
    const SWP_NOSIZE: u32 = 0x0001;
    const SWP_NOMOVE: u32 = 0x0002;
    const SWP_NOACTIVATE: u32 = 0x0010;
    const SWP_FRAMECHANGED: u32 = 0x0020;
    const SW_SHOWNOACTIVATE: i32 = 4;
    const WM_SYSCOMMAND: u32 = 0x0112;
    const SC_MINIMIZE: usize = 0xF020;
    const DWMWA_DISALLOW_PEEK: u32 = 11;
    const DWMWA_EXCLUDED_FROM_PEEK: u32 = 12;
    const SUBCLASS_ID: UINT_PTR = 0x5343_5747;

    static SUBCLASS_INSTALLED: AtomicBool = AtomicBool::new(false);

    #[link(name = "user32")]
    extern "system" {
        fn FindWindowW(class_name: *const u16, window_name: *const u16) -> HWND;
        fn FindWindowExW(
            parent: HWND,
            child_after: HWND,
            class_name: *const u16,
            window_name: *const u16,
        ) -> HWND;
        fn EnumWindows(
            enum_func: unsafe extern "system" fn(HWND, LPARAM) -> BOOL,
            lparam: LPARAM,
        ) -> BOOL;
        fn GetWindowLongPtrW(hwnd: HWND, index: i32) -> LONG_PTR;
        fn SetWindowLongPtrW(hwnd: HWND, index: i32, new_long: LONG_PTR) -> LONG_PTR;
        fn SetWindowPos(
            hwnd: HWND,
            insert_after: HWND,
            x: i32,
            y: i32,
            cx: i32,
            cy: i32,
            flags: u32,
        ) -> BOOL;
        fn IsIconic(hwnd: HWND) -> BOOL;
        fn ShowWindow(hwnd: HWND, cmd: i32) -> BOOL;
    }

    #[link(name = "dwmapi")]
    extern "system" {
        fn DwmSetWindowAttribute(hwnd: HWND, attr: u32, value: *const c_void, size: u32) -> i32;
    }

    #[link(name = "comctl32")]
    extern "system" {
        fn SetWindowSubclass(
            hwnd: HWND,
            proc: unsafe extern "system" fn(
                HWND,
                UINT,
                WPARAM,
                LPARAM,
                UINT_PTR,
                DWORD_PTR,
            ) -> LRESULT,
            uid: UINT_PTR,
            ref_data: DWORD_PTR,
        ) -> BOOL;
        fn DefSubclassProc(hwnd: HWND, msg: UINT, wparam: WPARAM, lparam: LPARAM) -> LRESULT;
    }

    fn wide_null(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    unsafe extern "system" fn enum_find_defview_host(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let defview_cls = wide_null("SHELLDLL_DefView");
        let defview = FindWindowExW(hwnd, 0, defview_cls.as_ptr(), std::ptr::null());
        if defview != 0 {
            let out = lparam as *mut HWND;
            if !out.is_null() {
                *out = hwnd;
            }
            return 0;
        }
        1
    }

    unsafe fn find_desktop_shell_owner() -> HWND {
        let progman_cls = wide_null("Progman");
        let defview_cls = wide_null("SHELLDLL_DefView");
        let progman = FindWindowW(progman_cls.as_ptr(), std::ptr::null());
        if progman != 0 {
            if FindWindowExW(progman, 0, defview_cls.as_ptr(), std::ptr::null()) != 0 {
                return progman;
            }
        }
        let mut host: HWND = 0;
        EnumWindows(enum_find_defview_host, (&mut host as *mut HWND) as LPARAM);
        if host != 0 {
            host
        } else {
            progman
        }
    }

    unsafe extern "system" fn widget_subclass_proc(
        hwnd: HWND,
        msg: UINT,
        wparam: WPARAM,
        lparam: LPARAM,
        _uid: UINT_PTR,
        _ref_data: DWORD_PTR,
    ) -> LRESULT {
        if msg == WM_SYSCOMMAND && (wparam & 0xFFF0) == SC_MINIMIZE {
            return 0;
        }
        DefSubclassProc(hwnd, msg, wparam, lparam)
    }

    pub fn apply(window: &WebviewWindow, always_on_top: bool) {
        let Ok(raw) = window.hwnd() else { return };
        let hwnd = raw.0 as HWND;
        if hwnd == 0 {
            return;
        }
        unsafe {
            if !SUBCLASS_INSTALLED.swap(true, Ordering::SeqCst) {
                let _ = SetWindowSubclass(hwnd, widget_subclass_proc, SUBCLASS_ID, 0);
            }

            let style = GetWindowLongPtrW(hwnd, GWL_STYLE);
            let new_style = style & !(WS_MINIMIZEBOX | WS_MAXIMIZEBOX);
            if new_style != style {
                SetWindowLongPtrW(hwnd, GWL_STYLE, new_style);
            }

            let ex = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
            let new_ex = (ex | WS_EX_TOOLWINDOW) & !WS_EX_APPWINDOW;
            if new_ex != ex {
                SetWindowLongPtrW(hwnd, GWL_EXSTYLE, new_ex);
            }

            let one: u32 = 1;
            let _ = DwmSetWindowAttribute(
                hwnd,
                DWMWA_DISALLOW_PEEK,
                (&one as *const u32) as *const c_void,
                std::mem::size_of::<u32>() as u32,
            );
            let _ = DwmSetWindowAttribute(
                hwnd,
                DWMWA_EXCLUDED_FROM_PEEK,
                (&one as *const u32) as *const c_void,
                std::mem::size_of::<u32>() as u32,
            );

            let owner = find_desktop_shell_owner();
            if owner != 0 {
                SetWindowLongPtrW(hwnd, GWLP_HWNDPARENT, owner);
            }

            if IsIconic(hwnd) != 0 {
                ShowWindow(hwnd, SW_SHOWNOACTIVATE);
            }

            let z = if always_on_top {
                HWND_TOPMOST
            } else {
                HWND_NOTOPMOST
            };
            SetWindowPos(
                hwnd,
                z,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_FRAMECHANGED,
            );
        }
    }
}

#[cfg(target_os = "macos")]
mod desktop_macos {
    use std::ffi::{c_char, c_void};
    use tauri::WebviewWindow;

    const K_CG_FLOATING_WINDOW_LEVEL_KEY: i32 = 5;
    const K_CG_DESKTOP_ICON_WINDOW_LEVEL_KEY: i32 = 18;
    const NS_WINDOW_COLLECTION_BEHAVIOR_CAN_JOIN_ALL_SPACES: usize = 1 << 0;
    const NS_WINDOW_COLLECTION_BEHAVIOR_STATIONARY: usize = 1 << 4;
    const NS_WINDOW_COLLECTION_BEHAVIOR_IGNORES_CYCLE: usize = 1 << 6;

    #[link(name = "objc")]
    extern "C" {
        fn sel_registerName(name: *const c_char) -> *const c_void;
        fn objc_msgSend();
    }

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGWindowLevelForKey(key: i32) -> i32;
    }

    pub fn apply(window: &WebviewWindow, always_on_top: bool) {
        let Ok(ns_window) = window.ns_window() else {
            return;
        };
        if ns_window.is_null() {
            return;
        }
        unsafe {
            let msg_isize: unsafe extern "C" fn(*mut c_void, *const c_void, isize) =
                std::mem::transmute(objc_msgSend as *const c_void);
            let msg_usize: unsafe extern "C" fn(*mut c_void, *const c_void, usize) =
                std::mem::transmute(objc_msgSend as *const c_void);
            let msg_bool: unsafe extern "C" fn(*mut c_void, *const c_void, i8) =
                std::mem::transmute(objc_msgSend as *const c_void);

            let sel_set_level = sel_registerName(c"setLevel:".as_ptr());
            let sel_set_behavior = sel_registerName(c"setCollectionBehavior:".as_ptr());
            let sel_set_hides = sel_registerName(c"setHidesOnDeactivate:".as_ptr());
            let sel_set_can_hide = sel_registerName(c"setCanHide:".as_ptr());
            let sel_set_movable = sel_registerName(c"setMovable:".as_ptr());

            let level = if always_on_top {
                CGWindowLevelForKey(K_CG_FLOATING_WINDOW_LEVEL_KEY) as isize
            } else {
                (CGWindowLevelForKey(K_CG_DESKTOP_ICON_WINDOW_LEVEL_KEY) + 1) as isize
            };
            msg_isize(ns_window, sel_set_level, level);

            let behavior = NS_WINDOW_COLLECTION_BEHAVIOR_CAN_JOIN_ALL_SPACES
                | NS_WINDOW_COLLECTION_BEHAVIOR_STATIONARY
                | NS_WINDOW_COLLECTION_BEHAVIOR_IGNORES_CYCLE;
            msg_usize(ns_window, sel_set_behavior, behavior);

            msg_bool(ns_window, sel_set_hides, 0);
            msg_bool(ns_window, sel_set_can_hide, 0);
            msg_bool(ns_window, sel_set_movable, 0);
        }
    }
}

fn apply_desktop_widget_behavior(window: &tauri::WebviewWindow, always_on_top: bool) {
    #[cfg(target_os = "windows")]
    desktop_win::apply(window, always_on_top);
    #[cfg(target_os = "macos")]
    desktop_macos::apply(window, always_on_top);
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = (window, always_on_top);
    }
}

fn atomic_write(path: &Path, data: &[u8]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建配置目录失败：{e}"))?;
    }
    let temp = path.with_extension("tmp");
    let backup = path.with_extension("bak");
    fs::write(&temp, data).map_err(|e| format!("写入临时文件失败：{e}"))?;
    if backup.exists() {
        fs::remove_file(&backup).map_err(|e| format!("清理旧备份失败：{e}"))?;
    }
    let had_old = path.exists();
    if had_old {
        fs::rename(path, &backup).map_err(|e| format!("备份原配置失败：{e}"))?;
    }
    if let Err(error) = fs::rename(&temp, path) {
        if had_old {
            let _ = fs::rename(&backup, path);
        }
        let _ = fs::remove_file(&temp);
        return Err(format!("保存配置失败：{error}"));
    }
    if backup.exists() {
        let _ = fs::remove_file(&backup);
    }
    Ok(())
}

fn legacy_config_candidates() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    #[cfg(target_os = "windows")]
    if let Some(base) = std::env::var_os("APPDATA") {
        for name in [APP_NAME, "salary-counter-desktop", "com.joeve.salarycounter"] {
            paths.push(PathBuf::from(&base).join(name).join("config.json"));
        }
    }
    #[cfg(target_os = "macos")]
    if let Some(home) = std::env::var_os("HOME") {
        for name in [APP_NAME, "salary-counter-desktop", "com.joeve.salarycounter"] {
            paths.push(
                PathBuf::from(&home)
                    .join("Library/Application Support")
                    .join(name)
                    .join("config.json"),
            );
        }
    }
    paths
}

fn initialize_state(app: &tauri::AppHandle) -> Result<AppState, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("定位应用数据目录失败：{e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("创建应用数据目录失败：{e}"))?;
    let config_path = dir.join("config.json");
    if !config_path.exists() {
        for old in legacy_config_candidates() {
            if old.is_file() && fs::copy(&old, &config_path).is_ok() {
                break;
            }
        }
    }
    let widget_state_path = dir.join("desktop-widget.json");
    let prefs = fs::read_to_string(&widget_state_path)
        .ok()
        .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
        .unwrap_or_else(|| json!({}));
    let widget_enabled = prefs
        .get("widgetEnabled")
        .and_then(Value::as_bool)
        .unwrap_or(true);
    let widget_style = style_spec(
        prefs
            .get("widgetStyle")
            .and_then(Value::as_str)
            .unwrap_or("standard"),
    )
    .id
    .to_string();

    let mut widget_widths = HashMap::new();
    for spec in STYLE_SPECS {
        widget_widths.insert(spec.id.to_string(), spec.default_width);
    }
    if let Some(map) = prefs.get("widgetWidths").and_then(Value::as_object) {
        for spec in STYLE_SPECS {
            if let Some(v) = map.get(spec.id).and_then(Value::as_f64) {
                widget_widths.insert(spec.id.to_string(), valid_width_for(spec.id, v));
            }
        }
    } else if let Some(legacy_w) = prefs.get("widgetWidth").and_then(Value::as_f64) {
        widget_widths.insert(
            widget_style.clone(),
            valid_width_for(&widget_style, legacy_w),
        );
    }

    let always_on_top = prefs
        .get("alwaysOnTop")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let mac_menu_bar_countdown = prefs
        .get("macMenuBarCountdown")
        .and_then(Value::as_bool)
        .unwrap_or(true);
    Ok(AppState {
        config_path,
        widget_state_path,
        widget_enabled: Mutex::new(widget_enabled),
        widget_style: Mutex::new(widget_style),
        widget_widths: Mutex::new(widget_widths),
        always_on_top: Mutex::new(always_on_top),
        mac_menu_bar_countdown: Mutex::new(mac_menu_bar_countdown),
        mode: Mutex::new("widget".to_string()),
    })
}

#[cfg(target_os = "macos")]
fn apply_tray_title(app: &AppHandle, title: Option<&str>) {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let _ = tray.set_title(title);
    }
}

#[cfg(not(target_os = "macos"))]
fn apply_tray_title(_app: &AppHandle, _title: Option<&str>) {}

fn active_style_and_width(state: &AppState) -> Result<(&'static StyleSpec, f64), String> {
    let style_id = state.widget_style.lock().map_err(|e| e.to_string())?.clone();
    let spec = style_spec(&style_id);
    let widths = state.widget_widths.lock().map_err(|e| e.to_string())?;
    let w = widths
        .get(spec.id)
        .copied()
        .unwrap_or(spec.default_width);
    Ok((spec, valid_width_for(spec.id, w)))
}

fn prefs_json(state: &AppState) -> Result<Value, String> {
    let (spec, width) = active_style_and_width(state)?;
    let widths = state.widget_widths.lock().map_err(|e| e.to_string())?.clone();
    let platform = if cfg!(target_os = "macos") {
        "macos"
    } else {
        "windows"
    };
    Ok(json!({
        "platform": platform,
        "widgetEnabled": *state.widget_enabled.lock().map_err(|e| e.to_string())?,
        "widgetStyle": spec.id,
        "widgetWidth": width,
        "widgetMinWidth": spec.min_width,
        "widgetMaxWidth": spec.max_width,
        "widgetWidths": widths,
        "alwaysOnTop": *state.always_on_top.lock().map_err(|e| e.to_string())?,
        "macMenuBarCountdown": *state.mac_menu_bar_countdown.lock().map_err(|e| e.to_string())?
    }))
}

fn persist_prefs(state: &AppState) -> Result<(), String> {
    atomic_write(
        &state.widget_state_path,
        prefs_json(state)?.to_string().as_bytes(),
    )
}

fn persist_widget_enabled(state: &AppState, enabled: bool) -> Result<(), String> {
    *state.widget_enabled.lock().map_err(|e| e.to_string())? = enabled;
    persist_prefs(state)
}

fn notify_prefs(app: &AppHandle) {
    if let Ok(prefs) = prefs_json(&app.state::<AppState>()) {
        let _ = app.emit("desktop-preferences", prefs);
    }
}

fn set_mode(state: &AppState, mode: &str) -> Result<(), String> {
    *state.mode.lock().map_err(|e| e.to_string())? = mode.to_string();
    Ok(())
}

fn emit_mode(window: &tauri::WebviewWindow, mode: &str) {
    let _ = window.emit("window-mode", mode.to_string());
}

fn usable_rect(app: &AppHandle) -> Result<(i32, i32, u32, u32, f64), String> {
    let monitor = app
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("未找到主显示器")?;
    let area = monitor.work_area();
    let pos = monitor.position();
    let size = monitor.size();
    let left = area.position.x.max(pos.x);
    let top = area.position.y.max(pos.y);
    let right =
        (area.position.x as i64 + area.size.width as i64).min(pos.x as i64 + size.width as i64);
    let bottom =
        (area.position.y as i64 + area.size.height as i64).min(pos.y as i64 + size.height as i64);
    if right <= left as i64 || bottom <= top as i64 {
        return Ok((pos.x, pos.y, size.width, size.height, monitor.scale_factor()));
    }
    Ok((
        left,
        top,
        (right - left as i64) as u32,
        (bottom - top as i64) as u32,
        monitor.scale_factor(),
    ))
}

fn fit_panel_with_aspect(
    requested: f64,
    aspect: f64,
    width: u32,
    height: u32,
    scale: f64,
    margin: u32,
) -> (u32, u32) {
    let available_w = width.saturating_sub(margin.saturating_mul(2)).max(1) as f64;
    let available_h = height.saturating_sub(margin.saturating_mul(2)).max(1) as f64;
    let w = (requested * scale)
        .min(available_w)
        .min(available_h / aspect)
        .max(1.0)
        .floor() as u32;
    let h = ((w as f64 * aspect).round() as u32)
        .max(1)
        .min(available_h as u32);
    (w, h)
}

fn position_widget(app: &AppHandle, window: &tauri::WebviewWindow) -> Result<(), String> {
    let (x, y, w, h, scale) = usable_rect(app)?;
    let margin = (WIDGET_MARGIN * scale).round() as u32;
    let (spec, requested) = active_style_and_width(&app.state::<AppState>())?;
    let (pw, ph) = fit_panel_with_aspect(requested, spec.aspect, w, h, scale, margin);
    let current = window.inner_size().map_err(|e| e.to_string())?;
    if current.width.abs_diff(pw) > 1 || current.height.abs_diff(ph) > 1 {
        window
            .set_size(PhysicalSize::new(pw, ph))
            .map_err(|e| e.to_string())?;
    }
    let px = x + w.saturating_sub(pw).saturating_sub(margin) as i32;
    let py = y + margin.min(h.saturating_sub(ph)) as i32;
    let current = window.outer_position().map_err(|e| e.to_string())?;
    if current.x.abs_diff(px) > 1 || current.y.abs_diff(py) > 1 {
        window
            .set_position(PhysicalPosition::new(px, py))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn show_settings_internal(app: &AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("settings").ok_or("设置窗口不存在")?;
    let (x, y, w, h, scale) = usable_rect(app)?;
    let margin = (20.0 * scale).round() as u32;
    let pw = ((560.0 * scale).round() as u32).min(w.saturating_sub(margin * 2).max(1));
    let ph = ((640.0 * scale).round() as u32).min(h.saturating_sub(margin * 2).max(1));
    window
        .set_size(PhysicalSize::new(pw, ph))
        .map_err(|e| e.to_string())?;
    window
        .set_always_on_top(
            *app.state::<AppState>()
                .always_on_top
                .lock()
                .map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
    let _ = window.emit("settings-opened", ());
    window.show().map_err(|e| e.to_string())?;
    let outer = window.outer_size().map_err(|e| e.to_string())?;
    window
        .set_position(PhysicalPosition::new(
            x + w.saturating_sub(outer.width) as i32 / 2,
            y + h.saturating_sub(outer.height) as i32 / 2,
        ))
        .map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

fn show_widget_internal(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    persist_widget_enabled(&state, true)?;
    set_mode(&state, "widget")?;
    let always_on_top = *state.always_on_top.lock().map_err(|e| e.to_string())?;
    let window = app
        .get_webview_window("main")
        .ok_or("桌面组件窗口不存在")?;
    window
        .set_always_on_top(always_on_top)
        .map_err(|e| e.to_string())?;
    window.set_resizable(false).map_err(|e| e.to_string())?;
    #[cfg(not(target_os = "macos"))]
    window.set_skip_taskbar(true).map_err(|e| e.to_string())?;
    emit_mode(&window, "widget");
    position_widget(app, &window)?;
    window.show().map_err(|e| e.to_string())?;
    position_widget(app, &window)?;
    apply_desktop_widget_behavior(&window, always_on_top);
    notify_prefs(app);
    Ok(())
}

fn hide_widget_internal(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    set_mode(&state, "hidden")?;
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    notify_prefs(app);
    Ok(())
}

fn remove_widget_internal(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    persist_widget_enabled(&state, false)?;
    set_mode(&state, "hidden")?;
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    notify_prefs(app);
    Ok(())
}

fn set_widget_enabled_internal(app: &AppHandle, enabled: bool) -> Result<(), String> {
    if enabled {
        show_widget_internal(app)
    } else {
        remove_widget_internal(app)
    }
}

fn set_widget_style_internal(app: &AppHandle, style_id: &str) -> Result<Value, String> {
    let spec = style_spec(style_id);
    let state = app.state::<AppState>();
    *state.widget_style.lock().map_err(|e| e.to_string())? = spec.id.to_string();
    persist_prefs(&state)?;
    let visible = state.mode.lock().map_err(|e| e.to_string())?.as_str() == "widget";
    let pinned = *state.always_on_top.lock().map_err(|e| e.to_string())?;
    if visible {
        if let Some(window) = app.get_webview_window("main") {
            position_widget(app, &window)?;
            apply_desktop_widget_behavior(&window, pinned);
        }
    }
    notify_prefs(app);
    prefs_json(&state)
}

fn set_always_on_top_internal(app: &AppHandle, value: bool) -> Result<(), String> {
    let state = app.state::<AppState>();
    *state.always_on_top.lock().map_err(|e| e.to_string())? = value;
    persist_prefs(&state)?;
    if let Some(window) = app.get_webview_window("main") {
        window.set_always_on_top(value).map_err(|e| e.to_string())?;
        apply_desktop_widget_behavior(&window, value);
    }
    if let Some(window) = app.get_webview_window("settings") {
        window.set_always_on_top(value).map_err(|e| e.to_string())?;
    }
    notify_prefs(app);
    Ok(())
}

fn set_mac_menu_bar_countdown_internal(app: &AppHandle, enabled: bool) -> Result<(), String> {
    let state = app.state::<AppState>();
    *state
        .mac_menu_bar_countdown
        .lock()
        .map_err(|e| e.to_string())? = enabled;
    persist_prefs(&state)?;
    if !enabled {
        apply_tray_title(app, None);
    }
    notify_prefs(app);
    Ok(())
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_widget = MenuItem::with_id(app, "tray_show_widget", "显示桌面小组件", true, None::<&str>)?;
    let hide_widget = MenuItem::with_id(app, "tray_hide_widget", "隐藏桌面小组件", true, None::<&str>)?;

    let st_standard = MenuItem::with_id(app, "tray_style_standard", STYLE_SPECS[0].menu_label, true, None::<&str>)?;
    let st_balanced = MenuItem::with_id(app, "tray_style_balanced", STYLE_SPECS[1].menu_label, true, None::<&str>)?;
    let st_compact = MenuItem::with_id(app, "tray_style_compact", STYLE_SPECS[2].menu_label, true, None::<&str>)?;
    let st_minimal = MenuItem::with_id(app, "tray_style_minimal", STYLE_SPECS[3].menu_label, true, None::<&str>)?;
    let style_menu = Submenu::with_items(
        app,
        "切换组件样式",
        true,
        &[&st_standard, &st_balanced, &st_compact, &st_minimal],
    )?;

    #[cfg(target_os = "macos")]
    let mac_menubar_item = MenuItem::with_id(
        app,
        "tray_toggle_menubar",
        "切换状态栏倒计时显示",
        true,
        None::<&str>,
    )?;

    let settings = MenuItem::with_id(app, "tray_settings", "个性化设置 / 组件大小", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "tray_quit", "退出程序", true, None::<&str>)?;
    #[cfg(target_os = "macos")]
    let menu = Menu::with_items(
        app,
        &[
            &show_widget,
            &hide_widget,
            &style_menu,
            &mac_menubar_item,
            &settings,
            &separator,
            &quit,
        ],
    )?;
    #[cfg(not(target_os = "macos"))]
    let menu = Menu::with_items(
        app,
        &[
            &show_widget,
            &hide_widget,
            &style_menu,
            &settings,
            &separator,
            &quit,
        ],
    )?;
    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| tauri::Error::AssetNotFound("icons/icon.png".into()))?;
    TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .tooltip(APP_NAME)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "tray_show_widget" => {
                let _ = show_widget_internal(app);
            }
            "tray_hide_widget" => {
                let _ = hide_widget_internal(app);
            }
            "tray_style_standard" => {
                let _ = set_widget_style_internal(app, "standard");
                let _ = show_widget_internal(app);
            }
            "tray_style_balanced" => {
                let _ = set_widget_style_internal(app, "balanced");
                let _ = show_widget_internal(app);
            }
            "tray_style_compact" => {
                let _ = set_widget_style_internal(app, "compact");
                let _ = show_widget_internal(app);
            }
            "tray_style_minimal" => {
                let _ = set_widget_style_internal(app, "minimal");
                let _ = show_widget_internal(app);
            }
            "tray_toggle_menubar" => {
                let next = !app
                    .state::<AppState>()
                    .mac_menu_bar_countdown
                    .lock()
                    .map(|v| *v)
                    .unwrap_or(true);
                let _ = set_mac_menu_bar_countdown_internal(app, next);
            }
            "tray_settings" => {
                let _ = show_settings_internal(app);
            }
            "tray_quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = hide_widget_internal(app);
                    } else {
                        let _ = show_widget_internal(app);
                    }
                }
            }
        })
        .build(app)?;
    Ok(())
}

#[tauri::command]
fn show_context_menu(app: AppHandle) -> Result<bool, String> {
    let window = app.get_webview_window("main").ok_or("桌面组件窗口不存在")?;
    let state = app.state::<AppState>();
    let current_style = state.widget_style.lock().map_err(|e| e.to_string())?.clone();
    let pinned = *state.always_on_top.lock().map_err(|e| e.to_string())?;

    let s_standard = CheckMenuItem::with_id(
        &app,
        "ctx_style_standard",
        STYLE_SPECS[0].menu_label,
        true,
        current_style == "standard",
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    let s_balanced = CheckMenuItem::with_id(
        &app,
        "ctx_style_balanced",
        STYLE_SPECS[1].menu_label,
        true,
        current_style == "balanced",
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    let s_compact = CheckMenuItem::with_id(
        &app,
        "ctx_style_compact",
        STYLE_SPECS[2].menu_label,
        true,
        current_style == "compact",
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    let s_minimal = CheckMenuItem::with_id(
        &app,
        "ctx_style_minimal",
        STYLE_SPECS[3].menu_label,
        true,
        current_style == "minimal",
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;

    let sep1 = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;
    let pin_item = CheckMenuItem::with_id(
        &app,
        "ctx_toggle_top",
        "始终置顶显示",
        true,
        pinned,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    let mac_menubar_enabled = *state
        .mac_menu_bar_countdown
        .lock()
        .map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    let mac_menubar_item = CheckMenuItem::with_id(
        &app,
        "ctx_toggle_menubar",
        "顶部状态栏显示倒计时",
        true,
        mac_menubar_enabled,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    let settings_item = MenuItem::with_id(
        &app,
        "ctx_settings",
        "个性化设置 / 调整大小",
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    let sep2 = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;
    let hide_item = MenuItem::with_id(
        &app,
        "ctx_hide",
        "隐藏到系统托盘",
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    let quit_item = MenuItem::with_id(&app, "ctx_quit", "退出程序", true, None::<&str>)
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    let menu = Menu::with_items(
        &app,
        &[
            &s_standard,
            &s_balanced,
            &s_compact,
            &s_minimal,
            &sep1,
            &pin_item,
            &mac_menubar_item,
            &settings_item,
            &sep2,
            &hide_item,
            &quit_item,
        ],
    )
    .map_err(|e| e.to_string())?;

    #[cfg(not(target_os = "macos"))]
    let menu = Menu::with_items(
        &app,
        &[
            &s_standard,
            &s_balanced,
            &s_compact,
            &s_minimal,
            &sep1,
            &pin_item,
            &settings_item,
            &sep2,
            &hide_item,
            &quit_item,
        ],
    )
    .map_err(|e| e.to_string())?;

    window.popup_menu(&menu).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn set_mac_menu_bar_countdown(app: AppHandle, value: bool) -> Result<bool, String> {
    set_mac_menu_bar_countdown_internal(&app, value)?;
    Ok(true)
}

#[tauri::command]
fn update_tray_title(app: AppHandle, state: State<'_, AppState>, title: String) -> Result<bool, String> {
    let enabled = *state
        .mac_menu_bar_countdown
        .lock()
        .map_err(|e| e.to_string())?;
    if enabled && !title.trim().is_empty() {
        apply_tray_title(&app, Some(title.as_str()));
    } else {
        apply_tray_title(&app, None);
    }
    Ok(true)
}

#[tauri::command]
fn set_widget_style(app: AppHandle, style: String) -> Result<Value, String> {
    set_widget_style_internal(&app, &style)
}

#[tauri::command]
fn settings_load(state: State<'_, AppState>) -> Result<Option<Value>, String> {
    if !state.config_path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&state.config_path).map_err(|e| format!("读取工资设置失败：{e}"))?;
    let value: Value =
        serde_json::from_str(&raw).map_err(|e| format!("工资设置格式错误：{e}"))?;
    if !value.is_object() {
        return Err("工资设置必须是 JSON 对象".into());
    }
    Ok(Some(value))
}

#[tauri::command]
fn settings_save(
    app: AppHandle,
    state: State<'_, AppState>,
    value: Value,
) -> Result<bool, String> {
    if !value.is_object() {
        return Err("工资设置必须是 JSON 对象".into());
    }
    let serialized = serde_json::to_vec_pretty(&value).map_err(|e| e.to_string())?;
    if serialized.len() > 300_000 {
        return Err("工资设置超过 300 KB".into());
    }
    atomic_write(&state.config_path, &serialized)?;
    let _ = app.emit("settings-updated", value);
    Ok(true)
}

#[tauri::command]
fn set_window_mode(app: AppHandle, _widget: bool) -> Result<bool, String> {
    show_widget_internal(&app)?;
    Ok(true)
}

#[tauri::command]
fn get_window_mode(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state.mode.lock().map_err(|e| e.to_string())?.clone())
}

#[tauri::command]
fn get_widget_enabled(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(*state.widget_enabled.lock().map_err(|e| e.to_string())?)
}

#[tauri::command]
fn show_widget(app: AppHandle) -> Result<bool, String> {
    show_widget_internal(&app)?;
    Ok(true)
}

#[tauri::command]
fn remove_widget(app: AppHandle) -> Result<bool, String> {
    remove_widget_internal(&app)?;
    Ok(true)
}

#[tauri::command]
fn set_widget_enabled(app: AppHandle, enabled: bool) -> Result<bool, String> {
    set_widget_enabled_internal(&app, enabled)?;
    Ok(true)
}

#[tauri::command]
fn show_full(app: AppHandle) -> Result<bool, String> {
    show_widget_internal(&app)?;
    Ok(true)
}

#[tauri::command]
fn hide_window(app: AppHandle) -> Result<bool, String> {
    hide_widget_internal(&app)?;
    Ok(true)
}

#[tauri::command]
fn get_desktop_prefs(state: State<'_, AppState>) -> Result<Value, String> {
    prefs_json(&state)
}

#[tauri::command]
fn set_widget_width(app: AppHandle, value: f64) -> Result<f64, String> {
    let state = app.state::<AppState>();
    let style_id = state.widget_style.lock().map_err(|e| e.to_string())?.clone();
    let width = valid_width_for(&style_id, value);
    state
        .widget_widths
        .lock()
        .map_err(|e| e.to_string())?
        .insert(style_id, width);
    persist_prefs(&state)?;
    let visible = state.mode.lock().map_err(|e| e.to_string())?.as_str() == "widget";
    if visible {
        if let Some(window) = app.get_webview_window("main") {
            position_widget(&app, &window)?;
        }
    }
    notify_prefs(&app);
    Ok(width)
}

#[tauri::command]
fn show_settings(app: AppHandle) -> Result<bool, String> {
    show_settings_internal(&app)?;
    Ok(true)
}

#[tauri::command]
fn close_settings(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("settings") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(true)
}

#[tauri::command]
fn set_always_on_top(app: AppHandle, value: bool) -> Result<bool, String> {
    set_always_on_top_internal(&app, value)?;
    Ok(true)
}

#[tauri::command]
fn set_login_item(app: AppHandle, value: bool) -> Result<bool, String> {
    let manager = app.autolaunch();
    if value {
        manager.enable().map_err(|e| e.to_string())?;
    } else {
        manager.disable().map_err(|e| e.to_string())?;
    }
    Ok(true)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = show_widget_internal(app);
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .on_menu_event(|app, event| match event.id().as_ref() {
            "ctx_style_standard" => {
                let _ = set_widget_style_internal(app, "standard");
            }
            "ctx_style_balanced" => {
                let _ = set_widget_style_internal(app, "balanced");
            }
            "ctx_style_compact" => {
                let _ = set_widget_style_internal(app, "compact");
            }
            "ctx_style_minimal" => {
                let _ = set_widget_style_internal(app, "minimal");
            }
            "ctx_toggle_top" => {
                let next = !app
                    .state::<AppState>()
                    .always_on_top
                    .lock()
                    .map(|p| *p)
                    .unwrap_or(false);
                let _ = set_always_on_top_internal(app, next);
            }
            "ctx_toggle_menubar" => {
                let next = !app
                    .state::<AppState>()
                    .mac_menu_bar_countdown
                    .lock()
                    .map(|v| *v)
                    .unwrap_or(true);
                let _ = set_mac_menu_bar_countdown_internal(app, next);
            }
            "ctx_settings" => {
                let _ = show_settings_internal(app);
            }
            "ctx_hide" => {
                let _ = hide_widget_internal(app);
            }
            "ctx_quit" => app.exit(0),
            _ => {}
        })
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                app.set_dock_visibility(false);
            }
            let state = initialize_state(app.handle()).map_err(std::io::Error::other)?;
            app.manage(state);
            build_tray(app.handle())?;
            if let Some(window) = app.get_webview_window("main") {
                let handle = app.handle().clone();
                window.on_window_event(move |event| match event {
                    WindowEvent::CloseRequested { api, .. } => {
                        api.prevent_close();
                        let _ = hide_widget_internal(&handle);
                    }
                    WindowEvent::Moved(_) | WindowEvent::ScaleFactorChanged { .. } => {
                        let is_widget = handle
                            .state::<AppState>()
                            .mode
                            .lock()
                            .map(|m| m.as_str() == "widget")
                            .unwrap_or(false);
                        if is_widget {
                            if let Some(w) = handle.get_webview_window("main") {
                                let _ = position_widget(&handle, &w);
                                let pinned = handle
                                    .state::<AppState>()
                                    .always_on_top
                                    .lock()
                                    .map(|p| *p)
                                    .unwrap_or(false);
                                apply_desktop_widget_behavior(&w, pinned);
                            }
                        }
                    }
                    _ => {}
                });
            }
            if let Some(window) = app.get_webview_window("settings") {
                let handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if let Some(w) = handle.get_webview_window("settings") {
                            let _ = w.hide();
                        }
                    }
                });
            }
            if let Ok(raw) = fs::read_to_string(&app.state::<AppState>().config_path) {
                if serde_json::from_str::<Value>(&raw)
                    .ok()
                    .and_then(|v| v.get("autoStart").and_then(Value::as_bool))
                    .unwrap_or(false)
                {
                    let _ = app.autolaunch().enable();
                }
            }
            show_widget_internal(app.handle()).map_err(std::io::Error::other)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            settings_load,
            settings_save,
            set_window_mode,
            get_window_mode,
            show_widget,
            remove_widget,
            set_widget_enabled,
            get_widget_enabled,
            show_full,
            hide_window,
            set_always_on_top,
            set_login_item,
            get_desktop_prefs,
            set_widget_width,
            set_widget_style,
            show_context_menu,
            set_mac_menu_bar_countdown,
            update_tray_title,
            show_settings,
            close_settings
        ])
        .run(tauri::generate_context!())
        .expect("启动下班工资计数器失败");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn config_write_replaces_existing_file_safely() {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir()
            .join(format!("salary-counter-test-{nonce}"))
            .join("config.json");
        atomic_write(&path, br#"{"monthlyNet":6500}"#).unwrap();
        atomic_write(&path, br#"{"monthlyNet":7200}"#).unwrap();
        let saved: Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        assert_eq!(saved["monthlyNet"].as_i64(), Some(7200));
        let _ = fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn widget_state_defaults_are_explicit() {
        let value = json!({"widgetEnabled": true, "widgetStyle": "standard"});
        assert_eq!(
            value.get("widgetEnabled").and_then(Value::as_bool),
            Some(true)
        );
        assert_eq!(style_spec("minimal").id, "minimal");
        assert_eq!(style_spec("unknown").id, "standard");
    }

    #[test]
    fn widget_sizes_clamped_and_fit_high_dpi_screen() {
        assert_eq!(valid_width_for("standard", 1.0), 320.0);
        assert_eq!(valid_width_for("standard", 3000.0), 1060.0);
        assert_eq!(valid_width_for("standard", f64::NAN), 520.0);
        assert_eq!(valid_width_for("minimal", 100.0), 220.0);
        assert_eq!(valid_width_for("minimal", 999.0), 560.0);
        let std_spec = style_spec("standard");
        assert_eq!(
            fit_panel_with_aspect(520.0, std_spec.aspect, 1920, 1080, 1.25, 18),
            (650, 655)
        );
        let (w, h) = fit_panel_with_aspect(1060.0, std_spec.aspect, 1280, 720, 1.5, 21);
        assert!(w <= 1238 && h <= 678);
        assert!((h as f64 - w as f64 * std_spec.aspect).abs() <= 1.0);
        let min_spec = style_spec("minimal");
        let (mw, mh) = fit_panel_with_aspect(300.0, min_spec.aspect, 1920, 1080, 1.0, 14);
        assert_eq!(mw, 300);
        assert!((mh as f64 - mw as f64 * min_spec.aspect).abs() <= 1.0);
    }
}
