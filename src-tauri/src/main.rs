// Prevents an additional console window on Windows in release builds. DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Force GTK to run through XWayland (the X11 compatibility layer)
    // instead of native Wayland. On a Wayland session, GTK's native
    // Wayland backend does not let an app control its own window
    // stacking at all - "always on top" requests are silently ignored,
    // by design (Wayland leaves that entirely up to the compositor).
    // Running through XWayland instead restores normal X11 window
    // management, including the _NET_WM_STATE_ABOVE hint that
    // setAlwaysOnTop() relies on - this is exactly why the old Fyne/GLFW
    // build's "always on top" worked and this one didn't, even on the
    // same GNOME desktop. Must be set before GTK initializes, so this
    // has to happen here in main(), before run() ever touches a window.
    #[cfg(target_os = "linux")]
    std::env::set_var("GDK_BACKEND", "x11");

    timepulse2_lib::run();
}
